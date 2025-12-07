import { createClient } from '@vercel/kv';
import { google } from 'googleapis';

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
    console.error('[SYNC-SHEETS] Failed to initialize Google Sheets client:', error);
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
    console.log('[SYNC-SHEETS] Starting event sync to Google Sheets...');

    // Get current date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all event IDs from Redis
    const allEventIds = await kv.smembers('radar:events');
    console.log(`[SYNC-SHEETS] Found ${allEventIds.length} total events`);

    // Collect all events with their data
    const events = [];
    const futureEvents = [];

    for (const eventId of allEventIds) {
      try {
        const eventData = await kv.hgetall(`radar:event:${eventId}`);

        if (!eventData || !eventData.date) {
          continue;
        }

        // Check if event is in the future
        const eventDate = new Date(eventData.date);
        if (eventDate >= today) {
          futureEvents.push(eventData);
        }

        // Add all events to the full list
        events.push(eventData);

      } catch (error) {
        console.error(`[SYNC-SHEETS] Error fetching event ${eventId}:`, error);
      }
    }

    // Sort events by date
    futureEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log(`[SYNC-SHEETS] Processing ${futureEvents.length} future events`);

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
      // Clear existing data
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: 'Events!A:M'
      });

      // Write new data
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: 'Events!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers, ...futureRows]
        }
      });

      console.log(`[SYNC-SHEETS] Updated Events sheet with ${futureRows.length} future events`);
    } catch (sheetError) {
      console.error('[SYNC-SHEETS] Failed to update Events sheet:', sheetError);
      return res.status(500).json({
        error: 'Failed to update Events sheet',
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

      console.log(`[SYNC-SHEETS] Updated Archive sheet with ${allRows.length} total events`);
    } catch (archiveError) {
      console.error('[SYNC-SHEETS] Failed to update Archive sheet:', archiveError);
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
      console.error('[SYNC-SHEETS] Failed to update Summary:', summaryError);
    }

    // Return success
    return res.status(200).json({
      success: true,
      message: 'Events synced to Google Sheets',
      stats: {
        totalEvents: events.length,
        futureEvents: futureEvents.length,
        pastEvents: events.length - futureEvents.length,
        uniqueSources: [...new Set(events.map(e => e.source))].length
      },
      sheetUrl: `https://docs.google.com/spreadsheets/d/${SHEET_ID}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SYNC-SHEETS] Fatal error:', error);
    return res.status(500).json({
      error: 'Event sync failed',
      message: error.message
    });
  }
}