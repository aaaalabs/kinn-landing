import { createClient } from '@vercel/kv';
import { google } from 'googleapis';
import { SOURCE_CONFIGS } from './source-configs.js';

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
    console.error('[RUN-ALL] Failed to initialize Google Sheets client:', error);
    throw error;
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
    const { testMode = false } = req.method === 'GET' ? req.query : req.body;

    console.log('[RUN-ALL] Starting comprehensive extraction run...');

    // Get all active sources from config
    const activeSources = Object.entries(SOURCE_CONFIGS)
      .filter(([name, config]) => config.active)
      .map(([name, config]) => ({ name, ...config }));

    console.log(`[RUN-ALL] Found ${activeSources.length} active sources`);

    // Process sources in parallel batches to avoid timeout
    const BATCH_SIZE = 3; // Process 3 sources at a time (reduced from 5 to avoid timeouts)
    const results = [];

    // Process in batches
    for (let i = 0; i < activeSources.length; i += BATCH_SIZE) {
      const batch = activeSources.slice(i, i + BATCH_SIZE);
      console.log(`[RUN-ALL] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.map(s => s.name).join(', ')}`);

      // Process batch in parallel
      const batchPromises = batch.map(async (source) => {
        try {
          console.log(`[RUN-ALL] Extracting from ${source.name}...`);

          // Call Firecrawl extraction endpoint
          const extractResponse = await fetch(`${process.env.BASE_URL || 'https://kinn.at'}/api/radar/extract-firecrawl`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.RADAR_ADMIN_TOKEN}`
            },
            body: JSON.stringify({
              sourceName: source.name,
              testMode: testMode
            }),
            signal: AbortSignal.timeout(15000) // 15 second timeout per source (increased from 8)
          });

          let extractData;
          try {
            extractData = await extractResponse.json();
          } catch (parseError) {
            console.error(`[RUN-ALL] Failed to parse response for ${source.name}:`, parseError);
            extractData = { success: false, error: 'Invalid JSON response' };
          }

          const result = {
            source: source.name,
            url: source.url,
            success: extractData.success,
            eventsFound: extractData.events_found || 0,
            eventsAdded: extractData.events_added || 0,
            duplicates: extractData.duplicates || 0,
            error: extractData.error,
            timestamp: new Date().toISOString()
          };

          // Update source metrics in Redis (non-blocking)
          const metricsKey = `radar:metrics:source:${source.name.toLowerCase().replace(/\s+/g, '-')}`;
          kv.hset(metricsKey, {
            lastRun: result.timestamp,
            lastEventsFound: result.eventsFound,
            lastEventsAdded: result.eventsAdded,
            lastSuccess: result.success
          }).catch(err => console.error(`[RUN-ALL] Redis update failed for ${source.name}:`, err));

          return result;

        } catch (error) {
          console.error(`[RUN-ALL] Error processing ${source.name}:`, error);
          return {
            source: source.name,
            url: source.url,
            success: false,
            eventsFound: 0,
            eventsAdded: 0,
            duplicates: 0,
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < activeSources.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Calculate totals
    let totalEventsFound = 0;
    let totalEventsAdded = 0;
    let successfulSources = 0;
    let failedSources = 0;

    results.forEach(result => {
      if (result.success) {
        successfulSources++;
        totalEventsFound += result.eventsFound;
        totalEventsAdded += result.eventsAdded;
      } else {
        failedSources++;
      }
    });

    // Skip Google Sheets update if not configured or to save time
    const skipSheets = !process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.RADAR_GOOGLE_SHEET_ID;

    if (!skipSheets) {
      console.log('[RUN-ALL] Updating Google Sheets...');
      try {
        const sheets = await getSheetsClient();
      const SHEET_ID = process.env.RADAR_GOOGLE_SHEET_ID;

      // Prepare data for Sources sheet update
      const headers = [
        'Source',           // A
        'Status',          // B
        'Quality',         // C
        'Events Found',    // D
        'Events Added',    // E
        'Last Check',      // F
        'Type',           // G
        'Schedule',       // H
        'URL',            // I
        'HTML Pattern',    // J
        'Date Format',     // K
        'Extract Notes'    // L
      ];

      const rows = results.map(result => {
        const sourceConfig = SOURCE_CONFIGS[result.source];

        // Determine status with actual numbers
        let status = '⏸️ Inactive';
        if (result.success) {
          if (result.eventsAdded > 0) {
            // Show actual number of events that were successfully extracted
            status = `✅ ${result.eventsAdded} events`;
          } else if (result.eventsFound > 0) {
            // Found events but all were duplicates
            status = `⚠️ ${result.eventsFound} duplicates`;
          } else {
            // No events found at all
            status = '⚠️ No events';
          }
        } else if (result.error) {
          // Include error type
          if (result.error.includes('timeout')) {
            status = '⏱️ Timeout';
          } else if (result.error.includes('auth')) {
            status = '🔐 Auth needed';
          } else {
            status = '❌ Error';
          }
        }

        // Calculate quality based on extraction success rate
        let quality = '-';
        if (result.eventsFound > 0) {
          const successRate = result.eventsAdded / result.eventsFound;

          // Quality based on both success rate and total events
          if (result.eventsAdded >= 10 && successRate >= 0.5) {
            quality = '⭐⭐⭐'; // Many events, good success rate
          } else if (result.eventsAdded >= 5 && successRate >= 0.3) {
            quality = '⭐⭐'; // Some events, decent success rate
          } else if (result.eventsAdded >= 1) {
            quality = '⭐'; // At least extracted something
          } else {
            quality = '❌'; // Found events but couldn't extract any
          }
        } else if (result.success && result.eventsFound === 0) {
          quality = '🔍'; // Working but no events currently
        } else if (!result.success) {
          quality = '⚠️'; // Failed extraction
        }

        return [
          result.source,                    // A: Source name
          status,                           // B: Status (with actual numbers!)
          quality,                          // C: Quality (based on success rate)
          result.eventsFound,               // D: Events found
          result.eventsAdded,               // E: Events added
          new Date(result.timestamp).toLocaleDateString(), // F: Last check
          sourceConfig?.extraction?.method || 'custom',    // G: Type
          'Daily',                          // H: Schedule
          result.url,                       // I: URL
          sourceConfig?.extraction?.htmlPattern || '',     // J: HTML Pattern
          sourceConfig?.extraction?.dateFormat || '',      // K: Date Format
          sourceConfig?.extraction?.extractNotes || ''     // L: Extract Notes
        ];
      });

      // Update Sources sheet
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: 'Sources!A:L'
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: 'Sources!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers, ...rows]
        }
      });

      // Add summary statistics
      const summaryHeaders = ['Metric', 'Value'];
      const summary = [
        ['Total Sources', activeSources.length],
        ['Successful', successfulSources],
        ['Failed', failedSources],
        ['Total Events Found', totalEventsFound],
        ['Total Events Added', totalEventsAdded],
        ['Last Update', new Date().toLocaleString('de-AT', { timeZone: 'Europe/Vienna' })]
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: 'Sources!N1',
        valueInputOption: 'RAW',
        resource: {
          values: [summaryHeaders, ...summary]
        }
      });

        console.log('[RUN-ALL] Google Sheets updated successfully');

      } catch (sheetError) {
        console.error('[RUN-ALL] Failed to update Google Sheets:', sheetError);
        // Continue even if sheet update fails
      }
    } else {
      console.log('[RUN-ALL] Skipping Google Sheets update (not configured)');
    }

    // Update global metrics
    await kv.hset('radar:metrics:global', {
      lastFullRun: new Date().toISOString(),
      totalSources: activeSources.length,
      successfulSources: successfulSources,
      failedSources: failedSources,
      lastTotalFound: totalEventsFound,
      lastTotalAdded: totalEventsAdded
    });

    // Return comprehensive results
    return res.status(200).json({
      success: true,
      summary: {
        totalSources: activeSources.length,
        successful: successfulSources,
        failed: failedSources,
        eventsFound: totalEventsFound,
        eventsAdded: totalEventsAdded,
        timestamp: new Date().toISOString()
      },
      results: results,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${process.env.RADAR_GOOGLE_SHEET_ID}`
    });

  } catch (error) {
    console.error('[RUN-ALL] Fatal error:', error);
    return res.status(500).json({
      error: 'Extraction run failed',
      message: error.message
    });
  }
}