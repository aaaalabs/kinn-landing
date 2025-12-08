import { Redis } from '@upstash/redis';
import logger from '../../lib/logger.js';

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

    // Log basic info
    logger.debug(`Found ${eventIds.length} total event IDs in radar:events`);
    logger.debug(`Current date/time: ${now.toISOString()}`);

    // Fetch events and filter approved + future
    for (const id of eventIds) {
      const event = await kv.hgetall(`radar:event:${id}`);

      // Log event details in development
      logger.debug(`Event ${id}:`, {
        title: event?.title || 'NO TITLE',
        date: event?.date || 'NO DATE',
        reviewed: event?.reviewed,
        reviewedType: typeof event?.reviewed,
        rejected: event?.rejected,
        rejectedType: typeof event?.rejected,
        hasEvent: !!event
      });

      // Filter: reviewed (approved) and future events only, excluding rejected ones
      // Note: Redis hgetall returns strings, so we check for both "true" string and true boolean
      const isReviewed = event && (event.reviewed === true || event.reviewed === 'true');
      const isNotRejected = !event?.rejected || event.rejected !== 'true';
      const eventDate = event ? new Date(event.date) : null;
      const isFuture = eventDate && eventDate >= now;

      if (event && isReviewed && isNotRejected && isFuture) {
        logger.debug(`✓ Event ${id} passed filters (reviewed & future & not rejected)`);
        events.push(event);
      } else {
        // Log why event was filtered out in development
        if (!event) {
          logger.debug(`✗ Event ${id} filtered: No event data found`);
        } else if (!isReviewed) {
          logger.debug(`✗ Event ${id} filtered: Not reviewed (reviewed=${event.reviewed}, type=${typeof event.reviewed})`);
        } else if (!isNotRejected) {
          logger.debug(`✗ Event ${id} filtered: Rejected (rejected=${event.rejected})`);
        } else if (!isFuture) {
          const dateStr = event.date || 'NO DATE';
          const nowStr = now.toISOString().split('T')[0];
          logger.debug(`✗ Event ${id} filtered: Past event (${dateStr} < ${nowStr})`);
        }
      }
    }

    // Sort by date proximity (closest first)
    events.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '18:00'}`);
      const dateB = new Date(`${b.date}T${b.time || '18:00'}`);
      return dateA - dateB;
    });

    // Log final count
    logger.info(`Total approved future events: ${events.length}`);

    // Only show widget if 2+ events exist
    if (page === 1 && events.length < 2) {
      logger.info(`Not showing widget - only ${events.length} events (minimum: 2)`);
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

    logger.info(`Returning ${paginatedEvents.length} events (page ${page}, total approved: ${events.length})`);
    logger.debug(`First 3 events being returned:`, paginatedEvents.slice(0, 3).map(e => ({
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
    logger.error('Error loading events:', error);
    return res.status(500).json({
      error: 'Failed to load events',
      message: 'Events konnten nicht geladen werden'
    });
  }
}