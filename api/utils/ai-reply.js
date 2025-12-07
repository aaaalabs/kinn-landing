import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const KINN_SYSTEM_PROMPT = `Du bist der KI-Assistent für KINN (Künstliche Intelligenz Netzwerk Innsbruck).

**Deine Rolle:**
- Beantworte Fragen zum KINN KI Treff Innsbruck
- Informiere über KI-Events in Tirol
- Sei freundlich, professionell und auf Tirolerisch sympathisch

**KINN Info:**
- Wo Tiroler KI Profil bekommt
- Events in Innsbruck für KI-Interessierte
- Community für KI-Professionals und Enthusiasts
- Google Calendar Integration für Event-Einladungen

**Wichtig:**
- Kurze, prägnante Antworten (max 3-4 Sätze)
- Tiroler Ton (z.B. "Servus!", "Griaß di!")
- Bei technischen Fragen: Auf nächstes Event verweisen
- Bei Anmeldung: Bestätigen dass sie in den Verteiler aufgenommen wurden

**Email Signature:**
Beste Grüße,
KINN – Wo Tiroler KI Profil bekommt
https://kinn.at`;

/**
 * Generates an AI-powered reply using GROQ
 * @param {Object} emailData - Inbound email data
 * @param {string} emailData.from - Sender email
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.text - Plain text body
 * @param {string} emailData.html - HTML body
 * @returns {Promise<string>} Generated reply text
 */
export async function generateAIReply(emailData) {
  const { from, subject, text, html } = emailData;

  // Use text content, fallback to HTML stripped of tags
  const emailContent = text || html?.replace(/<[^>]*>/g, '') || '[Kein Inhalt]';

  try {
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content: KINN_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Betreff: ${subject}\n\nNachricht:\n${emailContent}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
      top_p: 0.9,
    });

    const reply = completion.choices[0]?.message?.content;

    if (!reply) {
      throw new Error('No reply generated from GROQ');
    }

    console.log('[AI-REPLY] Generated reply for subject:', subject);
    return reply;

  } catch (error) {
    console.error('[AI-REPLY] GROQ error:', error.message);

    // [EH02] Fallback to friendly error message (NO generic fallback per CLAUDE.md)
    throw new Error(`AI reply generation failed: ${error.message}`);
  }
}

/**
 * Validates if an email should receive an auto-reply
 * @param {Object} emailData - Inbound email data
 * @returns {boolean} True if should auto-reply
 */
export function shouldAutoReply(emailData) {
  const { from, subject } = emailData;

  // Don't reply to:
  // - No-reply addresses
  // - Auto-responders
  // - Delivery failures
  // - OUR OWN SYSTEM EMAILS (critical!)
  // - Known spam patterns
  const skipPatterns = [
    /noreply|no-reply|mailer-daemon|postmaster/i,
    /auto.*reply|automatic.*response/i,
    /delivery.*failure|undelivered|bounced/i,
    // Skip our own system emails to prevent loops
    /ki@in\.kinn\.at|thomas@kinn\.at|treff@in\.kinn\.at/i,
    // Skip known spam patterns
    /medicare|adac|krankenkasse|versicherung|bonus-programm/i,
    /firebaseapp\.com|newsletter|unsubscribe/i,
    // Skip bounce notifications about our own emails
    /Re:\s*(Neue Anmeldung|Newsletter-Anmeldung|KINN)/i,
  ];

  const fromEmail = from.toLowerCase();
  const subjectLower = subject?.toLowerCase() || '';

  for (const pattern of skipPatterns) {
    if (pattern.test(fromEmail) || pattern.test(subjectLower)) {
      console.log('[AI-REPLY] Skipping auto-reply for:', from);
      return false;
    }
  }

  // Additional check: Skip if subject starts with "Re:" (likely a reply)
  if (subject?.startsWith('Re:')) {
    console.log('[AI-REPLY] Skipping auto-reply for reply email:', from);
    return false;
  }

  return true;
}
