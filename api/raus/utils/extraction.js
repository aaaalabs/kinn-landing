/**
 * Shared extraction utilities for RAUS
 * Used by both process-voice.js and process-text.js
 */

/**
 * Build extraction prompt for Groq LLM
 * @param {string} text - Text or transcript to extract from
 * @param {boolean} isVoice - Whether source is voice transcription
 */
export function getExtractionPrompt(text, isVoice = false) {
  const sourceLabel = isVoice ? 'Transkript' : 'Text';

  return `Du extrahierst Use Case Informationen aus ${isVoice ? 'einer Transkription' : 'einer Beschreibung'}.
Die Person beschreibt einen KI Use Case für den "KI Praxis Report Tirol 2026".

${sourceLabel}:
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
}

/**
 * Extract structured data using Groq LLM
 * @param {string} text - Text to extract from
 * @param {boolean} isVoice - Whether source is voice transcription
 */
export async function extractWithGroq(text, isVoice = false) {
  const prompt = getExtractionPrompt(text, isVoice);
  const systemPrompt = isVoice
    ? 'Du extrahierst strukturierte Daten aus Transkriptionen. Antworte nur mit JSON.'
    : 'Du extrahierst strukturierte Daten aus Texten. Antworte nur mit JSON.';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`Groq extraction failed: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
