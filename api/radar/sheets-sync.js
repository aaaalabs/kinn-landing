import { google } from 'googleapis';
import { createClient } from '@vercel/kv';

// Use KINNST_ prefixed environment variables
const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

// Initialize Google Sheets client
let sheetsClient = null;

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
  } catch (error) {
    console.error('[RADAR Sheets] Failed to initialize Google Sheets client:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check authorization for manual trigger
  if (req.method === 'GET' || req.method === 'POST') {
    const authHeader = req.headers.authorization;

    // Allow cron jobs (no auth) or manual trigger with token
    if (!req.headers['user-agent']?.includes('vercel-cron')) {
      if (!authHeader || authHeader !== `Bearer ${process.env.RADAR_ADMIN_TOKEN}`) {
        console.log('[RADAR Sheets] Unauthorized access attempt');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
  }

  try {
    console.log('[RADAR Sheets] Starting sync to Google Sheets...');

    const SHEET_ID = process.env.RADAR_GOOGLE_SHEET_ID;

    if (!SHEET_ID) {
      throw new Error('RADAR_GOOGLE_SHEET_ID not configured');
    }

    // Get all event IDs from Redis
    const eventIds = await kv.smembers('radar:events') || [];
    const events = [];

    // Fetch all events
    for (const eventId of eventIds) {
      const event = await kv.hgetall(`radar:event:${eventId}`);
      if (event) {
        events.push(event);
      }
    }

    // Sort events by date (newest first for better overview)
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log(`[RADAR Sheets] Processing ${events.length} events`);

    // Prepare data for Google Sheets
    const headers = [
      'ID',
      'Status',
      'Title',
      'Date',
      'Time',
      'End Time',
      'Location',
      'Address',
      'City',
      'Description',
      'Registration URL',
      'Language',
      'Tags',
      'Source',
      'Created At',
      'Reviewed'
    ];

    const rows = events.map(event => {
      const eventDate = new Date(event.date);
      const now = new Date();
      let status = '⚫'; // Past

      if (eventDate >= now) {
        const daysUntil = Math.floor((eventDate - now) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 7) {
          status = '🔴'; // This week
        } else if (daysUntil <= 14) {
          status = '🟡'; // Next week
        } else {
          status = '🟢'; // Future
        }
      }

      return [
        event.id || '',
        status,
        event.title || '',
        event.date || '',
        event.time || '18:00',
        event.endTime || '',
        event.location || '',
        event.address || '',
        event.city || 'Innsbruck',
        event.description || '',
        event.registrationUrl || '',
        event.language || 'de',
        Array.isArray(event.tags) ? event.tags.join(', ') : (event.tags || ''),
        event.source || 'newsletter',
        event.createdAt || '',
        event.reviewed ? 'Yes' : 'No'
      ];
    });

    // Get sheets client
    const sheets = await getSheetsClient();

    // Clear existing data and write new data
    const range = 'Active Events!A:P';

    // Clear the sheet first
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: range
    });

    // Write headers and data
    const allRows = [headers, ...rows];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Active Events!A1',
      valueInputOption: 'RAW',
      resource: {
        values: allRows
      }
    });

    console.log(`[RADAR Sheets] Successfully synced ${events.length} events`);

    // Update statistics
    await updateStatistics(sheets, SHEET_ID, events);

    // Store last sync time
    await kv.set('radar:sheets:last-sync', new Date().toISOString());

    // Return success response
    return res.status(200).json({
      success: true,
      synced: events.length,
      timestamp: new Date().toISOString(),
      sheetUrl: `https://docs.google.com/spreadsheets/d/${SHEET_ID}`
    });

  } catch (error) {
    console.error('[RADAR Sheets] Sync error:', error);
    return res.status(500).json({
      error: 'Sync failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function updateStatistics(sheets, sheetId, events) {
  try {
    const now = new Date();
    const futureEvents = events.filter(e => new Date(e.date) >= now);
    const thisWeekEvents = futureEvents.filter(e => {
      const daysUntil = Math.floor((new Date(e.date) - now) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7;
    });

    // Count events by source
    const sourceCounts = {};
    events.forEach(event => {
      const source = event.source || 'unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    // Get metrics from Redis
    const totalNewsletters = await kv.get('radar:metrics:newsletters:total') || 0;
    const totalAdded = await kv.get('radar:metrics:events:added') || 0;
    const totalRejected = await kv.get('radar:metrics:events:rejected') || 0;

    // Prepare statistics data
    const stats = [
      ['Metric', 'Value', 'Last Updated'],
      ['Total Events', events.length, now.toISOString()],
      ['Future Events', futureEvents.length, now.toISOString()],
      ['This Week', thisWeekEvents.length, now.toISOString()],
      ['Past Events', events.length - futureEvents.length, now.toISOString()],
      ['', '', ''],
      ['Newsletters Processed', totalNewsletters, now.toISOString()],
      ['Events Added', totalAdded, now.toISOString()],
      ['Events Rejected (not FREE/TYROL)', totalRejected, now.toISOString()],
      ['', '', ''],
      ['--- Sources ---', '---', '---'],
      ...Object.entries(sourceCounts).map(([source, count]) => [
        source,
        count,
        now.toISOString()
      ]),
      ['', '', ''],
      ['Last Sync Status', 'Success ✅', now.toISOString()]
    ];

    // Update statistics sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Statistics!A1',
      valueInputOption: 'RAW',
      resource: {
        values: stats
      }
    });

  } catch (error) {
    console.error('[RADAR Sheets] Failed to update statistics:', error);
    // Don't throw - statistics update failure shouldn't break the main sync
  }
}