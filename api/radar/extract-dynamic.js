import { createClient } from '@vercel/kv';
import Groq from 'groq-sdk';
import { google } from 'googleapis';

// Use KINNST_ prefixed environment variables
const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

const groq = new Groq({
  apiKey: process.env.RADAR_GROQ_API_KEY,
});

// Initialize Google Sheets client
async function getSheetsClient() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('[EXTRACT-DYNAMIC] Failed to initialize Google Sheets client:', error);
    throw error;
  }
}

// Fetch extraction patterns from Google Sheets
async function getExtractionPatterns(sourceName) {
  const sheets = await getSheetsClient();
  const SHEET_ID = process.env.RADAR_GOOGLE_SHEET_ID;

  try {
    // Read the Sources sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Sources!A:L'
    });

    const rows = response.data.values || [];
    const headers = rows[0];

    // Find column indexes
    const sourceIdx = headers.indexOf('Source');
    const urlIdx = headers.indexOf('URL');
    const htmlPatternIdx = headers.indexOf('HTML Pattern');
    const dateFormatIdx = headers.indexOf('Date Format');
    const extractNotesIdx = headers.indexOf('Extract Notes');

    // Find the row for this source
    const sourceRow = rows.find(row => row[sourceIdx] === sourceName);

    if (!sourceRow) {
      return null;
    }

    return {
      url: sourceRow[urlIdx] || '',
      htmlPattern: sourceRow[htmlPatternIdx] || '',
      dateFormat: sourceRow[dateFormatIdx] || '',
      extractNotes: sourceRow[extractNotesIdx] || ''
    };

  } catch (error) {
    console.error('[EXTRACT-DYNAMIC] Error fetching patterns:', error);
    return null;
  }
}

// Build extraction instructions from sheet patterns
function buildInstructions(patterns, sourceName) {
  let instructions = `Source: ${sourceName}\n\n`;

  if (patterns.htmlPattern) {
    instructions += `HTML PATTERN/SELECTOR:\n${patterns.htmlPattern}\n\n`;
  }

  if (patterns.dateFormat) {
    instructions += `DATE FORMAT ON THIS SITE:\n${patterns.dateFormat}\n`;
    instructions += `Convert this format to YYYY-MM-DD.\n\n`;
  }

  if (patterns.extractNotes) {
    instructions += `SPECIAL INSTRUCTIONS:\n${patterns.extractNotes}\n\n`;
  }

  // Add defaults if no patterns provided
  if (!patterns.htmlPattern && !patterns.dateFormat && !patterns.extractNotes) {
    instructions += `
Look for:
- Event listings, cards, or calendar items
- Dates, times, titles, and locations
- Any indication if event is FREE (gratis, kostenlos, keine Gebühr, etc.)
- Include events happening in Tirol region
`;
  }

  return instructions;
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
    const { sourceName, testMode = false, forceReload = false } = req.method === 'GET' ? req.query : req.body;

    if (!sourceName) {
      return res.status(400).json({
        error: 'sourceName required'
      });
    }

    console.log(`[EXTRACT-DYNAMIC] Processing ${sourceName}`);

    // Get extraction patterns from Google Sheets
    const patterns = await getExtractionPatterns(sourceName);

    if (!patterns) {
      return res.status(404).json({
        error: `Source "${sourceName}" not found in Google Sheets`,
        hint: 'Please add source to Sources tab in Google Sheets'
      });
    }

    if (!patterns.url) {
      return res.status(400).json({
        error: `No URL configured for "${sourceName}"`,
        hint: 'Please add URL in column I of Sources tab'
      });
    }

    console.log(`[EXTRACT-DYNAMIC] Using patterns:`, {
      htmlPattern: patterns.htmlPattern ? 'yes' : 'no',
      dateFormat: patterns.dateFormat ? 'yes' : 'no',
      extractNotes: patterns.extractNotes ? 'yes' : 'no'
    });

    // Fetch the webpage
    const response = await fetch(patterns.url, {
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
    console.log(`[EXTRACT-DYNAMIC] Fetched ${html.length} chars from ${sourceName}`);

    // Build extraction instructions from patterns
    const instructions = buildInstructions(patterns, sourceName);

    // Extract events using dynamic instructions
    const events = await extractWithDynamicInstructions(html, sourceName, instructions, patterns.url);
    console.log(`[EXTRACT-DYNAMIC] Found ${events.length} events from ${sourceName}`);

    // In test mode, don't store
    if (testMode) {
      return res.status(200).json({
        success: true,
        source: sourceName,
        testMode: true,
        patterns: {
          htmlPattern: patterns.htmlPattern || 'none',
          dateFormat: patterns.dateFormat || 'none',
          extractNotes: patterns.extractNotes || 'none'
        },
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
      url: patterns.url,
      patterns_used: {
        htmlPattern: patterns.htmlPattern ? 'yes' : 'no',
        dateFormat: patterns.dateFormat ? 'yes' : 'no',
        extractNotes: patterns.extractNotes ? 'yes' : 'no'
      },
      events_found: events.length,
      events_added: added,
      duplicates: duplicates,
      events: events.slice(0, 5) // Return first 5 as preview
    });

  } catch (error) {
    console.error(`[EXTRACT-DYNAMIC] Error:`, error);
    return res.status(500).json({
      error: 'Extraction failed',
      message: error.message
    });
  }
}

async function extractWithDynamicInstructions(html, sourceName, instructions, url) {
  const maxChars = 20000;

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
URL: ${url}

EXTRACTION INSTRUCTIONS:
${instructions}

GENERAL RULES:
1. Extract ALL FREE events mentioned
2. If no price mentioned, assume it's FREE
3. Skip events that clearly have a cost (€XX, Ticket price, etc.)
4. Convert dates to YYYY-MM-DD format
5. Use 24-hour time format (HH:MM)
6. Default time to 18:00 if not specified
7. Default city to "Innsbruck" if in Tirol but not specified
8. Assign appropriate category based on content

CATEGORIES:
- AI: Artificial Intelligence, Machine Learning, Data Science
- Tech: Programming, Software, DevOps, IT
- Startup: Entrepreneurship, Pitching, Founding
- Innovation: Digital Transformation, Future Tech
- Business: Commerce, Marketing, Management
- Education: Workshops, Courses, Training
- Other: Everything else

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

IMPORTANT: Follow the extraction instructions carefully!`;

  try {
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b", // Using larger model for better instruction following
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
    console.error(`[EXTRACT-DYNAMIC] AI error for ${sourceName}:`, error);
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