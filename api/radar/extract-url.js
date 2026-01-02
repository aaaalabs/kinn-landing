import { createClient } from '@vercel/kv';
import Groq from 'groq-sdk';
import logger from '../../lib/logger.js';
import { createPendingEvent } from '../../lib/radar-status.js';

const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

const groq = new Groq({
  apiKey: process.env.RADAR_GROQ_API_KEY,
});

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

/**
 * Scrapes a webpage using Firecrawl API
 */
async function scrapeWithFirecrawl(url) {
  const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url,
      formats: ['markdown'],
      waitFor: 3000,
      onlyMainContent: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('[EXTRACT-URL] Firecrawl error:', error);
    throw new Error(`Scrape failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    success: data.success,
    markdown: data.data?.markdown || '',
    metadata: data.data?.metadata || {},
  };
}

/**
 * Extract single event from page content using Groq
 */
async function extractEventWithAI(content, sourceUrl) {
  const prompt = `Extract a SINGLE event from this webpage.

URL: ${sourceUrl}

CONTENT:
${content.slice(0, 12000)}

RULES:
1. Extract exactly ONE event (the main/primary one)
2. Dates in YYYY-MM-DD format
3. Times in HH:MM 24-hour format
4. Default time to 18:00 if not specified
5. Default city to "Innsbruck" if in Tirol but unspecified

CATEGORIES:
- "AI" = AI/ML/KI/LLM/Data Science
- "Tech" = Programming/Software/DevOps
- "Startup" = Entrepreneurship/Founding/Pitch
- "Workshop" = Hands-on learning
- "Networking" = Social/Meetup
- "Other" = None of above

Return JSON:
{
  "event": {
    "title": "Event name",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "endTime": "HH:MM or null",
    "location": "Venue name",
    "city": "City",
    "category": "AI|Tech|Startup|Workshop|Networking|Other",
    "description": "Brief description (max 200 chars)",
    "registrationUrl": "Registration URL if different",
    "isFree": true or false,
    "thumbnail": "Image URL if found"
  }
}

If NO event found: {"event": null, "reason": "explanation"}`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "Extract event details from webpage content. Return valid JSON only." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 1000,
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(response.choices[0]?.message?.content || '{}');
  return result;
}

/**
 * Store event in Redis
 */
async function storeManualEvent(event, sourceUrl) {
  const location = event.location || event.city || 'unknown';
  const eventId = `${event.title}-${event.date}-${location}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  // Check duplicate
  const exists = await kv.exists(`radar:event:${eventId}`);
  if (exists) {
    return { eventId, duplicate: true };
  }

  const eventData = createPendingEvent({
    id: eventId,
    title: event.title,
    date: event.date,
    time: event.time || '18:00',
    endTime: event.endTime || null,
    location: event.location || event.city || 'TBD',
    city: event.city || 'Innsbruck',
    category: event.category || 'Other',
    description: event.description || '',
    detailUrl: sourceUrl,
    registrationUrl: event.registrationUrl || sourceUrl,
    thumbnail: event.thumbnail || null,
    isFree: event.isFree !== false,
    source: 'Manual',
    sourceUrl: sourceUrl,
  });

  await kv.hset(`radar:event:${eventId}`, eventData);
  await kv.sadd('radar:events', eventId);
  await kv.sadd(`radar:events:by-date:${event.date}`, eventId);

  logger.debug(`[EXTRACT-URL] Stored manual event: ${eventId}`);
  return { eventId, duplicate: false };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.substring(7);
  if (token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate request
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  if (!FIRECRAWL_API_KEY) {
    return res.status(500).json({ error: 'FIRECRAWL_API_KEY not configured' });
  }

  try {
    logger.debug(`[EXTRACT-URL] Processing: ${url}`);

    // 1. Scrape
    const scrapeResult = await scrapeWithFirecrawl(url);
    if (!scrapeResult.success || !scrapeResult.markdown) {
      return res.status(422).json({
        error: 'Scrape failed',
        hint: 'Page might be blocked or unreachable'
      });
    }

    logger.debug(`[EXTRACT-URL] Scraped ${scrapeResult.markdown.length} chars`);

    // 2. Extract with AI
    const result = await extractEventWithAI(scrapeResult.markdown, url);

    if (!result.event) {
      return res.status(422).json({
        error: 'No event found',
        hint: result.reason || 'Page might not contain event information'
      });
    }

    // Validate required fields
    if (!result.event.title || !result.event.date) {
      return res.status(422).json({
        error: 'Incomplete event data',
        hint: 'Could not extract title or date'
      });
    }

    // 3. Store
    const { eventId, duplicate } = await storeManualEvent(result.event, url);

    if (duplicate) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        event: { ...result.event, id: eventId },
        message: 'Event existiert bereits'
      });
    }

    return res.status(200).json({
      success: true,
      event: { ...result.event, id: eventId },
      message: 'Event zur Review hinzugefügt'
    });

  } catch (error) {
    logger.error('[EXTRACT-URL] Error:', error);
    return res.status(500).json({
      error: 'Extraction failed',
      hint: error.message
    });
  }
}
