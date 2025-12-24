/**
 * POST /api/raus/process-text
 *
 * Processes text input: Extract structured data with Groq
 *
 * Request: { text: string }
 * Response: { extracted }
 */

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

    // Extract with Groq
    const extracted = await extractWithGroq(text.trim());

    return res.status(200).json({ extracted });

  } catch (error) {
    console.error('[RAUS] Process text error:', error);
    return res.status(500).json({
      error: 'Extraktion fehlgeschlagen',
      message: error.message
    });
  }
}

async function extractWithGroq(text) {
  const prompt = `Du extrahierst Use Case Informationen aus einer Beschreibung.
Die Person beschreibt einen KI Use Case für den "KI Praxis Report Tirol 2026".

Text:
"""
${text}
"""

Extrahiere folgende Informationen:
1. headline: Ein prägnanter Satz, der den Use Case zusammenfasst (max 100 Zeichen)
2. problem: Was war das Problem vorher? (2-3 Sätze, Hochdeutsch)
3. solution: Wie funktioniert die KI-Lösung? (2-3 Sätze, Hochdeutsch)
4. result: Messbare Verbesserung mit Zahlen wenn möglich (1-2 Sätze, Hochdeutsch)
5. tools: Liste der verwendeten KI-Tools (Array)
6. industry: Branche (eine aus: IT, Handwerk, Handel, Dienstleistung, Produktion, Beratung, Sonstiges)
7. confidence: Deine Konfidenz dass du alles korrekt extrahiert hast (0.0 - 1.0)

WICHTIG:
- Übersetze Dialekt in Hochdeutsch
- Bei Unsicherheit: confidence < 0.8 setzen
- Fehlende Infos: null setzen (nicht erfinden!)

Antworte NUR mit validem JSON.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Du extrahierst strukturierte Daten aus Texten. Antworte nur mit JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`Groq extraction failed: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
