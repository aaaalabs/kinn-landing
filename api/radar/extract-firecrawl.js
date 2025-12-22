import { createClient } from '@vercel/kv';
import Groq from 'groq-sdk';
import logger from '../../lib/logger.js';
import { createPendingEvent } from '../../lib/radar-status.js';

// Use KINNST_ prefixed environment variables
const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

const groq = new Groq({
  apiKey: process.env.RADAR_GROQ_API_KEY,
});

// Firecrawl API configuration
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_WAIT_MS = parseInt(process.env.FIRECRAWL_WAIT_MS || '3000', 10);

/**
 * Scrapes a webpage using Firecrawl API (handles JavaScript rendering)
 */
async function scrapeWithFirecrawl(url, waitTime = FIRECRAWL_WAIT_MS) {
  if (!FIRECRAWL_API_KEY) {
    throw new Error('FIRECRAWL_API_KEY not configured');
  }

  try {
    const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['html', 'markdown'],
        waitFor: waitTime, // Wait for JS to load
        onlyMainContent: false, // Get full page
        includeTags: ['article', 'div', 'section', 'main', 'h1', 'h2', 'h3', 'p', 'span', 'table', 'a']
        // Note: removeSelectors not supported in Firecrawl v2
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('[FIRECRAWL] API Error:', error);
      throw new Error(`Firecrawl API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: data.success,
      html: data.data?.html || '',
      markdown: data.data?.markdown || '',
      metadata: data.data?.metadata || {},
    };
  } catch (error) {
    logger.error('[FIRECRAWL] Scraping error:', error);
    throw error;
  }
}

/**
 * Get extraction patterns from source configs
 */
async function getExtractionPatterns(sourceName) {
  try {
    const { SOURCE_CONFIGS } = await import('./source-configs.js');
    const sourceConfig = SOURCE_CONFIGS[sourceName];

    if (!sourceConfig) {
      return null;
    }

    return {
      url: sourceConfig.extraction.searchUrl || sourceConfig.url, // Use searchUrl if available (e.g., WKO with ?bundesland=T)
      method: sourceConfig.extraction.method,
      htmlPattern: sourceConfig.extraction.htmlPattern || '',
      dateFormat: sourceConfig.extraction.dateFormat || '',
      instructions: sourceConfig.extraction.instructions || '',
      extractNotes: sourceConfig.extraction.extractNotes || '',
      requiresJS: sourceConfig.extraction.requiresJS || false,
    };
  } catch (error) {
    logger.error('[EXTRACT-FIRECRAWL] Could not load source configs:', error);
    return null;
  }
}

/**
 * Extract events using Groq AI
 */
async function extractEventsWithAI(content, sourceName, patterns) {
  const prompt = `
You are extracting FREE events from ${sourceName}.
URL: ${patterns.url}

EXTRACTION PATTERNS:
${patterns.instructions}

${patterns.htmlPattern ? `HTML SELECTOR: ${patterns.htmlPattern}` : ''}
${patterns.dateFormat ? `DATE FORMAT: ${patterns.dateFormat}` : ''}
${patterns.extractNotes ? `SPECIAL NOTES: ${patterns.extractNotes}` : ''}

RULES:
1. Extract ALL events that are FREE ("kostenlos", "gratis", no price mentioned)
2. SKIP events with prices ("siehe Website", "€XX", etc.)
3. Convert dates to YYYY-MM-DD format
4. Use 24-hour time format (HH:MM)
5. Default time to 18:00 if not specified
6. Default city to "Innsbruck" if in Tirol but not specified

CATEGORIZATION RULES:
- If title or description contains "AI", "KI", "Artificial Intelligence", "Künstliche Intelligenz", "Machine Learning", "Deep Learning", "GPT", "LLM" → category: "AI"
- Otherwise use: "Startup", "Workshop", "Networking", "Tech", "Innovation", or "Other" based on event type

CONTENT TO ANALYZE:
${content}

Return a JSON object with an "events" array:
{
  "events": [
    {
      "title": "Event name",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "location": "Venue name",
      "city": "City name",
      "category": "AI|Startup|Workshop|Networking|Tech|Innovation|Other",
      "description": "Brief description (max 200 chars)",
      "registrationUrl": "Direct registration/ticket URL if available",
      "detailUrl": "URL to event detail page (IMPORTANT - always include!)"
    }
  ]
}

IMPORTANT: Only include events that are explicitly FREE or have "kostenlos" as price!`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "system",
        content: "You extract event information from web content. Only extract FREE events."
      }, {
        role: "user",
        content: prompt
      }],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"events":[]}');

    // Validate events
    const validEvents = (result.events || []).filter(event => {
      if (!event.title || !event.date) return false;

      // Parse and validate date
      const eventDate = new Date(event.date);
      const now = new Date();
      const oneYearFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
      const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

      return eventDate >= threeMonthsAgo && eventDate <= oneYearFromNow;
    });

    return validEvents;
  } catch (error) {
    logger.error(`[EXTRACT-FIRECRAWL] AI error for ${sourceName}:`, error);
    return [];
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
    const { sourceName, testMode = false } = req.method === 'GET' ? req.query : req.body;

    if (!sourceName) {
      return res.status(400).json({
        error: 'sourceName required'
      });
    }

    if (!FIRECRAWL_API_KEY) {
      return res.status(400).json({
        error: 'FIRECRAWL_API_KEY not configured',
        hint: 'Please add FIRECRAWL_API_KEY to environment variables'
      });
    }

    logger.debug(`[EXTRACT-FIRECRAWL] Processing ${sourceName} with JavaScript rendering`);

    // Get extraction patterns
    const patterns = await getExtractionPatterns(sourceName);

    if (!patterns) {
      return res.status(404).json({
        error: `Source "${sourceName}" not found in configurations`
      });
    }

    // Check if source actually needs JavaScript
    if (!patterns.requiresJS) {
      logger.warn(`[EXTRACT-FIRECRAWL] ${sourceName} doesn't require JS, consider using regular extraction`);
    }

    // Scrape with Firecrawl (JavaScript rendering)
    logger.debug(`[EXTRACT-FIRECRAWL] Scraping ${patterns.url} with Firecrawl...`);
    const scrapeResult = await scrapeWithFirecrawl(patterns.url);

    if (!scrapeResult.success) {
      return res.status(200).json({
        success: false,
        source: sourceName,
        error: 'Firecrawl scraping failed',
        events: []
      });
    }

    const contentLength = scrapeResult.html.length;
    logger.debug(`[EXTRACT-FIRECRAWL] Scraped ${contentLength} chars of rendered HTML`);

    // Use markdown for AI extraction (cleaner than HTML)
    const content = scrapeResult.markdown || scrapeResult.html;

    // Extract events using AI
    const events = await extractEventsWithAI(content, sourceName, patterns);
    logger.debug(`[EXTRACT-FIRECRAWL] Found ${events.length} events from ${sourceName}`);

    // In test mode, return detailed info
    if (testMode) {
      return res.status(200).json({
        success: true,
        source: sourceName,
        testMode: true,
        scrapeMethod: 'firecrawl',
        contentLength: contentLength,
        patterns: {
          htmlPattern: patterns.htmlPattern || 'none',
          dateFormat: patterns.dateFormat || 'none',
          extractNotes: patterns.extractNotes || 'none'
        },
        events_found: events.length,
        events: events
      });
    }

    // Store events in production mode
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
      method: 'firecrawl',
      events_found: events.length,
      events_added: added,
      duplicates: duplicates,
      events: events.slice(0, 5) // Preview
    });

  } catch (error) {
    logger.error(`[EXTRACT-FIRECRAWL] Error:`, error);

    // Track error for source health
    const { sourceName } = req.method === 'GET' ? req.query : req.body;
    if (sourceName) {
      await trackSourceError(sourceName, error);
    }

    return res.status(500).json({
      error: 'Extraction failed',
      message: error.message
    });
  }
}

async function checkDuplicate(event) {
  // Create event key matching storeEvent logic: title-date-location
  const location = event.location || event.city || 'unknown';
  const eventKey = `${event.title}-${event.date}-${location}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  // Simple key-based check (O(1) vs O(n) loop)
  const exists = await kv.exists(`radar:event:${eventKey}`);

  if (exists) {
    logger.debug(`[DUPLICATE] Event exists: "${event.title}" on ${event.date} at ${location}`);
  }

  return exists;
}

async function storeEvent(event, source) {
  // Use title-date-location for ID (consistent with checkDuplicate and inbound.js)
  const location = event.location || event.city || 'unknown';
  const eventId = `${event.title}-${event.date}-${location}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  // Use new schema with status field
  const eventData = createPendingEvent({
    id: eventId,
    ...event,
    source: source,
    location: event.location || event.city || 'unknown' // Store location in data
  });

  await kv.hset(`radar:event:${eventId}`, eventData);
  await kv.sadd('radar:events', eventId);
  await kv.sadd(`radar:events:by-date:${event.date}`, eventId);

  return eventId;
}

async function updateSourceMetrics(sourceName, found, added) {
  const normalizedName = sourceName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const metricsKey = `radar:metrics:source:${normalizedName}`;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const now = new Date().toISOString();

  // Source-specific metrics
  await kv.hincrby(metricsKey, 'eventsFound', found);
  await kv.hincrby(metricsKey, 'eventsAdded', added);
  await kv.hset(metricsKey, 'lastSuccess', now);

  // Source health tracking (for source-health.js)
  await kv.set(`radar:source:${normalizedName}:lastSuccess`, now);
  await kv.del(`radar:source:${normalizedName}:lastError`); // Clear error on success
  await kv.incrby(`radar:source:${normalizedName}:events7d`, found);
  await kv.expire(`radar:source:${normalizedName}:events7d`, 7 * 24 * 60 * 60); // 7 day TTL

  // Daily metrics (for trends)
  await kv.hincrby(`radar:metrics:daily:${today}`, 'found', found);
  await kv.hincrby(`radar:metrics:daily:${today}`, 'added', added);

  // Global metrics
  await kv.hincrby('radar:metrics:global', 'totalFound', found);
  await kv.hincrby('radar:metrics:global', 'totalAdded', added);
  await kv.hset('radar:metrics:global', 'lastRun', now);
}

// Track extraction errors for source health
async function trackSourceError(sourceName, error) {
  const normalizedName = sourceName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  await kv.set(`radar:source:${normalizedName}:lastError`, error.message || 'Unknown error');
}