import { createClient } from '@vercel/kv';
import logger from '../../lib/logger.js';

// Use KINNST_ prefixed environment variables
const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

// Calculate data completeness score for duplicate detection
function calculateEventScore(event) {
  let score = 0;

  // Core fields (higher weight)
  if (event.title) score += 3;
  if (event.date) score += 3;
  if (event.time && event.time !== '18:00') score += 2; // Default time doesn't count
  if (event.location) score += 2;
  if (event.detailUrl || event.url) score += 2;

  // Additional fields (lower weight)
  if (event.city && event.city !== 'Innsbruck') score += 1; // Default city doesn't count
  if (event.category) score += 1;
  if (event.source) score += 1;
  if (event.registrationUrl) score += 1;
  if (event.description) {
    score += 1;
    // Bonus for longer descriptions
    if (event.description.length > 100) score += 1;
    if (event.description.length > 200) score += 1;
  }

  return score;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check admin auth
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.RADAR_ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    logger.debug('[CLEANUP-REDIS] Starting duplicate removal from Redis...');

    // Get all event IDs from Redis
    const allEventIds = await kv.smembers('radar:events');
    logger.debug(`[CLEANUP-REDIS] Found ${allEventIds.length} total event IDs`);

    // Map for duplicate detection (title + date)
    const uniqueEventsMap = new Map();
    const duplicatesToRemove = [];
    const stats = {
      total: allEventIds.length,
      duplicatesFound: 0,
      removed: 0,
      kept: 0
    };

    // First pass: identify duplicates and keep the best version
    for (const eventId of allEventIds) {
      try {
        const eventData = await kv.hgetall(`radar:event:${eventId}`);

        if (!eventData || !eventData.date || !eventData.title) {
          logger.debug(`[CLEANUP-REDIS] Invalid event ${eventId} - missing required fields`);
          duplicatesToRemove.push(eventId);
          continue;
        }

        // Create unique key for duplicate detection
        const uniqueKey = `${(eventData.title || '').toLowerCase().trim()}_${eventData.date}`;

        // Check for duplicates
        if (uniqueEventsMap.has(uniqueKey)) {
          stats.duplicatesFound++;

          // Get existing event
          const existingEntry = uniqueEventsMap.get(uniqueKey);

          // Calculate data completeness score
          const existingScore = calculateEventScore(existingEntry.data);
          const currentScore = calculateEventScore(eventData);

          logger.debug(`[CLEANUP-REDIS] Duplicate: "${eventData.title}" on ${eventData.date}`);
          logger.debug(`  Existing (${existingEntry.id}): score ${existingScore}`);
          logger.debug(`  Current (${eventId}): score ${currentScore}`);

          // Keep the one with more data
          if (currentScore > existingScore) {
            // Remove the existing one, keep the current one
            duplicatesToRemove.push(existingEntry.id);
            uniqueEventsMap.set(uniqueKey, { id: eventId, data: eventData });
            logger.debug(`  → Keeping ${eventId} (better data)`);
          } else {
            // Remove the current one, keep the existing one
            duplicatesToRemove.push(eventId);
            logger.debug(`  → Keeping ${existingEntry.id} (existing better)`);
          }
        } else {
          // First occurrence
          uniqueEventsMap.set(uniqueKey, { id: eventId, data: eventData });
        }

      } catch (error) {
        logger.error(`[CLEANUP-REDIS] Error processing event ${eventId}:`, error);
      }
    }

    // Second pass: remove duplicates from Redis
    logger.debug(`[CLEANUP-REDIS] Removing ${duplicatesToRemove.length} duplicate events...`);

    for (const eventId of duplicatesToRemove) {
      try {
        // Remove from events set
        await kv.srem('radar:events', eventId);

        // Delete the event data
        await kv.del(`radar:event:${eventId}`);

        stats.removed++;
        logger.debug(`[CLEANUP-REDIS] Removed duplicate: ${eventId}`);
      } catch (error) {
        logger.error(`[CLEANUP-REDIS] Failed to remove ${eventId}:`, error);
      }
    }

    stats.kept = uniqueEventsMap.size;

    // Log final statistics
    logger.debug('[CLEANUP-REDIS] Cleanup complete!');
    logger.debug(`  Total events: ${stats.total}`);
    logger.debug(`  Duplicates found: ${stats.duplicatesFound}`);
    logger.debug(`  Events removed: ${stats.removed}`);
    logger.debug(`  Unique events kept: ${stats.kept}`);

    return res.status(200).json({
      success: true,
      message: 'Redis duplicates cleaned',
      stats: stats,
      removedIds: duplicatesToRemove
    });

  } catch (error) {
    logger.error('[CLEANUP-REDIS] Fatal error:', error);
    return res.status(500).json({
      error: 'Cleanup failed',
      message: error.message
    });
  }
}