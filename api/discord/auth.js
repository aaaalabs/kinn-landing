/**
 * Discord OAuth2 - Authorization Start
 * Initiates the OAuth2 flow by redirecting to Discord's authorization page
 * Validates that request is from an active event (same-day verification)
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

  // Verify Discord configuration
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_REDIRECT_URI) {
    console.error('Discord OAuth Error: Missing configuration', {
      hasClientId: !!process.env.DISCORD_CLIENT_ID,
      hasRedirectUri: !!process.env.DISCORD_REDIRECT_URI
    });
    return res.status(500).json({
      error: 'Discord nicht konfiguriert',
      details: 'DISCORD_CLIENT_ID oder DISCORD_REDIRECT_URI fehlt'
    });
  }

  // Event validation - QR codes only work on event day
  const { event: eventId } = req.query;

  if (!eventId) {
    console.error('Discord OAuth: Missing event ID');
    return res.redirect(302, '/pages/discord-error.html?reason=missing_event');
  }

  try {
    // Fetch event from Redis
    const eventsConfig = await getEventsConfig();

    if (!eventsConfig || !eventsConfig.events) {
      console.error('Discord OAuth: No events in Redis');
      return res.redirect(302, '/pages/discord-error.html?reason=event_not_found');
    }

    const event = eventsConfig.events.find(e => e.id === eventId);

    if (!event) {
      console.error('Discord OAuth: Event not found:', eventId);
      return res.redirect(302, '/pages/discord-error.html?reason=event_not_found');
    }

    // Validation: Allow future events, block only if grace period expired
    const eventEnd = new Date(event.end);
    const now = new Date();
    const gracePeriodMs = 4 * 60 * 60 * 1000; // 4 hours after event end

    // Only block if event ended more than 4h ago
    if (now > new Date(eventEnd.getTime() + gracePeriodMs)) {
      console.log('Discord OAuth: Event grace period expired:', {
        eventEnd: eventEnd.toISOString(),
        now: now.toISOString(),
        eventId
      });
      return res.redirect(302, '/pages/discord-error.html?reason=event_invalid');
    }

    // Allow: future events, current events, recent past events (< 4h)
    console.log('Discord OAuth: Event validated:', {
      eventId,
      title: event.title,
      eventEnd: eventEnd.toISOString(),
      gracePeriodEnd: new Date(eventEnd.getTime() + gracePeriodMs).toISOString()
    });

    // Generate CSRF protection state with event ID
    const state = Buffer.from(JSON.stringify({
      ts: Date.now(),
      nonce: Math.random().toString(36).substring(7),
      event: eventId  // Store for callback validation
    })).toString('base64');

    // Build Discord OAuth2 authorization URL
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds.join',
      state: state,
    });

    const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

    console.log('Discord OAuth: Redirecting to authorization page', {
      clientId: process.env.DISCORD_CLIENT_ID,
      redirectUri: process.env.DISCORD_REDIRECT_URI
    });

    // Redirect to Discord
    return res.redirect(302, authUrl);

  } catch (error) {
    console.error('Discord OAuth Error:', error);
    return res.status(500).json({
      error: 'Fehler beim Starten der Discord-Autorisierung',
      message: error.message
    });
  }
}
