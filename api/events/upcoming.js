import { getEventsConfig } from '../utils/redis.js';

/**
 * Get upcoming events for dashboard
 * Returns next 3 events sorted by date
 */
export default async function handler(req, res) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are accepted'
    });
  }

  try {
    // Get events from Redis configuration
    const config = await getEventsConfig();
    const allEvents = config.events || [];

    // Filter upcoming events (after today)
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    const upcomingEvents = allEvents
      .filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= now;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10); // Return max 10 upcoming events

    console.log(`[EVENTS] Returning ${upcomingEvents.length} upcoming events`);

    return res.status(200).json({
      success: true,
      events: upcomingEvents,
      total: upcomingEvents.length
    });

  } catch (error) {
    console.error('[EVENTS] Error fetching upcoming events:', error.message);

    return res.status(500).json({
      error: 'Server error',
      message: 'Events konnten nicht geladen werden.',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}
