import { createClient } from '@vercel/kv';
import Groq from 'groq-sdk';
import logger from '../../lib/logger.js';

// Use KINNST_ prefixed environment variables
const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

const groq = new Groq({
  apiKey: process.env.RADAR_GROQ_API_KEY,
});

// Site-specific configurations
const SITE_CONFIGS = {
  'wko.at': {
    searchParams: '?bundesland=T', // T for Tirol
    apiEndpoint: '/api/veranstaltungen',
    method: 'dynamic'
  },
  'inncubator.at': {
    searchParams: '',
    directUrl: 'https://www.inncubator.at/events/',
    method: 'static'
  },
  'startup.tirol': {
    searchParams: '',
    apiEndpoint: '/wp-json/tribe/events/v1/events',
    method: 'wordpress-api'
  },
  'aiaustria.com': {
    searchParams: '',
    method: 'calendar-plugin'
  },
  'standort-tirol.at': {
    searchParams: '?region=tirol',
    method: 'dynamic'
  }
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    logger.debug('[RADAR-ADV] Advanced site checking...');

    const allEvents = [];
    const results = {
      tested: [],
      successful: [],
      failed: []
    };

    // Test each configured site
    for (const [domain, config] of Object.entries(SITE_CONFIGS)) {
      logger.debug(`[RADAR-ADV] Testing ${domain} with method: ${config.method}`);

      try {
        let events = [];

        // Try different extraction methods based on site
        switch (config.method) {
          case 'wordpress-api':
            events = await extractFromWordPressAPI(domain, config);
            break;

          case 'dynamic':
            events = await extractWithSearchParams(domain, config);
            break;

          case 'calendar-plugin':
            events = await extractFromCalendarPlugin(domain, config);
            break;

          default:
            events = await extractStandard(domain, config);
        }

        if (events.length > 0) {
          results.successful.push({ site: domain, events: events.length });
          allEvents.push(...events);
        } else {
          results.failed.push({ site: domain, reason: 'No events found' });
        }

      } catch (error) {
        logger.error(`[RADAR-ADV] Error with ${domain}:`, error);
        results.failed.push({ site: domain, error: error.message });
      }

      results.tested.push(domain);
    }

    // Store events in Redis
    let added = 0;
    let duplicates = 0;

    for (const event of allEvents) {
      const isDuplicate = await checkDuplicate(event);
      if (!isDuplicate) {
        await storeEvent(event, 'web-advanced');
        added++;
      } else {
        duplicates++;
      }
    }

    logger.debug(`[RADAR-ADV] Complete: ${added} added, ${duplicates} duplicates`);

    return res.status(200).json({
      success: true,
      results: results,
      events_found: allEvents.length,
      events_added: added,
      duplicates: duplicates,
      events: allEvents.slice(0, 10) // Return first 10 for preview
    });

  } catch (error) {
    logger.error('[RADAR-ADV] Error:', error);
    return res.status(500).json({
      error: 'Advanced check failed',
      message: error.message
    });
  }
}

// Method 1: WordPress REST API
async function extractFromWordPressAPI(domain, config) {
  if (!config.apiEndpoint) return [];

  try {
    const apiUrl = `https://${domain}${config.apiEndpoint}`;
    logger.debug(`[RADAR-ADV] Trying WordPress API: ${apiUrl}`);

    const response = await fetch(apiUrl);
    if (!response.ok) return [];

    const data = await response.json();

    // WordPress Tribe Events structure
    if (data.events && Array.isArray(data.events)) {
      return data.events.map(event => ({
        title: event.title,
        date: event.start_date?.split('T')[0],
        time: event.start_date?.split('T')[1]?.substring(0, 5) || '18:00',
        location: event.venue?.venue || 'TBA',
        city: event.venue?.city || 'Innsbruck',
        category: 'Event',
        description: event.excerpt?.substring(0, 200),
        registrationUrl: event.url
      }));
    }

    return [];
  } catch (error) {
    logger.error(`[RADAR-ADV] WordPress API error:`, error);
    return [];
  }
}

// Method 2: Add search params to URL
async function extractWithSearchParams(domain, config) {
  try {
    const url = `https://${domain}/veranstaltungen${config.searchParams || ''}`;
    logger.debug(`[RADAR-ADV] Fetching with params: ${url}`);

    const response = await fetch(url);
    if (!response.ok) return [];

    const html = await response.text();
    return await extractEventsFromHTML(html, url, domain);

  } catch (error) {
    logger.error(`[RADAR-ADV] Search params error:`, error);
    return [];
  }
}

// Method 3: Look for calendar plugins
async function extractFromCalendarPlugin(domain, config) {
  try {
    // Check for common calendar endpoints
    const endpoints = [
      '/events/feed',
      '/calendar/feed',
      '/events.json',
      '/?feed=calendar'
    ];

    for (const endpoint of endpoints) {
      try {
        const url = `https://${domain}${endpoint}`;
        const response = await fetch(url);

        if (response.ok) {
          const contentType = response.headers.get('content-type');

          if (contentType?.includes('json')) {
            const data = await response.json();
            // Parse JSON calendar data
            if (Array.isArray(data)) {
              return data.map(event => ({
                title: event.title || event.name,
                date: event.date || event.start,
                time: event.time || '18:00',
                location: event.location || event.venue,
                city: 'Innsbruck',
                category: 'Event',
                description: event.description?.substring(0, 200)
              }));
            }
          }
        }
      } catch (e) {
        // Try next endpoint
      }
    }

    // Fallback to standard extraction
    return extractStandard(domain, config);

  } catch (error) {
    logger.error(`[RADAR-ADV] Calendar plugin error:`, error);
    return [];
  }
}

// Method 4: Standard HTML extraction
async function extractStandard(domain, config) {
  try {
    const url = config.directUrl || `https://${domain}/events`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const html = await response.text();
    return await extractEventsFromHTML(html, url, domain);

  } catch (error) {
    logger.error(`[RADAR-ADV] Standard extraction error:`, error);
    return [];
  }
}

// Enhanced HTML extraction with better patterns
async function extractEventsFromHTML(html, url, siteName) {
  // Remove scripts and styles
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  const prompt = `
Extract ALL events from this HTML. Site: ${siteName}

RULES:
- Include ALL events, workshops, seminars
- If no price mentioned, INCLUDE IT (probably free)
- Must be in Tyrol or no location specified
- Look for ANY date format

HTML:
${cleaned.substring(0, 20000)}

Return JSON:
{"events": [{"title": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "location": "...", "city": "...", "category": "...", "description": "..."}]}`;

  try {
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b", // Using larger model for better extraction
      messages: [{
        role: "user",
        content: prompt
      }],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"events":[]}');
    return result.events || [];

  } catch (error) {
    logger.error('[RADAR-ADV] AI extraction error:', error);
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