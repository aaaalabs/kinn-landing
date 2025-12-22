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

// HIGH-VALUE sources for AI/Tech/Startup events in Tyrol
const PRIMARY_SITES = [
  {
    name: 'InnCubator',
    url: 'https://www.inncubator.at/events',
    description: 'Startup incubator events',
    priority: 'HIGH'
  },
  {
    name: 'StartupTirol',
    url: 'https://www.startup.tirol/events/',
    description: 'Startup ecosystem events',
    priority: 'HIGH'
  },
  {
    name: 'WKO',
    url: 'https://www.wko.at/veranstaltungen/start',
    description: 'Chamber of Commerce events',
    priority: 'HIGH'
  },
  {
    name: 'AIAustria',
    url: 'https://aiaustria.com/event-calendar',
    description: 'AI Austria events',
    priority: 'HIGH'
  },
  {
    name: 'StandortTirol',
    url: 'https://www.standort-tirol.at/veranstaltungen',
    description: 'Regional development agency',
    priority: 'HIGH'
  },
  {
    name: 'ImpactHub',
    url: 'https://tirol.impacthub.net/en/collection/?_sf_tag=upcoming-events',
    description: 'Impact Hub innovation events',
    priority: 'HIGH'
  }
];

// SECONDARY sources for broader coverage
const SECONDARY_SITES = [
  {
    name: 'UniInnsbruck',
    url: 'https://www.uibk.ac.at/events/',
    description: 'University events',
    priority: 'MEDIUM'
  },
  {
    name: 'LSZ',
    url: 'https://lsz.at/',
    description: 'Life Science Center',
    priority: 'MEDIUM'
  },
  {
    name: 'DasWundervoll',
    url: 'https://www.daswundervoll.at/en/about-wundervoll/events',
    description: 'Cultural venue events',
    priority: 'MEDIUM'
  },
  {
    name: 'WeLocally',
    url: 'https://innsbruck.welocally.at/region/treffen',
    description: 'Local meetup platform',
    priority: 'MEDIUM'
  },
  {
    name: 'DieBaeckerei',
    url: 'https://diebaeckerei.at/programm',
    description: 'Cultural center Innsbruck',
    priority: 'MEDIUM'
  },
  {
    name: 'Meetup',
    url: 'https://www.meetup.com/find/at--innsbruck/',
    description: 'International meetup platform',
    priority: 'HIGH'
  },
  {
    name: 'EngineeringKiosk',
    url: 'https://engineeringkiosk.dev/meetup/alps/',
    description: 'Engineering & Tech meetups',
    priority: 'HIGH'
  },
  {
    name: 'InnsbruckInfo',
    url: 'https://www.innsbruck.info/veranstaltungskalender.html',
    description: 'City tourism events',
    priority: 'LOW'
  },
  {
    name: 'CMI',
    url: 'https://www.cmi.at/de/veranstaltungskalender',
    description: 'Congress Messe Innsbruck',
    priority: 'MEDIUM'
  }
];

// For testing, use PRIMARY sites first (most relevant)
const SITES = PRIMARY_SITES;

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();

  try {
    // Check query param for which sites to check
    const { priority = 'primary' } = req.query;

    // Select sites based on priority
    let sitesToCheck = PRIMARY_SITES;
    if (priority === 'all') {
      sitesToCheck = [...PRIMARY_SITES, ...SECONDARY_SITES];
    } else if (priority === 'secondary') {
      sitesToCheck = SECONDARY_SITES;
    }

    logger.debug(`[RADAR-SITES] Checking ${sitesToCheck.length} ${priority} sites...`);
    const allEvents = [];

    for (const site of sitesToCheck) {
      logger.debug(`[RADAR-SITES] Checking ${site.name}...`);

      // Fetch the HTML
      const response = await fetch(site.url);
      if (!response.ok) {
        logger.error(`[RADAR-SITES] Failed to fetch ${site.name}: ${response.status}`);
        continue;
      }

      const html = await response.text();
      logger.debug(`[RADAR-SITES] Fetched ${html.length} chars from ${site.name} (${Date.now() - startTime}ms)`);

      // Extract events using Groq
      const events = await extractEventsFromHTML(html, site.url, site.name);
      logger.debug(`[RADAR-SITES] Found ${events.length} events from ${site.name} (${Date.now() - startTime}ms total)`);

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

    logger.debug(`[RADAR-SITES] Complete: ${added} added, ${duplicates} duplicates`);

    return res.status(200).json({
      success: true,
      sites_checked: sitesToCheck.length,
      sites: sitesToCheck.map(s => ({ name: s.name, priority: s.priority })),
      events_found: allEvents.length,
      events_added: added,
      duplicates: duplicates,
      events: allEvents // Return for debugging
    });

  } catch (error) {
    logger.error('[RADAR-SITES] Error:', error);
    return res.status(500).json({
      error: 'Site checking failed',
      message: error.message
    });
  }
}

// Helper to extract main content and reduce HTML size
function extractMainContent(html) {
  // Remove script tags, style tags, comments
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Try to find main content area
  const mainMatch = cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) return mainMatch[1];

  const contentMatch = cleaned.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (contentMatch) return contentMatch[1];

  const articleMatch = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/gi);
  if (articleMatch) return articleMatch.join('\n');

  // Fallback: return cleaned HTML
  return cleaned;
}

async function extractEventsFromHTML(html, url, siteName) {
  // Extract just the main content area to reduce token count
  const mainContent = extractMainContent(html);

  // Use more content for better extraction
  const contentLength = 15000; // Increased from 8000
  const content = mainContent.substring(0, contentLength);

  const prompt = `
You are extracting events from a website HTML. This is from ${siteName} (${url}).

IMPORTANT: Extract ALL events, workshops, seminars, and meetings from this page.

Criteria:
1. PREFER FREE events but INCLUDE events where price is not mentioned (might be free)
2. Must be in TYROL (Innsbruck, Hall, Wattens, Kufstein, etc.)
3. PUBLIC events (open registration)

Special rules for ${siteName}:
${siteName.includes('WKO') ? '- WKO events are often free for members, include them' : ''}
${siteName.includes('InnCubator') ? '- InnCubator events are usually free, include even if not explicitly stated' : ''}
${siteName.includes('Uni') ? '- University events are typically free and public' : ''}
- If no price is mentioned, ASSUME it might be free and INCLUDE it
- Look for dates in format: 15.01.2025, 15. Jänner, January 15, etc.

HTML Content:
${content}

For each qualifying FREE event in TYROL, extract:
{
  "title": "Event name",
  "date": "YYYY-MM-DD",
  "time": "HH:MM (24h) or 18:00 if not specified",
  "location": "Venue name",
  "city": "City in Tyrol",
  "category": "AI" | "Tech" | "Startup" | "Innovation" | "Business" | "Education" | "Other",
  "description": "Brief description (max 200 chars)",
  "registrationUrl": "URL for registration if found",
  "detailUrl": "URL to event detail page (IMPORTANT - always extract if available!)"
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
      model: "openai/gpt-oss-20b", // Using faster 20B model for site checking
      messages: [{
        role: "user",
        content: prompt
      }],
      temperature: 0.1,
      max_tokens: 2048, // Reduced for speed
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"events":[]}');
    return result.events || [];

  } catch (error) {
    logger.error('[RADAR-SITES] Groq extraction error:', error);
    return [];
  }
}

async function checkDuplicate(event) {
  // Check duplicates based on title and date only (not location)
  // This prevents same event with different location formats being added multiple times

  // Get all existing event IDs
  const allEventIds = await kv.smembers('radar:events');

  // Normalize the incoming event's title and date for comparison
  const incomingTitle = (event.title || '').toLowerCase().trim();
  const incomingDate = event.date;

  // Check each existing event for matching title+date
  for (const eventId of allEventIds) {
    try {
      const existingEvent = await kv.hgetall(`radar:event:${eventId}`);

      if (existingEvent && existingEvent.title && existingEvent.date) {
        const existingTitle = (existingEvent.title || '').toLowerCase().trim();
        const existingDate = existingEvent.date;

        // Check if title and date match (exact match after normalization)
        if (existingTitle === incomingTitle && existingDate === incomingDate) {
          logger.debug(`[DUPLICATE] Found duplicate: "${event.title}" on ${event.date}`);
          return true; // Duplicate found
        }
      }
    } catch (error) {
      logger.error(`[DUPLICATE-CHECK] Error checking event ${eventId}:`, error);
    }
  }

  return false; // No duplicate found
}

async function storeEvent(event, source) {
  // Use title-date for ID (not location) to ensure consistent duplicate detection
  const eventId = `${event.title}-${event.date}`.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const eventData = {
    id: eventId,
    ...event,
    source: source,
    location: event.location || event.city || 'unknown',
    detailUrl: event.detailUrl || event.registrationUrl || null,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  await kv.hset(`radar:event:${eventId}`, eventData);
  await kv.sadd('radar:events', eventId);
  await kv.sadd(`radar:events:by-date:${event.date}`, eventId);
  await kv.incr('radar:metrics:total');

  return eventId;
}