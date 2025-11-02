import { verifyProfileToken } from './utils/tokens.js';
import { updateEventRSVP, getEventRSVPs, getUserPreferences, updateUserPreferences } from './utils/redis.js';
import { enforceRateLimit } from './utils/rate-limiter.js';

/**
 * RSVP API Endpoint
 * GET /api/rsvp?token=...&event=...&response=yes|no|maybe
 *
 * Optional query params for WhatsApp opt-in:
 * &phone=+43...&whatsapp=true
 *
 * Returns HTML redirect to success page
 */

export default async function handler(req, res) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are accepted'
    });
  }

  // Rate limiting: 10 requests per minute per IP
  const rateLimitAllowed = await enforceRateLimit(req, res, {
    maxRequests: 10,
    windowMs: 60 * 1000,
    keyPrefix: 'ratelimit:rsvp'
  });

  if (!rateLimitAllowed) {
    return; // Response already sent by enforceRateLimit
  }

  try {
    const { token, event, response, phone, whatsapp } = req.query;

    // Validate required params
    if (!token || !event || !response) {
      return res.status(400).send(
        generateErrorPage('Fehlende Parameter', 'Token, Event-ID und Response sind erforderlich.')
      );
    }

    // Verify token
    const email = verifyProfileToken(token);
    if (!email) {
      return res.status(401).send(
        generateErrorPage('Ungültiger Token', 'Dein Link ist abgelaufen oder ungültig. Bitte verwende den aktuellsten Link aus deiner Email.')
      );
    }

    // Validate response
    if (!['yes', 'no', 'maybe'].includes(response)) {
      return res.status(400).send(
        generateErrorPage('Ungültige Response', 'Response muss yes, no oder maybe sein.')
      );
    }

    // Update RSVP in Redis
    await updateEventRSVP(event, email, response);

    // Get updated RSVP counts for social proof
    const rsvps = await getEventRSVPs(event);

    // Update user preferences if phone/whatsapp provided
    if (phone || whatsapp === 'true') {
      const prefs = await getUserPreferences(email) || {};

      // Validate phone number format (basic)
      if (phone) {
        const cleanPhone = phone.trim();
        if (!/^\+?\d{10,15}$/.test(cleanPhone.replace(/[\s\-]/g, ''))) {
          return res.status(400).send(
            generateErrorPage('Ungültige Telefonnummer', 'Bitte gib eine gültige Telefonnummer ein (z.B. +43 664 123 4567)')
          );
        }
        prefs.phone = cleanPhone;
      }

      if (whatsapp === 'true') {
        prefs.whatsappReminders = true;
      }

      await updateUserPreferences(email, prefs);
    }

    // Redirect to success page with RSVP info
    return res.status(200).send(
      generateSuccessPage(response, rsvps, event)
    );

  } catch (error) {
    console.error('[RSVP] Error:', error.message);
    return res.status(500).send(
      generateErrorPage('Server-Fehler', 'Etwas ist schiefgelaufen. Bitte versuche es später erneut.')
    );
  }
}

/**
 * Generate success page HTML
 */
function generateSuccessPage(response, rsvps, eventId) {
  const responseText = {
    yes: 'Zusage',
    no: 'Absage',
    maybe: 'Vielleicht'
  };

  const responseEmoji = {
    yes: '✓',
    no: '✗',
    maybe: '?'
  };

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSVP Bestätigt - KINN</title>
  <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Work Sans', sans-serif;
      background: linear-gradient(180deg, #ffffff 0%, #fafcfb 100%);
      color: #3A3A3A;
      line-height: 1.618;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .container {
      max-width: 500px;
      width: 100%;
      text-align: center;
      background: #fff;
      padding: 3rem 2rem;
      border-radius: 1rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      color: #5ED9A6;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 600;
      color: #2C3E50;
      margin-bottom: 0.5rem;
    }
    .response {
      font-size: 1.125rem;
      color: #6B6B6B;
      margin-bottom: 2rem;
    }
    .stats {
      background: rgba(94, 217, 166, 0.1);
      border-left: 3px solid #5ED9A6;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      margin-bottom: 2rem;
      text-align: left;
    }
    .stats h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: #2C3E50;
      margin-bottom: 0.5rem;
    }
    .stats-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      color: #6B6B6B;
      margin-bottom: 0.25rem;
    }
    .cta {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: #5ED9A6;
      color: #000;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    .cta:hover {
      background: #4EC995;
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${responseEmoji[response]}</div>
    <h1>Danke für deine ${responseText[response]}!</h1>
    <p class="response">Deine Antwort wurde erfolgreich gespeichert.</p>

    ${response === 'yes' ? `
    <div class="stats">
      <h3>Event-Statistik</h3>
      <div class="stats-row">
        <span>✓ Zusagen:</span>
        <strong>${rsvps.counts.yes} Personen</strong>
      </div>
      <div class="stats-row">
        <span>? Vielleicht:</span>
        <span>${rsvps.counts.maybe} Personen</span>
      </div>
      <div class="stats-row">
        <span>✗ Absagen:</span>
        <span>${rsvps.counts.no} Personen</span>
      </div>
    </div>
    ` : ''}

    <a href="https://kinn.at" class="cta">Zurück zu KINN</a>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate error page HTML
 */
function generateErrorPage(title, message) {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - KINN</title>
  <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Work Sans', sans-serif;
      background: linear-gradient(180deg, #ffffff 0%, #fafcfb 100%);
      color: #3A3A3A;
      line-height: 1.618;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .container {
      max-width: 500px;
      width: 100%;
      text-align: center;
      background: #fff;
      padding: 3rem 2rem;
      border-radius: 1rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      color: #dc3545;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 600;
      color: #2C3E50;
      margin-bottom: 0.5rem;
    }
    p {
      color: #6B6B6B;
      margin-bottom: 2rem;
    }
    .cta {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: #E0EEE9;
      color: #000;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    .cta:hover {
      background: #d0ddd4;
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://kinn.at" class="cta">Zurück zu KINN</a>
  </div>
</body>
</html>
  `.trim();
}
