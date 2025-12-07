import { createClient } from '@vercel/kv';

// Use KINNST_ prefixed environment variables
const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // This endpoint is meant to be called by Vercel Cron or external schedulers
  // It runs cleanup automatically without authentication for scheduled tasks

  // Verify cron secret if configured
  const cronSecret = process.env.RADAR_CRON_SECRET;
  if (cronSecret) {
    const providedSecret = req.headers['x-cron-secret'] || req.query.secret;
    if (providedSecret !== cronSecret) {
      return res.status(401).json({ error: 'Invalid cron secret' });
    }
  }

  try {
    console.log('[CLEANUP-CRON] Starting scheduled cleanup...');

    // Get current date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Statistics
    const stats = {
      totalEvents: 0,
      removed: 0,
      oldEvents: 0,
      duplicates: 0
    };

    // Get all event IDs from Redis
    const allEventIds = await kv.smembers('radar:events');
    stats.totalEvents = allEventIds.length;

    // Track events by title-date for duplicate detection
    const eventMap = new Map();
    const eventsToRemove = [];

    // Process each event
    for (const eventId of allEventIds) {
      try {
        const eventData = await kv.hgetall(`radar:event:${eventId}`);

        if (!eventData || !eventData.date) {
          eventsToRemove.push({ id: eventId, reason: 'no_data' });
          continue;
        }

        // Check if event is old (past events)
        const eventDate = new Date(eventData.date);
        if (eventDate < today) {
          eventsToRemove.push({
            id: eventId,
            reason: 'old_event',
            title: eventData.title,
            date: eventData.date
          });
          stats.oldEvents++;
          continue;
        }

        // Create unique key for duplicate detection
        const uniqueKey = `${(eventData.title || '').toLowerCase().trim()}-${eventData.date}`;

        // Check for duplicates
        if (eventMap.has(uniqueKey)) {
          const existing = eventMap.get(uniqueKey);

          // Calculate data completeness score
          const existingScore = calculateDataScore(existing);
          const currentScore = calculateDataScore(eventData);

          if (currentScore > existingScore) {
            // Replace existing with current
            eventsToRemove.push({
              id: existing.id,
              reason: 'duplicate',
              title: existing.title
            });
            eventMap.set(uniqueKey, { ...eventData, id: eventId });
            stats.duplicates++;
          } else {
            // Keep existing, remove current
            eventsToRemove.push({
              id: eventId,
              reason: 'duplicate',
              title: eventData.title
            });
            stats.duplicates++;
          }
        } else {
          // First occurrence of this event
          eventMap.set(uniqueKey, { ...eventData, id: eventId });
        }

      } catch (error) {
        console.error(`[CLEANUP-CRON] Error processing event ${eventId}:`, error);
      }
    }

    // Perform actual cleanup
    if (eventsToRemove.length > 0) {
      console.log(`[CLEANUP-CRON] Removing ${eventsToRemove.length} events...`);

      for (const event of eventsToRemove) {
        try {
          // Remove from Redis sets
          await kv.srem('radar:events', event.id);

          if (event.date) {
            await kv.srem(`radar:events:by-date:${event.date}`, event.id);
          }

          // Delete the event hash
          await kv.del(`radar:event:${event.id}`);
        } catch (error) {
          console.error(`[CLEANUP-CRON] Failed to remove event ${event.id}:`, error);
        }
      }

      stats.removed = eventsToRemove.length;
    }

    // Update cleanup metrics
    await kv.hset('radar:metrics:cleanup', {
      lastRun: new Date().toISOString(),
      eventsRemoved: stats.removed,
      totalEvents: stats.totalEvents - stats.removed,
      oldEventsRemoved: stats.oldEvents,
      duplicatesRemoved: stats.duplicates
    });

    console.log(`[CLEANUP-CRON] Cleanup complete:
      - Total events: ${stats.totalEvents}
      - Removed: ${stats.removed}
      - Old events: ${stats.oldEvents}
      - Duplicates: ${stats.duplicates}
      - Remaining: ${stats.totalEvents - stats.removed}`);

    return res.status(200).json({
      success: true,
      message: 'Scheduled cleanup completed',
      stats: {
        totalEvents: stats.totalEvents,
        removed: stats.removed,
        oldEvents: stats.oldEvents,
        duplicates: stats.duplicates,
        remaining: stats.totalEvents - stats.removed
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CLEANUP-CRON] Fatal error:', error);
    return res.status(500).json({
      error: 'Scheduled cleanup failed',
      message: error.message
    });
  }
}

// Calculate data completeness score
function calculateDataScore(event) {
  let score = 0;
  if (event.title) score += 3;
  if (event.date) score += 3;
  if (event.time) score += 2;
  if (event.location) score += 2;
  if (event.description) score += 1;
  if (event.category) score += 1;
  if (event.detailUrl) score += 1;
  return score;
}