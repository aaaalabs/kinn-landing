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

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, url, priority } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'Missing required fields: name, url' });
    }

    console.log(`[RADAR Test] Testing single source: ${name} (${url})`);

    // Skip manual sources
    if (url === 'manual') {
      return res.status(200).json({
        success: false,
        message: 'Manual source - cannot be tested automatically',
        events_found: 0
      });
    }

    // Fetch the HTML with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let html;
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KINN-RADAR/1.0; +https://kinn.at)'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`[RADAR Test] Failed to fetch ${name}: ${response.status}`);
        return res.status(200).json({
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          events_found: 0,
          events: []
        });
      }

      html = await response.text();
      console.log(`[RADAR Test] Fetched ${html.length} chars from ${name}`);

    } catch (fetchError) {
      clearTimeout(timeout);
      console.error(`[RADAR Test] Fetch error for ${name}:`, fetchError);
      return res.status(200).json({
        success: false,
        error: fetchError.message,
        events_found: 0,
        events: []
      });
    }

    // Extract events using AI
    const events = await extractEventsFromHTML(html, url, name);
    console.log(`[RADAR Test] Found ${events.length} events from ${name}`);

    // Check for duplicates but don't store (this is just a test)
    let duplicates = 0;
    for (const event of events) {
      const isDuplicate = await checkDuplicate(event);
      if (isDuplicate) duplicates++;
    }

    return res.status(200).json({
      success: true,
      source: name,
      url: url,
      events_found: events.length,
      new_events: events.length - duplicates,
      duplicates: duplicates,
      events: events,
      html_length: html.length,
      extraction_model: 'openai/gpt-oss-20b'
    });

  } catch (error) {
    console.error('[RADAR Test] Error:', error);
    return res.status(500).json({
      error: 'Test failed',
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

  // Look for event-specific containers
  const eventMatch = cleaned.match(/<div[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);
  if (eventMatch) return eventMatch.join('\n');

  // Fallback: return cleaned HTML
  return cleaned;
}

async function extractEventsFromHTML(html, url, siteName) {
  // Extract just the main content area to reduce token count
  const mainContent = extractMainContent(html);

  // Truncate if too long
  const maxChars = 12000; // Increased for better extraction
  const content = mainContent.length > maxChars
    ? mainContent.substring(0, maxChars) + '...[truncated]'
    : mainContent;

  const prompt = `
You are extracting events from ${siteName} (${url}).

CRITICAL: Extract ALL events that meet these criteria:
1. FREE (kostenlos, gratis, no cost, Eintritt frei, free admission) - REJECT if any price mentioned
2. Located in TYROL (Innsbruck, Hall, Wattens, Kufstein, etc.) - REJECT if outside Tyrol
3. PUBLIC (open registration) - REJECT if members-only or private

HTML Content:
${content}

For each qualifying FREE event in TYROL, extract:
{
  "title": "Event name",
  "date": "YYYY-MM-DD (convert to this format)",
  "time": "HH:MM (24h format) or 18:00 if not specified",
  "location": "Venue name",
  "city": "City in Tyrol",
  "category": "AI" | "Tech" | "Startup" | "Innovation" | "Business" | "Education" | "Other",
  "description": "Brief description (max 200 chars)",
  "registrationUrl": "URL if found"
}

Categories:
- "AI": AI, KI, Machine Learning, Data Science, ChatGPT, Neural Networks
- "Tech": Programming, Software, IT, DevOps, Cloud, Coding, Development
- "Startup": Gründung, Founder, Pitch, Entrepreneur, Investor, Accelerator
- "Innovation": Digital Transformation, Future Tech, Industry 4.0, Smart City
- "Business": Marketing, Sales, Management, Leadership, Networking, Strategy
- "Education": Workshop, Training, Course, Seminar, Tutorial, Hackathon
- "Other": Everything else

Important:
- Look for event listings, calendars, date sections, schedule blocks
- Common patterns: <div class="event">, <article>, <li> with dates, .event-item, .calendar-entry
- University/public institution events are often FREE even if not explicitly stated
- Convert German dates (15. Dezember 2025) to YYYY-MM-DD format
- Default to Innsbruck if city not specified
- If you see "Anmeldung erforderlich" or "Registration required" it's likely free
- Extract as many events as you can find, not just the first few

Return as JSON object:
{"events": [...array of events...]}`;

  try {
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b", // Fast model for testing
      messages: [{
        role: "user",
        content: prompt
      }],
      temperature: 0.1,
      max_tokens: 3000, // Increased for more events
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"events":[]}');

    // Validate and clean events
    const validEvents = (result.events || []).filter(event => {
      // Basic validation
      if (!event.title || !event.date) return false;

      // Ensure date is in future or recent past (within 30 days)
      const eventDate = new Date(event.date);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      return eventDate >= thirtyDaysAgo;
    });

    return validEvents;

  } catch (error) {
    console.error('[RADAR Test] Groq extraction error:', error);
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