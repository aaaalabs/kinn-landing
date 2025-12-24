/**
 * POST /api/raus/process-text
 *
 * Processes text input: Extract structured data with Groq
 *
 * Request: { text: string }
 * Response: { extracted }
 */

import { extractWithGroq } from './utils/extraction.js';

export default async function handler(req, res) {
  // CORS
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
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return res.status(400).json({ error: 'Text muss mindestens 10 Zeichen lang sein' });
    }

    // Extract with Groq (using shared utility)
    const extracted = await extractWithGroq(text.trim(), false);

    return res.status(200).json({ extracted });

  } catch (error) {
    console.error('[RAUS] Process text error:', error);
    return res.status(500).json({
      error: 'Extraktion fehlgeschlagen',
      message: error.message
    });
  }
}
