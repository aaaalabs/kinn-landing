import { createClient } from '@vercel/kv';
import Groq from 'groq-sdk';
import logger from '../../lib/logger.js';

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
 * POST /api/radar/enrich-event
 * Enriches an existing event by scraping its detail page
 * Body: { eventId: string }
 */
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
  if (!authHeader?.startsWith('Bearer ') || authHeader.substring(7) !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { eventId } = req.body;
  if (!eventId) {
    return res.status(400).json({ error: 'eventId required' });
  }

  try {
    // Get existing event
    const event = await kv.hgetall(`radar:event:${eventId}`);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const detailUrl = event.detailUrl || event.registrationUrl;
    if (!detailUrl) {
      return res.status(400).json({ error: 'No detail URL available for this event' });
    }

    logger.debug(`[ENRICH] Scraping ${detailUrl} for event "${event.title}"`);

    // Scrape detail page
    const scrapeResult = await scrapeWithFirecrawl(detailUrl);
    if (!scrapeResult.success || !scrapeResult.markdown) {
      return res.status(422).json({ error: 'Failed to scrape detail page' });
    }

    // Extract details with AI
    const enrichedData = await extractDetailsWithAI(scrapeResult.markdown, event);

    if (!enrichedData || Object.keys(enrichedData).length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Keine neuen Daten gefunden',
        updated: {}
      });
    }

    // Update event in Redis
    await kv.hset(`radar:event:${eventId}`, enrichedData);

    logger.debug(`[ENRICH] Updated event ${eventId}:`, enrichedData);

    return res.status(200).json({
      success: true,
      message: 'Event-Daten ergänzt',
      updated: enrichedData
    });

  } catch (error) {
    logger.error('[ENRICH] Error:', error);
    return res.status(500).json({ error: 'Enrichment failed', hint: error.message });
  }
}

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
      waitFor: 2000,
      onlyMainContent: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Scrape failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    success: data.success,
    markdown: data.data?.markdown || '',
  };
}

async function extractDetailsWithAI(content, existingEvent) {
  const prompt = `Extract event details from this page for: "${existingEvent.title}" on ${existingEvent.date}

CURRENT DATA:
- Location: ${existingEvent.location || 'Unknown'}
- City: ${existingEvent.city || 'Unknown'}
- Time: ${existingEvent.time || 'Unknown'}
- Description: ${existingEvent.description || 'None'}

PAGE CONTENT:
${content.slice(0, 10000)}

Extract ONLY fields that improve on "Unknown", "TBD", "None", or are empty.
Return JSON with only the fields you found better data for:

{
  "location": "Full venue name and address",
  "city": "City name",
  "time": "HH:MM format (24h)",
  "endTime": "HH:MM format if found",
  "description": "Better description (max 200 chars)",
  "thumbnail": "Image URL (og:image or event banner)"
}

Rules:
- Only include fields where you found BETTER data than current
- Skip fields where current data is already good
- Return {} if no improvements found`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "Extract event details. Return valid JSON only." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 500,
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(response.choices[0]?.message?.content || '{}');

  // Filter out empty/null values and values that don't improve
  const dominated = ['unknown', 'tbd', 'tba', 'none', 'n/a', ''];
  const dominated_check = (val) => !val || dominated.includes(val.toLowerCase());

  const updates = {};

  for (const [key, value] of Object.entries(result)) {
    if (!value) continue;

    const currentVal = existingEvent[key];
    // Only update if current is empty/unknown and new value is meaningful
    if (dominated_check(currentVal) && !dominated_check(value)) {
      updates[key] = value;
    }
  }

  return updates;
}
