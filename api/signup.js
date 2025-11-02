import { Resend } from 'resend';
import { generateConfirmToken } from './utils/tokens.js';
import { enforceRateLimit } from './utils/rate-limiter.js';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Opt-In Email Template (HTML)
 * Optimized for deliverability based on German best practices:
 * - Simple HTML (no images, minimal styling)
 * - No emojis (spam trigger in transactional emails)
 * - Personal sender name
 * - Clear CTA with explanation
 * - DSGVO compliant with Impressum
 */
function generateOptInEmail(confirmUrl) {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff; color: #333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td style="padding: 20px;">

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">Hallo,</p>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          vielen Dank für deine Anmeldung zum <strong>KINN KI Treff Innsbruck</strong>!
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          <strong>Bitte bestätige deine E-Mail-Adresse:</strong>
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${confirmUrl}" style="background-color: #5ED9A6; color: #000; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; padding: 14px 32px; display: inline-block;">
                Ja, ich möchte den Newsletter erhalten
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 14px; line-height: 1.6; color: #666; margin: 24px 0;">
          <strong>Warum dieser Schritt?</strong><br>
          Damit stellen wir sicher, dass nur du Zugriff auf deine Anmeldung hast und niemand unbefugt deine E-Mail-Adresse verwendet.
        </p>

        <p style="font-size: 14px; line-height: 1.6; color: #666; margin-bottom: 32px;">
          Dieser Bestätigungslink ist 48 Stunden gültig.
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-top: 32px;">
          Viele Grüße,<br>
          <strong>Thomas</strong><br>
          KINN
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;">

        <p style="font-size: 12px; line-height: 1.5; color: #999;">
          <strong>KINN – KI Treff Innsbruck</strong><br>
          Thomas Seiger<br>
          E-Mail: thomas@kinn.at<br>
          Web: <a href="https://kinn.at" style="color: #999;">kinn.at</a>
        </p>

        <p style="font-size: 11px; line-height: 1.5; color: #999; margin-top: 16px;">
          <a href="https://kinn.at/pages/privacy.html" style="color: #999; text-decoration: none;">Datenschutz</a> |
          <a href="https://kinn.at/pages/agb.html" style="color: #999; text-decoration: none;">Impressum</a>
        </p>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Opt-In Email Template (Plain Text)
 * Plain text version for better deliverability and spam filter compatibility
 */
function generateOptInEmailPlainText(confirmUrl) {
  return `
Hallo,

vielen Dank für deine Anmeldung zum KINN KI Treff Innsbruck!

Bitte bestätige deine E-Mail-Adresse:

${confirmUrl}

Warum dieser Schritt?
Damit stellen wir sicher, dass nur du Zugriff auf deine Anmeldung hast und niemand unbefugt deine E-Mail-Adresse verwendet.

Dieser Bestätigungslink ist 48 Stunden gültig.

Viele Grüße,
Thomas
KINN

---

KINN – KI Treff Innsbruck
Thomas Seiger
E-Mail: thomas@kinn.at
Web: https://kinn.at

Datenschutz: https://kinn.at/pages/privacy.html
Impressum: https://kinn.at/pages/agb.html
  `.trim();
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://kinn.at',
  'https://www.kinn.at',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:8000', 'http://localhost:3000'] : [])
];

/**
 * Get CORS headers for request origin
 */
function getCorsHeaders(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true'
    };
  }
  return {};
}

/**
 * Serverless function to handle signup email via Resend API
 *
 * [CP01] KISS: Simple request/response pattern
 * [EH02] User-friendly error messages
 * [SC02] Input validation
 */
export default async function handler(req, res) {
  // Set CORS headers based on origin
  const origin = req.headers.origin;
  const corsHeaders = getCorsHeaders(origin);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
  }

  // Rate limiting: 10 requests per minute per IP
  const rateLimitAllowed = await enforceRateLimit(req, res, {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'ratelimit:signup'
  });

  if (!rateLimitAllowed) {
    return; // Response already sent by enforceRateLimit
  }

  try {
    // [SC02] Validate input
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Email address is required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // [EH01] Log for debugging (without sensitive data)
    console.log(`[SIGNUP] Processing request for domain: ${email.split('@')[1]}`);

    // Generate confirmation token (48h expiry)
    const confirmToken = generateConfirmToken(email);
    const confirmUrl = `${process.env.BASE_URL || 'https://kinn.at'}/api/confirm?token=${confirmToken}`;

    // Generate HTML and Plain Text emails
    const optInHtml = generateOptInEmail(confirmUrl);
    const optInText = generateOptInEmailPlainText(confirmUrl);

    // Send TWO emails in parallel for speed
    const [adminEmail, userEmail] = await Promise.all([
      // 1. Admin notification to treff@in.kinn.at
      resend.emails.send({
        from: (process.env.SENDER_EMAIL || 'KINN <thomas@kinn.at>').trim(),
        to: (process.env.RECIPIENT_EMAIL || 'treff@in.kinn.at').trim(),
        subject: 'Neue Anmeldung: KI Treff Verteiler',
        html: `
          <h2>Neue Anmeldung für den KI Treff Verteiler</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Zeitstempel:</strong> ${new Date().toLocaleString('de-AT', {
            timeZone: 'Europe/Vienna'
          })}</p>
          <p><strong>Status:</strong> Wartet auf Bestätigung</p>
          <hr>
          <p><em>Automatisch generiert von in.kinn.at</em></p>
        `,
      }),

      // 2. Opt-in confirmation to user (optimized for deliverability)
      resend.emails.send({
        from: (process.env.SENDER_EMAIL || 'Thomas (von KINN) <thomas@kinn.at>').trim(),
        to: email.trim(),
        subject: 'Noch ein Klick: Deine Newsletter-Anmeldung bestätigen',
        html: optInHtml,
        text: optInText,
        headers: {
          'List-Unsubscribe': `<mailto:thomas@kinn.at?subject=Abmelden>, <https://kinn.at/pages/privacy.html>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    ]);

    // [EH01] Log success
    console.log(`[SIGNUP] Dual emails sent - Admin: ${adminEmail.id}, User: ${userEmail.id}`);

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Anmeldung erfolgreich! Check deine Inbox für die Bestätigung.',
      emailIds: {
        admin: adminEmail.id,
        user: userEmail.id,
      }
    });

  } catch (error) {
    // [EH01] Contextual logging
    console.error('[SIGNUP] Error sending email:', {
      message: error.message,
      name: error.name,
      // Don't log full stack trace in production
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });

    // [EH02] User-friendly error response
    // NO FALLBACKS - fail fast as per CLAUDE.md
    return res.status(500).json({
      error: 'Email delivery failed',
      message: 'Die Anmeldung konnte nicht verarbeitet werden. Bitte versuche es später erneut.',
      // Include error details in dev mode only
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}
