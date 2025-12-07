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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, svix-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify Resend webhook signature (optional for MVP)
    const signature = req.headers['svix-signature'];
    const expectedSecret = process.env.RESEND_RADAR_WEBHOOK_SECRET || process.env.RESEND_WEBHOOK_SECRET;

    // Skip signature validation if no secret configured (development)
    if (expectedSecret && signature !== expectedSecret) {
      console.log('[RADAR] Invalid webhook signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { from, to, subject, html, text } = req.body;

    // Log receipt
    console.log(`[RADAR] Newsletter received from ${from}: ${subject}`);

    // Check if this is for RADAR
    if (!to?.includes('radar@')) {
      console.log('[RADAR] Not a RADAR email, ignoring');
      return res.status(200).json({ ignored: true });
    }

    // Extract events using Groq
    const extractedEvents = await extractEventsWithGroq({
      from,
      subject,
      content: html || text || ''
    });

    console.log(`[RADAR] Extracted ${extractedEvents.length} events from newsletter`);

    // Process each event
    let added = 0;
    let rejected = 0;

    for (const event of extractedEvents) {
      // Validate FREE + TYROL criteria
      const validation = validateEvent(event);

      if (!validation.isValid) {
        console.log(`[RADAR] Rejected event "${event.title}": ${validation.reasons.join(', ')}`);
        rejected++;
        continue;
      }

      // Check for duplicates
      const isDuplicate = await checkDuplicate(event);

      if (isDuplicate) {
        console.log(`[RADAR] Duplicate event found: ${event.title}`);
        continue;
      }

      // Store event
      await storeEvent(event, from);
      added++;
      console.log(`[RADAR] Added event: ${event.title} on ${event.date}`);
    }

    // Update metrics
    await kv.incr('radar:metrics:newsletters:total');
    await kv.incr('radar:metrics:events:added', added);
    await kv.incr('radar:metrics:events:rejected', rejected);

    const response = {
      success: true,
      processed: extractedEvents.length,
      added,
      rejected,
      source: from
    };

    console.log('[RADAR] Processing complete:', response);
    return res.status(200).json(response);

  } catch (error) {
    console.error('[RADAR] Processing error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

async function extractEventsWithGroq({ from, subject, content }) {
  const prompt = `
You are an expert at extracting event information from German and English newsletters.

Extract events from this newsletter that meet ALL these CRITICAL criteria:

MANDATORY FILTERS - Only include events that are:
1. **FREE** (kostenlos, gratis, no cost, 0€, Eintritt frei) - REJECT any event with price/fee/ticket/cost
2. **Located in TYROL** (Innsbruck, Hall, Wattens, Kufstein, Wörgl, Schwaz, etc.) - REJECT Vienna/Salzburg/Munich/Online-only
3. **AI/ML/Data related** - Must contain AI, KI, Machine Learning, Deep Learning, Data Science, LLM keywords
4. **PUBLIC** (open registration) - REJECT internal/members-only/private events

If an event has ANY cost (even €5), EXCLUDE it.
If an event is outside Tyrol, EXCLUDE it.
If unsure about any criteria, EXCLUDE the event.

Newsletter from: ${from}
Subject: ${subject}

Content:
${content.substring(0, 30000)}

For each QUALIFYING event (FREE + TYROL + AI + PUBLIC), extract:
{
  "title": "Event name",
  "date": "ISO date (YYYY-MM-DD)",
  "time": "HH:MM in 24h format",
  "endTime": "HH:MM if available",
  "location": "Venue name",
  "address": "Street address if available",
  "city": "City in Tyrol",
  "description": "Brief description (max 200 chars)",
  "registrationUrl": "Registration or info URL",
  "tags": ["AI", "Workshop", etc],
  "language": "de" or "en" or "mixed"
}

Important:
- Convert German dates like "15. März 2025" to "2025-03-15"
- "Jeden ersten Mittwoch" means recurring monthly
- Default to 18:00 if no time specified
- Return empty array [] if no qualifying events found

Return ONLY a JSON array of events, no other text.`;

  try {
    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: prompt
      }],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content || '[]';

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(content);

      // Handle both array and object with events property
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed.events && Array.isArray(parsed.events)) {
        return parsed.events;
      } else {
        console.log('[RADAR] Unexpected response format from Groq');
        return [];
      }
    } catch (parseError) {
      console.error('[RADAR] Failed to parse Groq response:', parseError);
      console.log('[RADAR] Raw response:', content.substring(0, 500));
      return [];
    }

  } catch (error) {
    console.error('[RADAR] Groq extraction error:', error);
    return [];
  }
}

function validateEvent(event) {
  const validation = {
    isValid: true,
    reasons: []
  };

  // Required fields
  if (!event.title || !event.date) {
    validation.isValid = false;
    validation.reasons.push('Missing required fields');
    return validation;
  }

  const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
  const locationText = `${event.location || ''} ${event.city || ''} ${event.address || ''}`.toLowerCase();

  // Check FREE criteria
  const costIndicators = ['€', 'eur', 'euro', 'price', 'preis', 'ticket', 'eintritt', 'gebühr', 'fee', 'cost', 'kosten', 'beitrag'];
  const freeIndicators = ['kostenlos', 'gratis', 'free', '0€', 'eintritt frei', 'kostenfrei', 'gebührenfrei'];

  const hasCost = costIndicators.some(term => eventText.includes(term));
  const isFree = freeIndicators.some(term => eventText.includes(term));

  if (hasCost && !isFree) {
    validation.isValid = false;
    validation.reasons.push('Event appears to have a cost');
  }

  // Check TYROL criteria
  const tyrolCities = ['innsbruck', 'hall', 'wattens', 'kufstein', 'wörgl', 'schwaz', 'telfs', 'imst', 'landeck', 'lienz', 'kitzbühel', 'tirol', 'tyrol'];
  const excludedLocations = ['wien', 'vienna', 'salzburg', 'graz', 'linz', 'münchen', 'munich', 'zürich', 'online-only', 'webinar'];

  const inTyrol = tyrolCities.some(city => locationText.includes(city));
  const isExcluded = excludedLocations.some(loc => locationText.includes(loc));

  if (!inTyrol || isExcluded) {
    validation.isValid = false;
    validation.reasons.push('Event not in Tyrol or is online-only');
  }

  // Check AI/ML criteria
  const aiKeywords = ['ai', 'ki', 'artificial intelligence', 'künstliche intelligenz', 'machine learning', 'ml', 'deep learning', 'data science', 'data analytics', 'llm', 'large language', 'neural', 'nlp', 'computer vision', 'gpt', 'transformer'];

  const hasAI = aiKeywords.some(keyword => eventText.includes(keyword));

  if (!hasAI) {
    validation.isValid = false;
    validation.reasons.push('Event not AI/ML related');
  }

  // Check PUBLIC criteria
  const privateIndicators = ['internal', 'intern', 'employees only', 'nur für mitarbeiter', 'members only', 'nur für mitglieder', 'geschlossen', 'private', 'invitation only', 'auf einladung'];

  const isPrivate = privateIndicators.some(term => eventText.includes(term));

  if (isPrivate) {
    validation.isValid = false;
    validation.reasons.push('Event appears to be private/restricted');
  }

  return validation;
}

async function checkDuplicate(event) {
  // Create a unique key for the event
  const eventKey = `${event.title}-${event.date}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // Check if this event already exists
  const exists = await kv.exists(`radar:event:${eventKey}`);

  return exists;
}

async function storeEvent(event, source) {
  // Create event ID
  const eventId = `${event.title}-${event.date}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // Prepare event data
  const eventData = {
    id: eventId,
    ...event,
    source: source.split('@')[1]?.split('.')[0] || 'newsletter',
    createdAt: new Date().toISOString(),
    reviewed: false
  };

  // Store event in Redis
  await kv.hset(`radar:event:${eventId}`, eventData);

  // Add to event set
  await kv.sadd('radar:events', eventId);

  // Add to date index
  await kv.sadd(`radar:events:by-date:${event.date}`, eventId);

  // Update total counter
  await kv.incr('radar:metrics:total');

  return eventId;
}