import { getOAuthTokens, storeOAuthTokens, getAllOAuthUsers } from './redis.js';
import { decryptTokens, encryptTokens } from './encryption.js';

/**
 * Refreshes an expired access token using refresh token
 * @param {string} refreshToken - OAuth refresh token
 * @returns {Promise<Object>} New token data
 */
async function refreshAccessToken(refreshToken) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
      access_token: data.access_token,
      expiry_date: Date.now() + (data.expires_in * 1000),
      token_type: data.token_type,
    };
  } catch (error) {
    console.error('[CALENDAR] Token refresh error:', error.message);
    throw error;
  }
}

/**
 * Gets valid access token for a user (refreshes if expired)
 * @param {string} email - User email
 * @returns {Promise<Object>} { access_token, tokens } or null if no tokens stored
 */
export async function getValidAccessToken(email) {
  const encryptedTokens = await getOAuthTokens(email);

  if (!encryptedTokens) {
    console.log('[CALENDAR] No OAuth tokens for:', email);
    return null;
  }

  let tokens = decryptTokens(encryptedTokens);

  // Check if token expired (with 5min buffer)
  const isExpired = Date.now() >= (tokens.expiry_date - 5 * 60 * 1000);

  if (isExpired) {
    console.log('[CALENDAR] Access token expired, refreshing...');

    if (!tokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    // Refresh the token
    const newTokenData = await refreshAccessToken(tokens.refresh_token);

    // Merge with existing tokens (keep refresh_token)
    tokens = {
      ...tokens,
      access_token: newTokenData.access_token,
      expiry_date: newTokenData.expiry_date,
      token_type: newTokenData.token_type,
    };

    // Re-encrypt and store
    const newEncryptedTokens = encryptTokens(tokens);
    await storeOAuthTokens(email, newEncryptedTokens);

    console.log('[CALENDAR] Token refreshed for:', email.split('@')[1]);
  }

  return {
    access_token: tokens.access_token,
    tokens,
  };
}

/**
 * Creates a calendar event for a single user
 * @param {string} email - User email
 * @param {Object} eventData - Event details
 * @param {string} eventData.summary - Event title
 * @param {string} eventData.description - Event description
 * @param {string} eventData.location - Event location
 * @param {string} eventData.start - Start datetime (ISO 8601)
 * @param {string} eventData.end - End datetime (ISO 8601)
 * @returns {Promise<Object>} Created event data
 */
export async function createCalendarEvent(email, eventData) {
  const tokenData = await getValidAccessToken(email);

  if (!tokenData) {
    throw new Error(`No OAuth tokens for ${email}`);
  }

  const { summary, description, location, start, end } = eventData;

  // Build Google Calendar event
  const event = {
    summary,
    description,
    location,
    start: {
      dateTime: start,
      timeZone: 'Europe/Vienna',
    },
    end: {
      dateTime: end,
      timeZone: 'Europe/Vienna',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 30 },      // 30 min before
      ],
    },
  };

  // Call Google Calendar API
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Calendar API error: ${error.error?.message || 'Unknown error'}`);
  }

  const createdEvent = await response.json();

  console.log('[CALENDAR] Event created for:', email.split('@')[1], '- ID:', createdEvent.id);

  return createdEvent;
}

/**
 * Creates calendar events for all users with OAuth tokens
 * @param {Object} eventData - Event details
 * @returns {Promise<Object>} { success: number, failed: number, results: Array }
 */
export async function createBulkCalendarEvents(eventData) {
  const users = await getAllOAuthUsers();

  if (users.length === 0) {
    return {
      success: 0,
      failed: 0,
      total: 0,
      results: [],
      message: 'No users with OAuth tokens found',
    };
  }

  console.log(`[CALENDAR] Creating events for ${users.length} users...`);

  const results = [];
  let successCount = 0;
  let failedCount = 0;

  // Process in parallel (but with rate limiting consideration)
  const promises = users.map(async (email) => {
    try {
      const event = await createCalendarEvent(email, eventData);
      successCount++;
      return {
        email,
        success: true,
        eventId: event.id,
        htmlLink: event.htmlLink,
      };
    } catch (error) {
      failedCount++;
      console.error(`[CALENDAR] Failed for ${email}:`, error.message);
      return {
        email,
        success: false,
        error: error.message,
      };
    }
  });

  const settled = await Promise.allSettled(promises);

  settled.forEach((result) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      failedCount++;
      results.push({
        email: 'unknown',
        success: false,
        error: result.reason?.message || 'Unknown error',
      });
    }
  });

  console.log(`[CALENDAR] Bulk creation complete: ${successCount} success, ${failedCount} failed`);

  return {
    success: successCount,
    failed: failedCount,
    total: users.length,
    results,
  };
}
