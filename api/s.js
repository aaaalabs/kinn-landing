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
import { getEventsConfig } from './utils/redis.js';

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

  const eventId = validation.eventId;

  try {
    // Verify event exists in Redis
    const eventsConfig = await getEventsConfig();

    if (!eventsConfig || !eventsConfig.events) {
      console.error('Short link: No events in Redis');
      return res.redirect(302, '/pages/discord-error.html?reason=event_not_found');
    }

    const event = eventsConfig.events.find(e => e.id === eventId);

    if (!event) {
      console.error('Short link: Event not found in Redis', { eventId, shortId });
      return res.redirect(302, '/pages/discord-error.html?reason=event_not_found');
    }

    console.log('Short link: Decoded successfully', {
      shortId,
      eventId,
      eventTitle: event.title
    });

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
