import { getEventsConfig } from './utils/redis.js';

/**
 * Public API for KINN Events
 * GET /api/events - Returns list of upcoming events
 *
 * No authentication required (public endpoint for landing page)
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://kinn.at',
  'https://www.kinn.at',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:8000', 'http://localhost:3000'] : [])
];

/**
 * Get CORS headers for request origin
 */
function getCorsHeaders(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true'
    };
  }
  return {};
}

export default async function handler(req, res) {
  // Set CORS headers based on origin
  const origin = req.headers.origin;
  const corsHeaders = getCorsHeaders(origin);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are accepted'
    });
  }

  try {
    // Get events from Redis
    const config = await getEventsConfig();
    const events = config.events || [];

    // Filter to only upcoming events (optional)
    const now = new Date();
    const upcomingEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= now;
    });

    console.log('[EVENTS API] Returned', upcomingEvents.length, 'upcoming events');

    return res.status(200).json({
      success: true,
      data: {
        events: upcomingEvents,
        count: upcomingEvents.length
      }
    });

  } catch (error) {
    console.error('[EVENTS API] Error fetching events:', error.message);
    return res.status(500).json({
      error: 'Server error',
      message: 'Failed to load events',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
