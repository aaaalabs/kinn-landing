import { createClient } from '@vercel/kv';
import { google } from 'googleapis';
import logger from '../../lib/logger.js';

// Use KINNST_ prefixed environment variables
const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

// Initialize Google Sheets client
async function getSheetsClient() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    logger.error('[CLEANUP] Failed to initialize Google Sheets client:', error);
    return null;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
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
    const { dryRun = false } = req.method === 'GET' ? req.query : req.body;

    logger.debug(`[CLEANUP] Starting cleanup routine (dryRun: ${dryRun})`);

    // Get current date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Statistics
    const stats = {
      totalEvents: 0,
      oldEvents: [],
      duplicates: [],
      removed: 0,
      kept: 0
    };

    // Get all event IDs from Redis
    const allEventIds = await kv.smembers('radar:events');
    stats.totalEvents = allEventIds.length;

    logger.debug(`[CLEANUP] Found ${allEventIds.length} total events`);

    // Map to track events by title-date (for duplicate detection)
    const eventMap = new Map();
    const eventsToKeep = [];
    const eventsToRemove = [];

    // Process each event
    for (const eventId of allEventIds) {
      try {
        const eventData = await kv.hgetall(`radar:event:${eventId}`);

        if (!eventData || !eventData.date) {
          logger.debug(`[CLEANUP] Event ${eventId} has no data or date, marking for removal`);
          eventsToRemove.push({ id: eventId, reason: 'no_data' });
          continue;
        }

        // Check if event is old (past events)
        const eventDate = new Date(eventData.date);
        if (eventDate < today) {
          logger.debug(`[CLEANUP] Event "${eventData.title}" on ${eventData.date} is past, marking for removal`);
          eventsToRemove.push({
            id: eventId,
            title: eventData.title,
            date: eventData.date,
            reason: 'old_event'
          });
          stats.oldEvents.push(`${eventData.title} (${eventData.date})`);
          continue;
        }

        // Create unique key for duplicate detection (title + date)
        const uniqueKey = `${(eventData.title || '').toLowerCase().trim()}-${eventData.date}`;

        // Check for duplicates
        if (eventMap.has(uniqueKey)) {
          const existing = eventMap.get(uniqueKey);
          logger.debug(`[CLEANUP] Duplicate found: "${eventData.title}" on ${eventData.date}`);

          // Keep the one with more data or newer creation date
          const existingCreatedAt = new Date(existing.createdAt || 0);
          const currentCreatedAt = new Date(eventData.createdAt || 0);

          // Calculate data completeness score
          const existingScore = calculateDataScore(existing);
          const currentScore = calculateDataScore(eventData);

          if (currentScore > existingScore ||
              (currentScore === existingScore && currentCreatedAt > existingCreatedAt)) {
            // Replace existing with current
            eventsToRemove.push({
              id: existing.id,
              title: existing.title,
              date: existing.date,
              reason: 'duplicate_lower_quality'
            });
            eventMap.set(uniqueKey, eventData);
            stats.duplicates.push(`${existing.title} (${existing.date}) - removed older/incomplete`);
          } else {
            // Keep existing, remove current
            eventsToRemove.push({
              id: eventId,
              title: eventData.title,
              date: eventData.date,
              reason: 'duplicate_lower_quality'
            });
            stats.duplicates.push(`${eventData.title} (${eventData.date}) - kept better version`);
          }
        } else {
          // First occurrence of this event
          eventMap.set(uniqueKey, { ...eventData, id: eventId });
          eventsToKeep.push(eventData);
        }

      } catch (error) {
        logger.error(`[CLEANUP] Error processing event ${eventId}:`, error);
      }
    }

    stats.kept = eventsToKeep.length;
    stats.removed = eventsToRemove.length;

    logger.debug(`[CLEANUP] Analysis complete:`);
    logger.debug(`- Total events: ${stats.totalEvents}`);
    logger.debug(`- Old events: ${stats.oldEvents.length}`);
    logger.debug(`- Duplicates: ${stats.duplicates.length}`);
    logger.debug(`- To keep: ${stats.kept}`);
    logger.debug(`- To remove: ${stats.removed}`);

    // If not dry run, perform actual cleanup
    if (!dryRun && eventsToRemove.length > 0) {
      logger.debug('[CLEANUP] Performing actual cleanup...');

      for (const event of eventsToRemove) {
        try {
          // Remove from Redis sets
          await kv.srem('radar:events', event.id);

          if (event.date) {
            await kv.srem(`radar:events:by-date:${event.date}`, event.id);
          }

          // Delete the event hash
          await kv.del(`radar:event:${event.id}`);

          logger.debug(`[CLEANUP] Removed event: ${event.id} (${event.reason})`);
        } catch (error) {
          logger.error(`[CLEANUP] Failed to remove event ${event.id}:`, error);
        }
      }

      // Update Google Sheets if configured
      const sheets = await getSheetsClient();
      if (sheets && process.env.RADAR_GOOGLE_SHEET_ID) {
        try {
          logger.debug('[CLEANUP] Updating Google Sheets...');

          // Clear existing data
          await sheets.spreadsheets.values.clear({
            spreadsheetId: process.env.RADAR_GOOGLE_SHEET_ID,
            range: 'Events!A:J'
          });

          // Prepare headers and data for kept events
          const headers = [
            'Event ID',
            'Title',
            'Date',
            'Time',
            'Location',
            'City',
            'Category',
            'Source',
            'Detail URL',
            'Added'
          ];

          const rows = eventsToKeep.map(event => [
            event.id || '',
            event.title || '',
            event.date || '',
            event.time || '',
            event.location || '',
            event.city || '',
            event.category || '',
            event.source || '',
            event.detailUrl || '',
            event.createdAt ? new Date(event.createdAt).toLocaleString('de-AT') : ''
          ]);

          // Update sheet with kept events
          await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.RADAR_GOOGLE_SHEET_ID,
            range: 'Events!A1',
            valueInputOption: 'RAW',
            resource: {
              values: [headers, ...rows]
            }
          });

          logger.debug(`[CLEANUP] Google Sheets updated with ${rows.length} events`);
        } catch (sheetError) {
          logger.error('[CLEANUP] Failed to update Google Sheets:', sheetError);
        }
      }

      // Update cleanup metrics
      await kv.hset('radar:metrics:cleanup', {
        lastRun: new Date().toISOString(),
        eventsRemoved: eventsToRemove.length,
        eventsKept: eventsToKeep.length,
        oldEventsRemoved: stats.oldEvents.length,
        duplicatesRemoved: stats.duplicates.length
      });
    }

    // Return results
    return res.status(200).json({
      success: true,
      dryRun: dryRun,
      stats: {
        totalEvents: stats.totalEvents,
        kept: stats.kept,
        removed: stats.removed,
        oldEvents: stats.oldEvents.length,
        duplicates: stats.duplicates.length
      },
      removals: dryRun ? eventsToRemove : [],
      message: dryRun
        ? `Would remove ${eventsToRemove.length} events (run with dryRun=false to execute)`
        : `Removed ${eventsToRemove.length} events successfully`
    });

  } catch (error) {
    logger.error('[CLEANUP] Fatal error:', error);
    return res.status(500).json({
      error: 'Cleanup failed',
      message: error.message
    });
  }
}

// Calculate data completeness score for an event
function calculateDataScore(event) {
  let score = 0;

  // Core fields (higher weight)
  if (event.title) score += 3;
  if (event.date) score += 3;
  if (event.time) score += 2;
  if (event.location) score += 2;

  // Additional fields (lower weight)
  if (event.description) score += 1;
  if (event.category) score += 1;
  if (event.detailUrl) score += 1;
  if (event.registrationUrl) score += 1;
  if (event.city) score += 1;

  return score;
}