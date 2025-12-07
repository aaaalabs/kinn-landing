import { createClient } from '@vercel/kv';
import Groq from 'groq-sdk';
import { SOURCE_CONFIGS, getSourceConfig } from './source-configs.js';

const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

const groq = new Groq({
  apiKey: process.env.RADAR_GROQ_API_KEY,
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { sourceName, testMode = false } = req.method === 'GET' ? req.query : req.body;

    if (!sourceName) {
      return res.status(400).json({
        error: 'sourceName required',
        availableSources: Object.keys(SOURCE_CONFIGS)
      });
    }

    const config = getSourceConfig(sourceName);
    if (!config) {
      return res.status(404).json({
        error: `Source "${sourceName}" not found`,
        availableSources: Object.keys(SOURCE_CONFIGS)
      });
    }

    console.log(`[EXTRACT] Processing ${sourceName} with method: ${config.extraction.method}`);

    // Fetch the webpage
    const url = config.extraction.searchUrl || config.url;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KINN-RADAR/1.0)',
        'Accept-Language': 'de-AT,de;q=0.9,en;q=0.8'
      }
    });

    if (!response.ok) {
      return res.status(200).json({
        success: false,
        source: sourceName,
        error: `HTTP ${response.status}`,
        events: []
      });
    }

    const html = await response.text();
    console.log(`[EXTRACT] Fetched ${html.length} chars from ${sourceName}`);

    // Extract events using source-specific instructions
    const events = await extractWithInstructions(html, sourceName, config);
    console.log(`[EXTRACT] Found ${events.length} events from ${sourceName}`);

    // In test mode, don't store
    if (testMode) {
      return res.status(200).json({
        success: true,
        source: sourceName,
        testMode: true,
        events_found: events.length,
        events: events
      });
    }

    // Store events
    let added = 0;
    let duplicates = 0;

    for (const event of events) {
      const isDuplicate = await checkDuplicate(event);
      if (!isDuplicate) {
        await storeEvent(event, sourceName);
        added++;
      } else {
        duplicates++;
      }
    }

    // Update source metrics
    await updateSourceMetrics(sourceName, events.length, added);

    return res.status(200).json({
      success: true,
      source: sourceName,
      url: url,
      events_found: events.length,
      events_added: added,
      duplicates: duplicates,
      events: events.slice(0, 5) // Return first 5 as preview
    });

  } catch (error) {
    console.error(`[EXTRACT] Error:`, error);
    return res.status(500).json({
      error: 'Extraction failed',
      message: error.message
    });
  }
}

async function extractWithInstructions(html, sourceName, config) {
  const { instructions, maxChars = 20000 } = config.extraction;

  // Clean HTML
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Truncate if needed
  if (cleaned.length > maxChars) {
    cleaned = cleaned.substring(0, maxChars) + '...[truncated]';
  }

  const prompt = `
You are extracting events from ${sourceName}.
URL: ${config.url}

SOURCE-SPECIFIC INSTRUCTIONS:
${instructions}

GENERAL RULES:
1. Extract ALL events mentioned
2. Convert dates to YYYY-MM-DD format
3. Use 24-hour time format (HH:MM)
4. Default time to 18:00 if not specified
5. Default city to "Innsbruck" if in Tirol but not specified
6. Assign appropriate category based on content

HTML CONTENT:
${cleaned}

Return a JSON object with an "events" array containing:
{
  "events": [
    {
      "title": "Event name",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "location": "Venue name",
      "city": "City name",
      "category": "AI|Tech|Startup|Innovation|Business|Education|Other",
      "description": "Brief description (max 200 chars)",
      "registrationUrl": "URL if available"
    }
  ]
}

IMPORTANT: Follow the source-specific instructions above carefully!`;

  try {
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b", // Using larger model for better compliance with instructions
      messages: [{
        role: "system",
        content: "You are an expert at extracting event information from HTML. Follow the given instructions precisely."
      }, {
        role: "user",
        content: prompt
      }],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"events":[]}');

    // Validate and clean events
    const validEvents = (result.events || []).filter(event => {
      if (!event.title || !event.date) return false;

      // Check date is reasonable (not too far in past or future)
      const eventDate = new Date(event.date);
      const now = new Date();
      const oneYearFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
      const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

      return eventDate >= threeMonthsAgo && eventDate <= oneYearFromNow;
    });

    return validEvents;

  } catch (error) {
    console.error(`[EXTRACT] AI error for ${sourceName}:`, error);
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

  return eventId;
}

async function updateSourceMetrics(sourceName, found, added) {
  const metricsKey = `radar:metrics:source:${sourceName.toLowerCase().replace(/\s+/g, '-')}`;

  await kv.hincrby(metricsKey, 'eventsFound', found);
  await kv.hincrby(metricsKey, 'eventsAdded', added);
  await kv.hset(metricsKey, 'lastSuccess', new Date().toISOString());

  // Update global metrics
  await kv.hincrby('radar:metrics:global', 'totalFound', found);
  await kv.hincrby('radar:metrics:global', 'totalAdded', added);
}