import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN
});

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    // Get all radar event IDs
    const eventIds = await kv.smembers('radar:events');
    const now = new Date();
    const events = [];

    // DEBUG: Log basic info
    console.log(`[WIDGET DEBUG] Found ${eventIds.length} total event IDs in radar:events`);
    console.log(`[WIDGET DEBUG] Current date/time: ${now.toISOString()}`);

    // Fetch events and filter approved + future
    for (const id of eventIds) {
      const event = await kv.hgetall(`radar:event:${id}`);

      // DEBUG: Log each event's details
      console.log(`[WIDGET DEBUG] Event ${id}:`, {
        title: event?.title || 'NO TITLE',
        date: event?.date || 'NO DATE',
        approved: event?.approved || 'NO APPROVED FLAG',
        rejected: event?.rejected || 'NO REJECTED FLAG',
        hasEvent: !!event
      });

      // Filter: approved and future events only
      if (event && event.approved === 'true' && new Date(event.date) >= now) {
        console.log(`[WIDGET DEBUG] ✓ Event ${id} passed filters (approved & future)`);
        events.push(event);
      } else {
        // DEBUG: Why was it filtered out?
        if (!event) {
          console.log(`[WIDGET DEBUG] ✗ Event ${id} filtered: No event data found`);
        } else if (event.approved !== 'true') {
          console.log(`[WIDGET DEBUG] ✗ Event ${id} filtered: Not approved (approved=${event.approved})`);
        } else if (new Date(event.date) < now) {
          console.log(`[WIDGET DEBUG] ✗ Event ${id} filtered: Past event (${event.date} < ${now.toISOString().split('T')[0]})`);
        }
      }
    }

    // Sort by date proximity (closest first)
    events.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '18:00'}`);
      const dateB = new Date(`${b.date}T${b.time || '18:00'}`);
      return dateA - dateB;
    });

    // DEBUG: Log final count
    console.log(`[WIDGET DEBUG] Total approved future events: ${events.length}`);

    // Only show widget if 2+ events exist
    if (page === 1 && events.length < 2) {
      console.log(`[WIDGET DEBUG] Not showing widget - only ${events.length} events (minimum: 2)`);
      return res.status(200).json({
        events: [],
        showWidget: false,
        message: 'Not enough events to display widget',
        debug: {
          totalEventIds: eventIds.length,
          approvedFutureEvents: events.length,
          minimumRequired: 2
        }
      });
    }

    // Paginate results
    const paginatedEvents = events.slice(offset, offset + limit);

    console.log(`[WIDGET] Returning ${paginatedEvents.length} events (page ${page}, total approved: ${events.length})`);
    console.log(`[WIDGET DEBUG] First 3 events being returned:`, paginatedEvents.slice(0, 3).map(e => ({
      title: e.title,
      date: e.date,
      approved: e.approved
    })));

    return res.status(200).json({
      events: paginatedEvents,
      showWidget: true,
      hasMore: offset + limit < events.length,
      total: events.length,
      page: page
    });

  } catch (error) {
    console.error('[WIDGET] Error loading events:', error);
    return res.status(500).json({
      error: 'Failed to load events',
      message: 'Events konnten nicht geladen werden'
    });
  }
}