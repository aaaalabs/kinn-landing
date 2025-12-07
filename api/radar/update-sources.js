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
    console.error('[RADAR Sources] Failed to initialize Google Sheets client:', error);
    throw error;
  }
}

// Complete list of all sources
const ALL_SOURCES = [
  // PRIMARY - HIGH VALUE
  {
    name: 'InnCubator',
    url: 'https://www.inncubator.at/events',
    type: 'Website',
    category: 'Startup/Innovation',
    priority: 'HIGH',
    frequency: 'Daily',
    expectedMonthly: 15,
    active: true
  },
  {
    name: 'Startup.Tirol',
    url: 'https://www.startup.tirol/events/',
    type: 'Website',
    category: 'Startup Ecosystem',
    priority: 'HIGH',
    frequency: 'Daily',
    expectedMonthly: 20,
    active: true
  },
  {
    name: 'WKO Tirol',
    url: 'https://www.wko.at/veranstaltungen/start',
    type: 'Website',
    category: 'Business/Commerce',
    priority: 'HIGH',
    frequency: 'Daily',
    expectedMonthly: 25,
    active: true
  },
  {
    name: 'AI Austria',
    url: 'https://aiaustria.com/event-calendar',
    type: 'Website',
    category: 'AI/ML',
    priority: 'HIGH',
    frequency: 'Daily',
    expectedMonthly: 10,
    active: true
  },
  {
    name: 'Standortagentur Tirol',
    url: 'https://www.standort-tirol.at/veranstaltungen',
    type: 'Website',
    category: 'Regional Development',
    priority: 'HIGH',
    frequency: 'Daily',
    expectedMonthly: 15,
    active: true
  },

  // SECONDARY - MEDIUM VALUE
  {
    name: 'Uni Innsbruck',
    url: 'https://www.uibk.ac.at/events/',
    type: 'Website',
    category: 'Academic/Research',
    priority: 'MEDIUM',
    frequency: 'Daily',
    expectedMonthly: 30,
    active: true
  },
  {
    name: 'MCI',
    url: 'https://www.mci4me.at/events',
    type: 'Website',
    category: 'Academic/Business',
    priority: 'MEDIUM',
    frequency: 'Daily',
    expectedMonthly: 15,
    active: false // Not yet implemented
  },
  {
    name: 'LSZ',
    url: 'https://lsz.at/',
    type: 'Website',
    category: 'Life Sciences',
    priority: 'MEDIUM',
    frequency: 'Weekly',
    expectedMonthly: 8,
    active: true
  },
  {
    name: 'DIH West',
    url: 'https://www.dih-west.at/events',
    type: 'Newsletter',
    category: 'Digital Innovation',
    priority: 'HIGH',
    frequency: 'As received',
    expectedMonthly: 10,
    active: false // Newsletter subscription needed
  },
  {
    name: 'FH Kufstein',
    url: 'https://www.fh-kufstein.ac.at/events',
    type: 'Website',
    category: 'Academic',
    priority: 'MEDIUM',
    frequency: 'Weekly',
    expectedMonthly: 10,
    active: false
  },
  {
    name: 'Werkstätte Wattens',
    url: 'https://www.werkstaette-wattens.at',
    type: 'Website',
    category: 'Innovation Hub',
    priority: 'MEDIUM',
    frequency: 'Weekly',
    expectedMonthly: 12,
    active: false
  },
  {
    name: 'Coworking Tirol',
    url: 'https://coworking-tirol.com/events',
    type: 'Website',
    category: 'Coworking/Community',
    priority: 'MEDIUM',
    frequency: 'Weekly',
    expectedMonthly: 8,
    active: false
  },

  // LOW PRIORITY
  {
    name: 'Innsbruck.info',
    url: 'https://www.innsbruck.info/veranstaltungskalender.html',
    type: 'Website',
    category: 'Tourism/Culture',
    priority: 'LOW',
    frequency: 'Weekly',
    expectedMonthly: 50,
    active: true
  },
  {
    name: 'Congress Messe Innsbruck',
    url: 'https://www.cmi.at/de/veranstaltungskalender',
    type: 'Website',
    category: 'Congress/Trade',
    priority: 'LOW',
    frequency: 'Weekly',
    expectedMonthly: 15,
    active: true
  },

  // NEWSLETTER SOURCES
  {
    name: 'thomas@libralab.ai',
    url: 'Manual forward',
    type: 'Newsletter',
    category: 'Test/Manual',
    priority: 'TEST',
    frequency: 'As received',
    expectedMonthly: 5,
    active: true
  }
];

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('[RADAR Sources] Updating sources sheet...');

    const SHEET_ID = process.env.RADAR_GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      throw new Error('RADAR_GOOGLE_SHEET_ID not configured');
    }

    // Get metrics from Redis for each source
    const sourcesWithMetrics = [];

    for (const source of ALL_SOURCES) {
      // Try to get metrics from Redis
      const metricsKey = `radar:metrics:source:${source.name.toLowerCase().replace(/\s+/g, '-')}`;
      const metrics = await kv.hgetall(metricsKey) || {};

      sourcesWithMetrics.push({
        ...source,
        eventsFound: metrics.eventsFound || 0,
        eventsAdded: metrics.eventsAdded || 0,
        lastChecked: metrics.lastSuccess || 'Never',
        successRate: metrics.errorRate ? `${((1 - metrics.errorRate) * 100).toFixed(1)}%` : 'N/A'
      });
    }

    // Prepare data for Google Sheets - SIMPLIFIED SLC VERSION
    const headers = [
      'Source',           // Name
      'Status',          // Active/Inactive/Error
      'Quality',         // HIGH/MED/LOW
      'This Month',      // Events found this month
      'Last 30 Days',    // Events in last 30 days
      'Last Check',      // When we last checked
      'Type',           // Web/Newsletter
      'Schedule',       // Daily/Weekly/On Receipt
      'URL'             // Reference link
    ];

    const rows = sourcesWithMetrics.map(source => {
      // Calculate status emoji
      let status = '⏸️ Inactive';
      if (source.active) {
        if (source.lastChecked && source.lastChecked !== 'Never') {
          const lastCheck = new Date(source.lastChecked);
          const hoursSinceCheck = (Date.now() - lastCheck) / (1000 * 60 * 60);
          if (hoursSinceCheck < 24) {
            status = '✅ Active';
          } else if (hoursSinceCheck < 72) {
            status = '⚠️ Stale';
          } else {
            status = '❌ Error';
          }
        }
      }

      // Quality indicator based on priority
      const qualityMap = {
        'HIGH': '⭐⭐⭐',
        'MEDIUM': '⭐⭐',
        'LOW': '⭐',
        'TEST': '🧪'
      };

      return [
        source.name,
        status,
        qualityMap[source.priority] || '⭐',
        source.eventsFound || 0,      // This month
        source.eventsAdded || 0,      // Last 30 days (simplified)
        source.lastChecked === 'Never' ? 'Never' : new Date(source.lastChecked).toLocaleDateString(),
        source.type,
        source.frequency,
        source.url
      ];
    });

    // Get sheets client
    const sheets = await getSheetsClient();

    // Clear and update Sources sheet
    const range = 'Sources!A:I';  // 9 columns now

    // Log what we're about to write
    console.log(`[RADAR Sources] Writing ${rows.length} rows to Sources tab`);
    console.log(`[RADAR Sources] First row sample:`, rows[0]);

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: range
    });

    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Sources!A1',
      valueInputOption: 'RAW',
      resource: {
        values: [headers, ...rows]
      }
    });

    console.log(`[RADAR Sources] Update response:`, updateResponse.data);

    // Add ACTIONABLE summary statistics
    const summaryHeaders = ['Status', 'Count'];

    const activeCount = rows.filter(r => r[1].includes('✅')).length;
    const staleCount = rows.filter(r => r[1].includes('⚠️')).length;
    const errorCount = rows.filter(r => r[1].includes('❌')).length;
    const inactiveCount = rows.filter(r => r[1].includes('⏸️')).length;

    const summary = [
      ['✅ Working', activeCount],
      ['⚠️ Need Check', staleCount],
      ['❌ Broken', errorCount],
      ['⏸️ Inactive', inactiveCount],
      ['', ''],
      ['Total Sources', ALL_SOURCES.length],
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

    console.log(`[RADAR Sources] Successfully updated ${sourcesWithMetrics.length} sources`);

    return res.status(200).json({
      success: true,
      sources_updated: sourcesWithMetrics.length,
      active_sources: ALL_SOURCES.filter(s => s.active).length,
      sheet_url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}`
    });

  } catch (error) {
    console.error('[RADAR Sources] Update error:', error);
    return res.status(500).json({
      error: 'Sources update failed',
      message: error.message
    });
  }
}