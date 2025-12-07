import { createClient } from '@vercel/kv';
import Groq from 'groq-sdk';

// Use KINNST_ prefixed environment variables
const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

const groq = new Groq({
  apiKey: process.env.RADAR_GROQ_API_KEY,
});

// Start with ONE site to prove it works
const SITES = [
  {
    name: 'UniInnsbruck',
    url: 'https://www.uibk.ac.at/events/',
    description: 'University of Innsbruck events'
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
    console.log('[RADAR-SITES] Starting site check...');
    const allEvents = [];

    for (const site of SITES) {
      console.log(`[RADAR-SITES] Checking ${site.name}...`);

      // Fetch the HTML
      const response = await fetch(site.url);
      if (!response.ok) {
        console.error(`[RADAR-SITES] Failed to fetch ${site.name}: ${response.status}`);
        continue;
      }

      const html = await response.text();
      console.log(`[RADAR-SITES] Fetched ${html.length} chars from ${site.name}`);

      // Extract events using Groq
      const events = await extractEventsFromHTML(html, site.url, site.name);
      console.log(`[RADAR-SITES] Found ${events.length} events from ${site.name}`);

      allEvents.push(...events);
    }

    // Store events in Redis (with deduplication)
    let added = 0;
    let duplicates = 0;

    for (const event of allEvents) {
      const isDuplicate = await checkDuplicate(event);
      if (!isDuplicate) {
        await storeEvent(event, 'web-scrape');
        added++;
      } else {
        duplicates++;
      }
    }

    console.log(`[RADAR-SITES] Complete: ${added} added, ${duplicates} duplicates`);

    return res.status(200).json({
      success: true,
      sites_checked: SITES.length,
      events_found: allEvents.length,
      events_added: added,
      duplicates: duplicates,
      events: allEvents // Return for debugging
    });

  } catch (error) {
    console.error('[RADAR-SITES] Error:', error);
    return res.status(500).json({
      error: 'Site checking failed',
      message: error.message
    });
  }
}

async function extractEventsFromHTML(html, url, siteName) {
  const prompt = `
You are extracting events from a website HTML. This is from ${siteName} (${url}).

Extract ALL events that meet these criteria:
1. FREE (kostenlos, gratis, no cost, Eintritt frei) - REJECT if any price mentioned
2. Located in TYROL (Innsbruck, Hall, Wattens, Kufstein, etc.) - REJECT if outside Tyrol
3. PUBLIC (open registration) - REJECT if members-only

HTML Content (first 20000 chars):
${html.substring(0, 20000)}

For each qualifying FREE event in TYROL, extract:
{
  "title": "Event name",
  "date": "YYYY-MM-DD",
  "time": "HH:MM (24h) or 18:00 if not specified",
  "location": "Venue name",
  "city": "City in Tyrol",
  "category": "AI" | "Tech" | "Startup" | "Innovation" | "Business" | "Education" | "Other",
  "description": "Brief description (max 200 chars)",
  "registrationUrl": "URL if found"
}

Categories:
- "AI": AI, KI, Machine Learning, Data Science, ChatGPT
- "Tech": Programming, Software, IT, Coding
- "Startup": Gründung, Founder, Pitch, Entrepreneur
- "Innovation": Digital Transformation, Future Tech
- "Business": Marketing, Sales, Management, Networking
- "Education": Workshop, Training, Course, Seminar
- "Other": Everything else

Important:
- Look for event listings, calendars, date sections
- Common patterns: <div class="event">, <article>, <li> with dates
- University events are often FREE even if not explicitly stated
- Convert German dates (15. Dezember 2025) to YYYY-MM-DD
- Default to Innsbruck if city not specified

Return as JSON object:
{"events": [...array of events...]}`;

  try {
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{
        role: "user",
        content: prompt
      }],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"events":[]}');
    return result.events || [];

  } catch (error) {
    console.error('[RADAR-SITES] Groq extraction error:', error);
    return [];
  }
}

async function checkDuplicate(event) {
  const location = event.location || event.city || 'unknown';
  const eventKey = `${event.title}-${event.date}-${location}`.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const exists = await kv.exists(`radar:event:${eventKey}`);
  return exists;
}

async function storeEvent(event, source) {
  const location = event.location || event.city || 'unknown';
  const eventId = `${event.title}-${event.date}-${location}`.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const eventData = {
    id: eventId,
    ...event,
    source: source,
    createdAt: new Date().toISOString(),
    reviewed: false
  };

  await kv.hset(`radar:event:${eventId}`, eventData);
  await kv.sadd('radar:events', eventId);
  await kv.sadd(`radar:events:by-date:${event.date}`, eventId);
  await kv.incr('radar:metrics:total');

  return eventId;
}