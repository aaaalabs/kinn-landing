# KINN-RADAR Google Sheets Integration Guide

## Overview

This guide implements a Google Sheets synchronization system for KINN-RADAR events, providing a Single Location of Control (SLC) for event management with real-time updates and collaborative editing capabilities.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Upstash Redis  │────▶│  Sync Function   │────▶│  Google Sheets  │
│  (Event Store)  │     │  (Vercel Cron)   │     │  (SLC View)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         ▲                       │                         │
         │                       │                         ▼
         │                       ▼                  ┌─────────────┐
         │              ┌──────────────────┐        │   Thomas    │
         │              │   Change Feed    │◀───────│  (Editor)   │
         └──────────────│   (Webhook)      │        └─────────────┘
                        └──────────────────┘
```

## Phase 1: Initial Setup (30 minutes)

### 1.1 Create Google Cloud Project

```bash
# 1. Go to console.cloud.google.com
# 2. Create new project: "kinn-radar"
# 3. Enable APIs:
#    - Google Sheets API
#    - Google Drive API

# 4. Create Service Account:
# - Name: kinn-radar-sync
# - Role: Editor
# - Create JSON key → save as service-account.json
```

### 1.2 Create Master Spreadsheet

```javascript
// Structure:
{
  "sheetName": "KINN-RADAR Events Tirol",
  "sheets": [
    {
      "name": "Active Events",
      "columns": [
        "ID",                    // Unique event ID
        "Status",               // 🟢 Active | 🟡 Draft | 🔴 Cancelled
        "Title",                // Event name
        "Date",                 // ISO date
        "Time",                 // HH:MM
        "Location",             // Venue name
        "City",                 // City/Region
        "Organizer",            // Host organization
        "Source",               // Newsletter/Website/Manual
        "Confidence",           // High/Medium/Low
        "Registration URL",     // Link to signup
        "Description",          // Event details
        "Tags",                 // AI, ML, Workshop, etc.
        "Added",                // Timestamp
        "Reviewed",             // Yes/No
        "KINN Relevant",        // ⭐⭐⭐ relevance score
        "Notes"                 // Internal notes
      ]
    },
    {
      "name": "Archive",
      "columns": ["Same as Active Events"]
    },
    {
      "name": "Sources",
      "columns": [
        "Source Name",
        "Type",                  // Newsletter/Website/API
        "Last Check",
        "Events Found",
        "Success Rate",
        "Status"                 // Active/Paused/Error
      ]
    },
    {
      "name": "Statistics",
      "columns": [
        "Metric",
        "Value",
        "Last Updated"
      ]
    }
  ]
}
```

### 1.3 Share Spreadsheet

```bash
# Share with:
# - thomas@kinn.at (Editor)
# - Service Account Email (Editor)
# - radar@in.kinn.at (Viewer)

# Get shareable link for dashboard embedding
```

## Phase 2: Sync Implementation (2 hours)

### 2.1 Install Dependencies

```bash
cd /Users/libra/GitHub_quicks/_KINN/mvp
npm install googleapis google-auth-library
```

### 2.2 Core Sync Function

```javascript
// api/radar/sheets-sync.js
import { google } from 'googleapis';
import { Redis } from '@upstash/redis';

const SHEET_ID = process.env.RADAR_GOOGLE_SHEET_ID;
const SYNC_INTERVAL = 300000; // 5 minutes

// Initialize Google Sheets client
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

// Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export async function syncToSheets() {
  console.log('[SHEETS-SYNC] Starting sync...');

  try {
    // 1. Fetch all events from Redis
    const eventKeys = await redis.keys('radar:event:*');
    const events = [];

    for (const key of eventKeys) {
      const event = await redis.get(key);
      if (event) events.push(event);
    }

    // 2. Sort events by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 3. Transform to sheet rows
    const rows = events.map(event => [
      event.id,
      getStatusEmoji(event),
      event.title,
      event.date,
      event.time || '',
      event.location || '',
      event.city || 'Innsbruck',
      event.organizer || '',
      event.source || 'Manual',
      event.confidence || 'High',
      event.registrationUrl || '',
      event.description || '',
      (event.tags || []).join(', '),
      event.createdAt,
      event.reviewed ? 'Yes' : 'No',
      getRelevanceStars(event),
      event.notes || ''
    ]);

    // 4. Add header row
    const headers = [
      'ID', 'Status', 'Title', 'Date', 'Time', 'Location', 'City',
      'Organizer', 'Source', 'Confidence', 'Registration URL',
      'Description', 'Tags', 'Added', 'Reviewed', 'KINN Relevant', 'Notes'
    ];

    // 5. Clear existing data and write new
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: 'Active Events!A:Q'
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Active Events!A1',
      valueInputOption: 'RAW',
      resource: {
        values: [headers, ...rows]
      }
    });

    // 6. Update statistics sheet
    await updateStatistics(events);

    // 7. Apply formatting
    await applyFormatting();

    console.log(`[SHEETS-SYNC] Synced ${events.length} events`);
    return { success: true, count: events.length };

  } catch (error) {
    console.error('[SHEETS-SYNC] Error:', error);
    throw error;
  }
}

function getStatusEmoji(event) {
  const date = new Date(event.date);
  const now = new Date();

  if (event.cancelled) return '🔴';
  if (date < now) return '⚫';
  if (!event.reviewed) return '🟡';
  return '🟢';
}

function getRelevanceStars(event) {
  const score = calculateRelevance(event);
  if (score >= 0.8) return '⭐⭐⭐';
  if (score >= 0.5) return '⭐⭐';
  if (score >= 0.3) return '⭐';
  return '';
}

function calculateRelevance(event) {
  let score = 0;

  // Location bonus
  if (event.city === 'Innsbruck') score += 0.3;
  else if (event.city && event.city.includes('Tirol')) score += 0.2;

  // Tag relevance
  const relevantTags = ['AI', 'KI', 'Machine Learning', 'Deep Learning', 'LLM'];
  const eventTags = (event.tags || []).map(t => t.toLowerCase());

  relevantTags.forEach(tag => {
    if (eventTags.some(t => t.includes(tag.toLowerCase()))) {
      score += 0.2;
    }
  });

  // KINN organizer bonus
  if (event.organizer?.includes('KINN')) score += 0.5;

  return Math.min(score, 1);
}

async function updateStatistics(events) {
  const stats = [
    ['Total Events', events.length, new Date().toISOString()],
    ['Active Events', events.filter(e => new Date(e.date) >= new Date()).length, new Date().toISOString()],
    ['Reviewed', events.filter(e => e.reviewed).length, new Date().toISOString()],
    ['High Confidence', events.filter(e => e.confidence === 'High').length, new Date().toISOString()],
    ['Innsbruck Events', events.filter(e => e.city === 'Innsbruck').length, new Date().toISOString()],
    ['Newsletter Sources', events.filter(e => e.source === 'Newsletter').length, new Date().toISOString()],
    ['Last Sync', 'Success', new Date().toISOString()]
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Statistics!A2',
    valueInputOption: 'RAW',
    resource: {
      values: stats
    }
  });
}

async function applyFormatting() {
  const requests = [
    // Freeze header row
    {
      updateSheetProperties: {
        properties: {
          sheetId: 0,
          gridProperties: {
            frozenRowCount: 1
          }
        },
        fields: 'gridProperties.frozenRowCount'
      }
    },
    // Auto-resize columns
    {
      autoResizeDimensions: {
        dimensions: {
          sheetId: 0,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: 17
        }
      }
    },
    // Conditional formatting for status
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId: 0,
            startColumnIndex: 1,
            endColumnIndex: 2
          }],
          booleanRule: {
            condition: {
              type: 'TEXT_CONTAINS',
              values: [{ userEnteredValue: '🟢' }]
            },
            format: {
              backgroundColor: { red: 0.85, green: 1, blue: 0.85 }
            }
          }
        }
      }
    }
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    resource: { requests }
  });
}
```

### 2.3 Vercel Cron Configuration

```javascript
// vercel.json addition
{
  "crons": [
    {
      "path": "/api/radar/sheets-sync",
      "schedule": "*/5 * * * *"  // Every 5 minutes
    }
  ]
}
```

### 2.4 Manual Trigger Endpoint

```javascript
// api/radar/sync-now.js
import { syncToSheets } from './sheets-sync';

export default async function handler(req, res) {
  // Simple auth check
  const token = req.headers.authorization?.split(' ')[1];
  if (token !== process.env.ADMIN_SYNC_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await syncToSheets();
    res.json({
      success: true,
      message: `Synced ${result.count} events`,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${process.env.RADAR_GOOGLE_SHEET_ID}`
    });
  } catch (error) {
    res.status(500).json({
      error: 'Sync failed',
      message: error.message
    });
  }
}
```

## Phase 3: Bidirectional Sync (Optional - 3 hours)

### 3.1 Google Sheets Webhook

```javascript
// Google Apps Script (in Sheet)
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== 'Active Events') return;

  const row = e.range.getRow();
  if (row === 1) return; // Skip header

  const data = sheet.getRange(row, 1, 1, 17).getValues()[0];
  const event = {
    id: data[0],
    status: data[1],
    title: data[2],
    date: data[3],
    time: data[4],
    location: data[5],
    city: data[6],
    organizer: data[7],
    source: data[8],
    confidence: data[9],
    registrationUrl: data[10],
    description: data[11],
    tags: data[12].split(',').map(t => t.trim()),
    createdAt: data[13],
    reviewed: data[14] === 'Yes',
    relevance: data[15],
    notes: data[16]
  };

  // Send to KINN-RADAR webhook
  UrlFetchApp.fetch('https://kinn.at/api/radar/webhook/sheets-update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getScriptProperty('WEBHOOK_TOKEN')
    },
    payload: JSON.stringify({ event, action: 'update' })
  });
}
```

### 3.2 Update Handler

```javascript
// api/radar/webhook/sheets-update.js
export default async function handler(req, res) {
  const { event, action } = req.body;

  if (action === 'update') {
    await redis.set(`radar:event:${event.id}`, event);
  } else if (action === 'delete') {
    await redis.del(`radar:event:${event.id}`);
  }

  res.json({ success: true });
}
```

## Phase 4: Access & Permissions

### 4.1 Direct Sheet Access

```markdown
# For Thomas (Editor Access)
https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit

# Features Available:
- Edit any event
- Add new events (append to bottom)
- Mark events as reviewed
- Add internal notes
- Filter and sort
- Create custom views
- Export as CSV/Excel
```

### 4.2 Embedded View

```html
<!-- For public website -->
<iframe
  src="https://docs.google.com/spreadsheets/d/{SHEET_ID}/pubhtml?gid=0&single=true&widget=true&headers=false"
  width="100%"
  height="600">
</iframe>
```

### 4.3 API Access

```javascript
// api/radar/sheets-data.js
export async function GET(req, res) {
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Active Events!A:Q'
  });

  const [headers, ...rows] = response.data.values;
  const events = rows.map(row => {
    return headers.reduce((obj, header, index) => {
      obj[header] = row[index] || '';
      return obj;
    }, {});
  });

  res.json({ events });
}
```

## Monitoring & Alerts

### Health Check

```javascript
// api/radar/sheets-health.js
export default async function handler(req, res) {
  try {
    // Check last sync time
    const lastSync = await redis.get('radar:sheets:last-sync');
    const minutesSinceSync = (Date.now() - new Date(lastSync)) / 60000;

    // Check sheet accessibility
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID
    });

    const health = {
      status: minutesSinceSync < 10 ? 'healthy' : 'degraded',
      lastSync,
      minutesSinceSync,
      sheetAccessible: !!response.data,
      sheetTitle: response.data.properties.title
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
}
```

### Email Alerts

```javascript
// Alert when sync fails
if (syncFailed) {
  await resend.emails.send({
    from: 'radar@in.kinn.at',
    to: 'thomas@kinn.at',
    subject: '⚠️ KINN-RADAR Sheet Sync Failed',
    html: `
      <p>The Google Sheets sync failed at ${new Date().toISOString()}</p>
      <p>Error: ${error.message}</p>
      <p><a href="https://kinn.at/api/radar/sync-now">Trigger Manual Sync</a></p>
    `
  });
}
```

## Quick Start Checklist

```markdown
□ 1. Create Google Cloud Project
□ 2. Enable Sheets & Drive APIs
□ 3. Create Service Account & download JSON key
□ 4. Create Master Spreadsheet
□ 5. Share sheet with thomas@kinn.at & service account
□ 6. Add environment variables to Vercel:
   - RADAR_GOOGLE_SHEET_ID
   - GOOGLE_SERVICE_ACCOUNT_KEY (JSON string)
   - ADMIN_SYNC_TOKEN
□ 7. Deploy sync function
□ 8. Test manual sync endpoint
□ 9. Verify cron job running
□ 10. Share sheet link with Thomas
```

## Cost Analysis

```yaml
Google Sheets API:
  - Quota: 300 requests/minute (free)
  - Our usage: ~12 requests/sync × 12 syncs/hour = 144/hour
  - Cost: €0

Storage:
  - Google Drive: 15GB free
  - Expected usage: <10MB
  - Cost: €0

Vercel Cron:
  - Free tier: Unlimited cron jobs
  - Cost: €0

Total Monthly Cost: €0
```

## Troubleshooting

### Common Issues

1. **"Insufficient permissions"**
   - Verify service account has Editor role
   - Check sheet is shared with service account email

2. **"Sheet not found"**
   - Verify SHEET_ID is correct
   - Check sheet hasn't been deleted/moved

3. **"Rate limit exceeded"**
   - Reduce sync frequency
   - Implement exponential backoff

4. **"Sync data mismatch"**
   - Check Redis connection
   - Verify event schema matches
   - Run manual sync to reset

## Benefits Summary

✅ **Zero Cost** - Completely free solution
✅ **Real-time Collaboration** - Thomas can edit directly
✅ **Version History** - Google Sheets tracks all changes
✅ **Mobile Access** - Works on phone/tablet
✅ **Offline Mode** - Can edit offline, syncs when online
✅ **Comments** - Can add comments for discussion
✅ **Notifications** - Email alerts for changes
✅ **Export Options** - CSV, Excel, PDF built-in
✅ **No Maintenance** - Google handles infrastructure
✅ **Instant Setup** - 30 minutes to deploy

## Next Steps

1. **Week 1**: Deploy basic sync
2. **Week 2**: Add bidirectional updates
3. **Week 3**: Create custom Google Apps Script tools
4. **Month 2**: Build advanced dashboard if needed