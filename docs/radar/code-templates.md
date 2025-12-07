# KINN-RADAR Implementation Code Templates

## 🚀 Ready-to-Deploy Code for MVP

### 1. Newsletter Inbound Handler (`/api/radar/inbound.js`)

```javascript
import { Redis } from '@upstash/redis';
import Groq from 'groq-sdk';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const groq = new Groq({
  apiKey: process.env.RADAR_GROQ_API_KEY,
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify Resend webhook signature
    const signature = req.headers['svix-signature'];
    if (signature !== process.env.RESEND_WEBHOOK_SECRET) {
      console.log('Invalid webhook signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { from, subject, html, text } = req.body;
    console.log(`[RADAR] Newsletter from ${from}: ${subject}`);

    // Extract events using Groq
    const events = await extractEventsWithGroq({
      from,
      subject,
      content: html || text
    });

    console.log(`[RADAR] Extracted ${events.length} events`);

    // Validate and store events
    let added = 0;
    for (const event of events) {
      // Validate FREE + TYROL criteria
      if (await validateEvent(event)) {
        // Check for duplicates
        const isDuplicate = await checkDuplicate(event);
        if (!isDuplicate) {
          await storeEvent(event);
          added++;
        }
      }
    }

    console.log(`[RADAR] Added ${added} new events`);
    return res.status(200).json({
      success: true,
      processed: events.length,
      added
    });

  } catch (error) {
    console.error('[RADAR] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function extractEventsWithGroq({ from, subject, content }) {
  const prompt = `
Extract events from this newsletter that meet ALL these CRITICAL criteria:

MANDATORY FILTERS - Only include events that are:
1. **FREE** (kostenlos, gratis, no cost, 0€) - REJECT any event with price/fee/ticket
2. **Located in TYROL** (Innsbruck, Hall, Wattens, Kufstein, etc.) - REJECT Vienna/Salzburg/Munich
3. **AI/ML/Data related** - Must contain AI, KI, Machine Learning, Data Science keywords
4. **PUBLIC** (open registration) - REJECT internal/members-only/private events

Newsletter: ${subject}
From: ${from}

Content:
${content.substring(0, 30000)}

For each QUALIFYING event (FREE + TYROL + AI), extract as JSON:
- title: Event name
- date: ISO date (YYYY-MM-DD)
- time: HH:MM
- location: Venue name
- city: City in Tyrol
- description: Brief description
- registrationUrl: Link to register
- tags: Array of relevant tags

Return ONLY JSON array, empty array if no qualifying events.`;

  try {
    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return Array.isArray(result) ? result : result.events || [];
  } catch (error) {
    console.error('Groq extraction error:', error);
    return [];
  }
}

async function validateEvent(event) {
  // Check FREE criteria
  const eventText = `${event.title} ${event.description}`.toLowerCase();

  const costIndicators = ['€', 'eur', 'price', 'ticket', 'fee', 'gebühr'];
  const freeIndicators = ['kostenlos', 'gratis', 'free', '0€'];

  const hasCost = costIndicators.some(term => eventText.includes(term));
  const isFree = freeIndicators.some(term => eventText.includes(term));

  if (hasCost && !isFree) return false;

  // Check TYROL criteria
  const tyrolCities = ['innsbruck', 'hall', 'wattens', 'kufstein', 'wörgl', 'schwaz'];
  const location = `${event.location} ${event.city}`.toLowerCase();

  const inTyrol = tyrolCities.some(city => location.includes(city));
  if (!inTyrol) return false;

  // Check AI/ML criteria
  const aiKeywords = ['ai', 'ki', 'machine learning', 'ml', 'data science', 'llm', 'neural'];
  const hasAI = aiKeywords.some(keyword => eventText.includes(keyword));

  return hasAI;
}

async function checkDuplicate(event) {
  // Simple duplicate check - can be enhanced
  const key = `${event.title}-${event.date}`.toLowerCase().replace(/\s+/g, '-');
  const exists = await redis.get(`radar:event:${key}`);
  return !!exists;
}

async function storeEvent(event) {
  const eventId = `${event.title}-${event.date}`.toLowerCase().replace(/\s+/g, '-');

  await redis.hset(`radar:event:${eventId}`, {
    ...event,
    id: eventId,
    createdAt: new Date().toISOString(),
    source: 'newsletter'
  });

  // Add to date index
  await redis.sadd(`radar:events:${event.date}`, eventId);

  // Add to all events
  await redis.sadd('radar:events', eventId);

  // Update metrics
  await redis.incr('radar:metrics:events:total');
}
```

### 2. ICS Calendar Generator (`/api/radar/calendar.ics.js`)

```javascript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  try {
    // Get all events
    const eventIds = await redis.smembers('radar:events');
    const events = [];

    for (const eventId of eventIds) {
      const event = await redis.hgetall(`radar:event:${eventId}`);
      if (event && new Date(event.date) >= new Date()) {
        events.push(event);
      }
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Generate ICS
    const ics = generateICS(events);

    // Set headers
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="kinn-radar.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    return res.status(200).send(ics);
  } catch (error) {
    console.error('ICS generation error:', error);
    return res.status(500).send('Error generating calendar');
  }
}

function generateICS(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KINN//RADAR//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:KINN-RADAR - Free AI Events Tyrol',
    'X-WR-CALDESC:Every FREE AI Event in Tyrol - Auto-Updated',
    'X-WR-TIMEZONE:Europe/Vienna'
  ];

  for (const event of events) {
    const dtstart = formatDate(event.date, event.time);
    const dtend = formatDate(event.date, event.endTime || addHours(event.time, 2));

    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@radar.kinn.at`,
      `DTSTART;TZID=Europe/Vienna:${dtstart}`,
      `DTEND;TZID=Europe/Vienna:${dtend}`,
      `SUMMARY:🤖 ${event.title}`,
      `DESCRIPTION:${event.description || ''}\\n\\n` +
        `📍 Location: ${event.location}\\n` +
        `🏢 City: ${event.city}\\n` +
        `🔗 Register: ${event.registrationUrl || 'Check KINN website'}\\n` +
        `🏷️ Tags: ${(event.tags || []).join(', ')}\\n\\n` +
        `FREE EVENT - Part of KINN-RADAR`,
      `LOCATION:${event.location}, ${event.city}`,
      `CATEGORIES:${(event.tags || ['AI']).join(',')}`,
      `STATUS:CONFIRMED`,
      `TRANSP:OPAQUE`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\\r\\n');
}

function formatDate(date, time) {
  const d = new Date(date);
  const [hours, minutes] = (time || '18:00').split(':');

  d.setHours(parseInt(hours), parseInt(minutes), 0);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}T${hour}${min}00`;
}

function addHours(time, hours) {
  const [h, m] = time.split(':').map(Number);
  return `${(h + hours).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
```

### 3. Google Sheets Sync (`/api/radar/sheets-sync.js`)

```javascript
import { google } from 'googleapis';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const SHEET_ID = process.env.RADAR_GOOGLE_SHEET_ID;

// Initialize Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

export default async function handler(req, res) {
  // Simple auth check for manual trigger
  if (req.method === 'GET' && req.headers.authorization !== `Bearer ${process.env.ADMIN_SYNC_TOKEN}`) {
    // Allow cron job (no auth header)
    if (!req.headers['user-agent']?.includes('vercel-cron')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    console.log('[SHEETS] Starting sync...');

    // Get all events
    const eventIds = await redis.smembers('radar:events');
    const events = [];

    for (const eventId of eventIds) {
      const event = await redis.hgetall(`radar:event:${eventId}`);
      if (event) {
        events.push(event);
      }
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Prepare rows
    const headers = [
      'ID', 'Status', 'Title', 'Date', 'Time', 'Location', 'City',
      'Description', 'Registration URL', 'Tags', 'Source', 'Added'
    ];

    const rows = events.map(event => [
      event.id,
      new Date(event.date) >= new Date() ? '🟢' : '⚫',
      event.title,
      event.date,
      event.time || '',
      event.location || '',
      event.city || '',
      event.description || '',
      event.registrationUrl || '',
      (event.tags || []).join(', '),
      event.source || 'newsletter',
      event.createdAt || ''
    ]);

    // Clear and update sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: 'Active Events!A:L'
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Active Events!A1',
      valueInputOption: 'RAW',
      resource: {
        values: [headers, ...rows]
      }
    });

    // Update stats
    await updateStatistics(events.length);

    console.log(`[SHEETS] Synced ${events.length} events`);

    // Store last sync time
    await redis.set('radar:sheets:last-sync', new Date().toISOString());

    return res.json({
      success: true,
      synced: events.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SHEETS] Sync error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function updateStatistics(totalEvents) {
  const stats = [
    ['Metric', 'Value', 'Last Updated'],
    ['Total Events', totalEvents, new Date().toISOString()],
    ['Active Events', totalEvents, new Date().toISOString()],
    ['Last Sync', 'Success', new Date().toISOString()],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Statistics!A1',
    valueInputOption: 'RAW',
    resource: { values: stats }
  });
}
```

### 4. Health Check (`/api/radar/health.js`)

```javascript
import { Redis } from '@upstash/redis';
import Groq from 'groq-sdk';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  const health = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Check Redis
    await redis.ping();
    health.checks.redis = 'ok';

    // Check events count
    const eventCount = await redis.scard('radar:events');
    health.checks.events = eventCount;

    // Check last sync
    const lastSync = await redis.get('radar:sheets:last-sync');
    health.checks.lastSync = lastSync || 'never';

    // Check Groq (optional - don't waste credits)
    health.checks.groq = 'configured';

    // Overall status
    health.status = eventCount > 0 ? 'healthy' : 'degraded';

    return res.json(health);

  } catch (error) {
    health.status = 'error';
    health.error = error.message;
    return res.status(500).json(health);
  }
}
```

### 5. Vercel Configuration (`vercel.json`)

```json
{
  "functions": {
    "api/radar/*.js": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/radar/sheets-sync",
      "schedule": "0 */6 * * *"
    }
  ],
  "headers": [
    {
      "source": "/api/radar/calendar.ics",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=3600, stale-while-revalidate"
        }
      ]
    }
  ]
}
```

### 6. Package.json Dependencies

```json
{
  "dependencies": {
    "@upstash/redis": "^1.35.6",
    "groq-sdk": "^0.7.0",
    "googleapis": "^118.0.0",
    "google-auth-library": "^9.0.0"
  }
}
```

### 7. Test Script (`test-radar.js`)

```javascript
// Local test script
import dotenv from 'dotenv';
dotenv.config();

// Test newsletter processing
async function testNewsletter() {
  const testEmail = {
    from: 'newsletter@startup.tirol',
    subject: 'Tech Events This Week',
    html: `
      <h2>Upcoming Events</h2>
      <h3>FREE AI Workshop Innsbruck</h3>
      <p>Date: 20.01.2025, 18:00</p>
      <p>Location: Werkstätte Wattens</p>
      <p>Learn about Machine Learning basics - kostenlos!</p>

      <h3>Premium Data Science Course Vienna</h3>
      <p>Price: €299</p>
      <p>Location: Vienna</p>
      <p>Not relevant - paid and outside Tyrol</p>
    `
  };

  const response = await fetch('http://localhost:3000/api/radar/inbound', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'svix-signature': process.env.RESEND_WEBHOOK_SECRET
    },
    body: JSON.stringify(testEmail)
  });

  console.log('Newsletter test:', await response.json());
}

// Test ICS generation
async function testICS() {
  const response = await fetch('http://localhost:3000/api/radar/calendar.ics');
  const ics = await response.text();
  console.log('ICS test:', ics.substring(0, 500));
}

// Run tests
testNewsletter();
testICS();
```

## 🚀 Quick Deployment Steps

```bash
# 1. Add all files to /mvp/api/radar/
mkdir -p mvp/api/radar
cp inbound.js mvp/api/radar/
cp calendar.ics.js mvp/api/radar/
cp sheets-sync.js mvp/api/radar/
cp health.js mvp/api/radar/

# 2. Install dependencies
cd mvp
npm install @upstash/redis groq-sdk googleapis google-auth-library

# 3. Set environment variables in Vercel
vercel env add RADAR_GROQ_API_KEY
vercel env add RESEND_WEBHOOK_SECRET
vercel env add RADAR_GOOGLE_SHEET_ID
vercel env add GOOGLE_SERVICE_ACCOUNT_KEY
vercel env add ADMIN_SYNC_TOKEN

# 4. Deploy
vercel --prod

# 5. Configure Resend webhook
# Go to Resend Dashboard
# Set webhook URL: https://kinn.at/api/radar/inbound

# 6. Test
curl https://kinn.at/api/radar/health
curl https://kinn.at/api/radar/calendar.ics
```

## 🎯 MVP Complete!

With these 4 files deployed, you have:
- ✅ Newsletter processing with Groq
- ✅ FREE + TYROL filtering
- ✅ ICS calendar generation
- ✅ Google Sheets sync
- ✅ Health monitoring

Total setup time: **~2 hours**
Total code: **~400 lines**
Monthly cost: **€0**

The system is ready to process newsletters and deliver **"Every FREE AI Event in Tyrol"** via a single ICS subscription!