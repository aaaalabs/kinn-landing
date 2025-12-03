/**
 * Short Link Redirect Handler
 *
 * Handles short QR code links: /api/s?id=abc123
 * Decodes short ID → event ID → redirects to Discord OAuth
 *
 * Security:
 * - Validates short ID decodes correctly
 * - Validates event exists in Redis
 * - Only then redirects to Discord OAuth
 */

import { decodeShortId, validateShortId } from './utils/shortlink.js';
import { getEventsConfig, redis } from './utils/redis.js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: shortId } = req.query;

  // Missing short ID
  if (!shortId) {
    console.error('Short link: Missing ID parameter');
    return res.redirect(302, '/pages/discord-error.html?reason=missing_event');
  }

  // Validate and decode short ID
  const validation = validateShortId(shortId);

  if (!validation.valid) {
    console.error('Short link: Invalid ID', { shortId, error: validation.error });
    return res.redirect(302, '/pages/discord-error.html?reason=event_not_found');
  }

  let eventId = validation.eventId; // Use 'let' to allow reassignment for legacy events
  console.log('[Short Link] Decoded successfully:', { shortId, eventId });

  try {
    // Verify event exists in Redis
    const eventsConfig = await getEventsConfig();

    if (!eventsConfig || !eventsConfig.events) {
      console.error('Short link: No events in Redis');
      return res.redirect(302, '/pages/discord-error.html?reason=event_not_found');
    }

    // Log all events for debugging
    console.log('[Short Link] Available events:', {
      count: eventsConfig.events.length,
      eventIds: eventsConfig.events.map(e => e.id)
    });

    // Try to find event by exact ID match first
    let event = eventsConfig.events.find(e => e.id === eventId);
    console.log('[Short Link] Exact ID match:', { eventId, found: !!event });

    // If not found, try to find by date (for legacy events)
    if (!event) {
      console.log('[Short Link] Trying date match for legacy event...');

      // Extract timestamp from decoded event ID
      const timestampMatch = eventId.match(/-(\d+)$/);
      if (timestampMatch) {
        const timestamp = parseInt(timestampMatch[1], 10);
        const date = new Date(timestamp * 1000);
        const dateUTC = date.toISOString().split('T')[0]; // YYYY-MM-DD (UTC)

        // Also try local date (might differ due to timezone)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateLocal = `${year}-${month}-${day}`; // YYYY-MM-DD (Local)

        console.log('[Short Link] Timestamp conversion:', {
          timestamp,
          dateUTC,
          dateLocal,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });

        // Try both UTC and local date formats
        const legacyIdUTC = `kinn-${dateUTC}`;
        const legacyIdLocal = `kinn-${dateLocal}`;

        event = eventsConfig.events.find(e => e.id === legacyIdUTC || e.id === legacyIdLocal);

        if (event) {
          console.log('[Short Link] Found legacy event by date:', {
            shortId,
            decodedId: eventId,
            actualId: event.id,
            eventTitle: event.title
          });
          // Use the actual event ID for redirect
          eventId = event.id;
        } else {
          console.log('[Short Link] No match found for:', { legacyIdUTC, legacyIdLocal });
        }
      }
    }

    if (!event) {
      console.error('Short link: Event not found in Redis', { eventId, shortId });
      return res.redirect(302, '/pages/discord-error.html?reason=event_not_found');
    }

    console.log('Short link: Decoded successfully', {
      shortId,
      eventId,
      eventTitle: event.title
    });

    // Track unique scan (IP-based)
    const userIp = req.headers['x-forwarded-for']?.split(',')[0] || req.headers['x-real-ip'] || 'unknown';
    await redis.sadd(`scan:${eventId}:unique`, userIp);

    // Redirect to Discord OAuth with full event ID
    const redirectUrl = `/api/discord/auth?event=${eventId}`;
    return res.redirect(302, redirectUrl);

  } catch (error) {
    console.error('Short link: Server error', {
      shortId,
      eventId,
      error: error.message
    });

    return res.redirect(302, '/pages/discord-error.html?reason=auth_failed');
  }
}
