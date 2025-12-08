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
    logger.error('[SYNC-SHEETS] Failed to initialize Google Sheets client:', error);
    return null;
  }
}

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
    logger.debug('[SYNC-SHEETS] Starting event sync to Google Sheets...');

    // Get current date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all event IDs from Redis
    const allEventIds = await kv.smembers('radar:events');
    logger.debug(`[SYNC-SHEETS] Found ${allEventIds.length} total events`);

    // Collect all events with their data
    const events = [];
    const futureEvents = [];
    const duplicateStats = {
      found: 0,
      removed: 0
    };

    // Map for duplicate detection (title + date)
    const uniqueEventsMap = new Map();

    for (const eventId of allEventIds) {
      try {
        const eventData = await kv.hgetall(`radar:event:${eventId}`);

        if (!eventData || !eventData.date) {
          continue;
        }

        // Create unique key for duplicate detection
        const uniqueKey = `${(eventData.title || '').toLowerCase().trim()}_${eventData.date}`;

        // Check for duplicates
        if (uniqueEventsMap.has(uniqueKey)) {
          duplicateStats.found++;

          // Get existing event
          const existingEvent = uniqueEventsMap.get(uniqueKey);

          // Calculate data completeness score
          const existingScore = calculateEventScore(existingEvent);
          const currentScore = calculateEventScore(eventData);

          logger.debug(`[SYNC-SHEETS] Duplicate found: "${eventData.title}" on ${eventData.date}`);
          logger.debug(`  Existing score: ${existingScore}, Current score: ${currentScore}`);

          // Keep the one with more data
          if (currentScore > existingScore) {
            uniqueEventsMap.set(uniqueKey, eventData);
            duplicateStats.removed++;
            logger.debug(`  → Keeping new version (more data)`);
          } else {
            logger.debug(`  → Keeping existing version (more data)`);
          }
        } else {
          // First occurrence
          uniqueEventsMap.set(uniqueKey, eventData);
        }

      } catch (error) {
        logger.error(`[SYNC-SHEETS] Error fetching event ${eventId}:`, error);
      }
    }

    // Convert map back to arrays
    uniqueEventsMap.forEach(eventData => {
      events.push(eventData);

      // Check if event is in the future
      const eventDate = new Date(eventData.date);
      if (eventDate >= today) {
        futureEvents.push(eventData);
      }
    });

    logger.debug(`[SYNC-SHEETS] Duplicates found: ${duplicateStats.found}, removed: ${duplicateStats.removed}`);

    // Sort events by date
    futureEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    logger.debug(`[SYNC-SHEETS] Processing ${futureEvents.length} future events`);

    // Initialize Google Sheets
    const sheets = await getSheetsClient();
    if (!sheets || !process.env.RADAR_GOOGLE_SHEET_ID) {
      return res.status(500).json({
        error: 'Google Sheets not configured',
        eventsFound: events.length,
        futureEvents: futureEvents.length
      });
    }

    const SHEET_ID = process.env.RADAR_GOOGLE_SHEET_ID;

    // Prepare headers for Events sheet
    const headers = [
      'Event ID',        // A
      'Title',          // B
      'Date',           // C
      'Time',           // D
      'Location',       // E
      'City',           // F
      'Category',       // G
      'Source',         // H
      'Detail URL',     // I - The important detail link!
      'Registration',   // J
      'Description',    // K
      'Added',          // L
      'Status'          // M
    ];

    // Prepare rows for future events
    const futureRows = futureEvents.map(event => {
      // Determine if event has AI/KI keywords
      const isAIEvent = (event.title + ' ' + (event.description || '')).match(/\b(AI|KI|Artificial Intelligence|Künstliche Intelligenz|Machine Learning|Deep Learning|GPT|LLM)\b/i);

      return [
        event.id || '',                                    // A: Event ID
        event.title || '',                                 // B: Title
        event.date || '',                                  // C: Date (YYYY-MM-DD)
        event.time || '18:00',                            // D: Time (HH:MM)
        event.location || '',                             // E: Location/Venue
        event.city || 'Innsbruck',                        // F: City
        isAIEvent ? 'AI' : (event.category || 'Tech'),    // G: Category
        event.source || '',                               // H: Source
        event.detailUrl || event.url || '',               // I: Detail URL (IMPORTANT!)
        event.registrationUrl || '',                      // J: Registration URL
        (event.description || '').substring(0, 200),      // K: Description (truncated)
        event.createdAt ? new Date(event.createdAt).toLocaleDateString('de-AT') : '', // L: Added date
        '📅 Upcoming'                                     // M: Status
      ];
    });

    // Update Events sheet with future events
    try {
      // Clear existing data (using "Active Events" as the sheet name)
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: 'Active Events!A:M'
      });

      // Write new data
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: 'Active Events!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers, ...futureRows]
        }
      });

      logger.debug(`[SYNC-SHEETS] Updated Active Events sheet with ${futureRows.length} future events`);
    } catch (sheetError) {
      logger.error('[SYNC-SHEETS] Failed to update Active Events sheet:', sheetError);
      return res.status(500).json({
        error: 'Failed to update Active Events sheet',
        message: sheetError.message
      });
    }

    // Now prepare ALL events for the Archive sheet (including past events)
    const allRows = events.map(event => {
      const eventDate = new Date(event.date);
      const isPast = eventDate < today;
      const isAIEvent = (event.title + ' ' + (event.description || '')).match(/\b(AI|KI|Artificial Intelligence|Künstliche Intelligenz|Machine Learning|Deep Learning|GPT|LLM)\b/i);

      return [
        event.id || '',
        event.title || '',
        event.date || '',
        event.time || '18:00',
        event.location || '',
        event.city || 'Innsbruck',
        isAIEvent ? 'AI' : (event.category || 'Tech'),
        event.source || '',
        event.detailUrl || event.url || '',
        event.registrationUrl || '',
        (event.description || '').substring(0, 200),
        event.createdAt ? new Date(event.createdAt).toLocaleDateString('de-AT') : '',
        isPast ? '✅ Past' : '📅 Upcoming'
      ];
    });

    // Update Archive sheet with ALL events
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: 'Archive!A:M'
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: 'Archive!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers, ...allRows]
        }
      });

      logger.debug(`[SYNC-SHEETS] Updated Archive sheet with ${allRows.length} total events`);
    } catch (archiveError) {
      logger.error('[SYNC-SHEETS] Failed to update Archive sheet:', archiveError);
      // Non-critical error, continue
    }

    // Update Summary statistics
    const summaryData = [
      ['Metric', 'Value', 'Updated'],
      ['Total Events in Database', events.length, new Date().toLocaleString('de-AT')],
      ['Future Events', futureEvents.length, ''],
      ['Past Events', events.length - futureEvents.length, ''],
      ['AI/KI Events', futureEvents.filter(e => (e.title + ' ' + (e.description || '')).match(/\b(AI|KI)\b/i)).length, ''],
      ['Unique Sources', [...new Set(events.map(e => e.source))].length, ''],
      ['Events This Month', futureEvents.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      }).length, ''],
      ['Next Event', futureEvents[0]?.title || 'None', futureEvents[0]?.date || '']
    ];

    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: 'Summary!A1',
        valueInputOption: 'RAW',
        resource: {
          values: summaryData
        }
      });
    } catch (summaryError) {
      logger.error('[SYNC-SHEETS] Failed to update Summary:', summaryError);
    }

    // Return success
    return res.status(200).json({
      success: true,
      message: 'Events synced to Google Sheets (duplicates removed)',
      stats: {
        originalEvents: allEventIds.length,
        duplicatesFound: duplicateStats.found,
        duplicatesRemoved: duplicateStats.removed,
        uniqueEvents: events.length,
        futureEvents: futureEvents.length,
        pastEvents: events.length - futureEvents.length,
        uniqueSources: [...new Set(events.map(e => e.source))].length
      },
      sheetUrl: `https://docs.google.com/spreadsheets/d/${SHEET_ID}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('[SYNC-SHEETS] Fatal error:', error);
    return res.status(500).json({
      error: 'Event sync failed',
      message: error.message
    });
  }
}