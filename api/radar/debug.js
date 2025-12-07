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
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }

    // Debug prompt - extract ALL events first, then show why each was filtered
    const debugPrompt = `
You are debugging an event extraction system. Extract ALL events from this newsletter, regardless of criteria.

For EACH event found, provide:
1. Event title
2. Date (if mentioned)
3. Location (if mentioned)
4. Cost info (if mentioned)
5. AI/Tech relevance (if any)
6. WHY it would be filtered out (if applicable)

Content:
${content.substring(0, 15000)}

Return a JSON object:
{
  "all_events": [
    {
      "title": "Event name",
      "date": "Date if found",
      "location": "Location if found",
      "cost": "Cost info if found",
      "ai_relevant": true/false,
      "filter_reason": "Why this would be rejected (e.g., 'Has cost', 'Not in Tyrol', 'Not AI-related', 'Online only')"
    }
  ],
  "summary": "Brief summary of what types of events were in this newsletter"
}`;

    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{
        role: "user",
        content: debugPrompt
      }],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"all_events":[],"summary":"No events found"}');

    // Log for debugging
    console.log('[RADAR DEBUG] Found events:', JSON.stringify(result, null, 2));

    return res.status(200).json({
      success: true,
      debug_analysis: result,
      total_events_found: result.all_events?.length || 0,
      content_length: content.length
    });

  } catch (error) {
    console.error('[RADAR DEBUG] Error:', error);
    return res.status(500).json({
      error: 'Debug analysis failed',
      message: error.message
    });
  }
}