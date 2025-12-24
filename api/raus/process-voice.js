/**
 * POST /api/raus/process-voice
 *
 * Processes voice recording: Upload → Transcribe → Extract
 *
 * Request: FormData with 'audio' file
 * Response: { transcript, extracted }
 */

export const config = {
  api: {
    bodyParser: false, // Handle FormData manually
  },
};

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
    // Parse multipart form data
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Extract audio from multipart (simple boundary parsing)
    const boundary = req.headers['content-type']?.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ error: 'Missing boundary in content-type' });
    }

    const audioBuffer = extractAudioFromMultipart(buffer, boundary);
    if (!audioBuffer) {
      return res.status(400).json({ error: 'No audio file found in request' });
    }

    // 1. Upload to AssemblyAI
    const uploadUrl = await uploadToAssemblyAI(audioBuffer);

    // 2. Transcribe
    const transcript = await transcribeWithAssemblyAI(uploadUrl);

    // 3. Extract with Groq
    const extracted = await extractWithGroq(transcript);

    return res.status(200).json({
      transcript,
      extracted
    });

  } catch (error) {
    console.error('[RAUS] Process voice error:', error);
    return res.status(500).json({
      error: 'Processing failed',
      message: error.message
    });
  }
}

function extractAudioFromMultipart(buffer, boundary) {
  const str = buffer.toString('binary');
  const parts = str.split('--' + boundary);

  for (const part of parts) {
    if (part.includes('name="audio"') || part.includes('filename=')) {
      // Find the start of binary data (after double CRLF)
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;

      const dataStart = headerEnd + 4;
      const dataEnd = part.lastIndexOf('\r\n');
      const data = part.slice(dataStart, dataEnd > dataStart ? dataEnd : undefined);

      return Buffer.from(data, 'binary');
    }
  }
  return null;
}

async function uploadToAssemblyAI(audioBuffer) {
  const response = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': process.env.ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/octet-stream'
    },
    body: audioBuffer
  });

  if (!response.ok) {
    throw new Error(`AssemblyAI upload failed: ${response.status}`);
  }

  const data = await response.json();
  return data.upload_url;
}

async function transcribeWithAssemblyAI(audioUrl) {
  // Submit transcription job
  const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': process.env.ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_code: 'de'
    })
  });

  if (!submitRes.ok) {
    throw new Error(`AssemblyAI transcription failed: ${submitRes.status}`);
  }

  const { id } = await submitRes.json();

  // Poll for result (max 2 minutes)
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { 'Authorization': process.env.ASSEMBLYAI_API_KEY }
    });

    const result = await pollRes.json();

    if (result.status === 'completed') {
      return result.text;
    }
    if (result.status === 'error') {
      throw new Error(`Transcription error: ${result.error}`);
    }

    // Wait 2 seconds before polling again
    await new Promise(r => setTimeout(r, 2000));
  }

  throw new Error('Transcription timeout');
}

async function extractWithGroq(transcript) {
  const prompt = `Du extrahierst Use Case Informationen aus einer Transkription.
Die Person beschreibt einen KI Use Case für den "KI Praxis Report Tirol 2026".

Transkript:
"""
${transcript}
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
        { role: 'system', content: 'Du extrahierst strukturierte Daten aus Transkriptionen. Antworte nur mit JSON.' },
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
