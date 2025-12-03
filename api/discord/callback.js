/**
 * Discord OAuth2 - Authorization Callback
 * Handles the OAuth2 callback, assigns KINN'der role, and redirects to success/error page
 * Re-validates event to ensure it's still active (OAuth flow can take time)
 */

import { getEventsConfig } from '../utils/redis.js';

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://kinn.at',
    'https://www.kinn.at',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:8000', 'http://localhost:3000'] : [])
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error, state } = req.query;

  // User cancelled authorization
  if (error) {
    console.log('Discord OAuth: User cancelled authorization', { error });
    return res.redirect(302, '/pages/discord-error.html?reason=cancelled');
  }

  // Missing authorization code
  if (!code) {
    console.error('Discord OAuth Error: Missing authorization code');
    return res.redirect(302, '/pages/discord-error.html?reason=missing_code');
  }

  // Decode and validate state (contains event ID)
  let stateData;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString());
  } catch (e) {
    console.error('Discord OAuth: Invalid state:', e);
    return res.redirect(302, '/pages/discord-error.html?reason=auth_failed');
  }

  // Re-validate event (OAuth flow can take time, event might have expired)
  if (stateData.event) {
    try {
      const eventsConfig = await getEventsConfig();
      const event = eventsConfig?.events?.find(e => e.id === stateData.event);

      if (!event) {
        console.error('Discord OAuth: Event disappeared:', stateData.event);
        return res.redirect(302, '/pages/discord-error.html?reason=event_not_found');
      }

      // Same validation as auth endpoint
      const eventDate = new Date(event.date).toDateString();
      const today = new Date().toDateString();
      const eventEnd = new Date(event.end);
      const now = new Date();
      const gracePeriodMs = 4 * 60 * 60 * 1000; // 4 hours

      if (eventDate !== today || now > new Date(eventEnd.getTime() + gracePeriodMs)) {
        console.log('Discord OAuth: Event expired during OAuth flow:', { eventDate, today, eventEnd, now });
        return res.redirect(302, '/pages/discord-error.html?reason=event_invalid');
      }

      console.log('Discord OAuth: Event re-validated in callback:', { eventId: stateData.event });
    } catch (validationError) {
      console.error('Discord OAuth: Event validation error:', validationError);
      return res.redirect(302, '/pages/discord-error.html?reason=auth_failed');
    }
  }

  try {
    // Step 1: Exchange authorization code for access token
    console.log('Discord OAuth: Exchanging code for access token');

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Discord Token Error:', errorData);
      throw new Error(`Token request failed: ${errorData.error || tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Discord Token Error: No access token in response', tokenData);
      throw new Error('Kein Access Token erhalten');
    }

    console.log('Discord OAuth: Access token received');

    // Step 2: Fetch user information
    console.log('Discord OAuth: Fetching user info');

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.error('Discord User Info Error:', errorData);
      throw new Error(`User info request failed: ${errorData.message || userResponse.statusText}`);
    }

    const userData = await userResponse.json();

    if (!userData.id) {
      console.error('Discord User Error: No user ID in response', userData);
      throw new Error('Keine User-Daten erhalten');
    }

    console.log('Discord OAuth: User info received', {
      userId: userData.id,
      username: userData.username,
      globalName: userData.global_name
    });

    const roleId = process.env.DISCORD_KINNDER_ROLE_ID;

    // Step 3: Add user to guild (with role if new member)
    console.log('Discord OAuth: Adding user to guild', {
      guildId: process.env.DISCORD_GUILD_ID,
      userId: userData.id,
      roleId: roleId
    });

    const addMemberResponse = await fetch(
      `https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userData.id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: tokenData.access_token,
          roles: roleId ? [roleId] : [],
        }),
      }
    );

    const statusCode = addMemberResponse.status;
    console.log('Discord OAuth: Add member response status:', statusCode);

    // Step 4: If user already exists (204), add role separately
    if (statusCode === 204 && roleId) {
      console.log('Discord OAuth: User already in guild, adding role separately');

      const addRoleResponse = await fetch(
        `https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userData.id}/roles/${roleId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          },
        }
      );

      if (!addRoleResponse.ok) {
        const roleError = await addRoleResponse.json();
        console.error('Discord Role Assignment Error:', roleError);
        // Don't fail the entire flow - user might already have the role
      } else {
        console.log('Discord OAuth: Role assigned successfully');
      }
    } else if (statusCode === 201) {
      console.log('Discord OAuth: New member added with role');
    } else if (!addMemberResponse.ok) {
      const memberError = await addMemberResponse.json();
      console.error('Discord Add Member Error:', memberError);
      throw new Error(`Failed to add member: ${memberError.message || addMemberResponse.statusText}`);
    }

    // Success! Redirect to success page
    const username = userData.global_name || userData.username || 'du';
    const successUrl = `/pages/discord-success.html?user=${encodeURIComponent(username)}`;

    console.log('Discord OAuth: Success - redirecting to success page', {
      username,
      userId: userData.id
    });

    return res.redirect(302, successUrl);

  } catch (error) {
    console.error('Discord OAuth Error:', {
      message: error.message,
      stack: error.stack
    });

    return res.redirect(302, '/pages/discord-error.html?reason=auth_failed');
  }
}
