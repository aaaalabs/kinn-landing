import { Resend } from 'resend';
import { generateConfirmToken } from './utils/tokens.js';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Opt-In Email Template (plain HTML for reliability)
function generateOptInEmail(confirmUrl) {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; padding: 20px 0 48px;">
    <tr>
      <td style="padding: 40px;">
        <h1 style="font-size: 24px; line-height: 1.3; font-weight: 300; color: #333; margin-bottom: 20px;">Servus! 👋</h1>

        <p style="font-size: 16px; line-height: 1.618; color: #000; margin-bottom: 16px;">
          Du hast dich für den <strong>KINN KI Treff Innsbruck</strong> eingetragen.
        </p>

        <p style="font-size: 16px; line-height: 1.618; color: #000; margin-bottom: 16px;">
          Ein Klick, und du bekommst alle KI-Events direkt in deinen Google Kalender – <strong>kein Newsletter, keine Spam-Mails</strong>.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="text-align: center; margin: 32px 0;">
          <tr>
            <td>
              <a href="${confirmUrl}" style="background-color: #E0EEE9; border-radius: 12px; color: #000; font-size: 14px; font-weight: 600; text-decoration: none; text-align: center; display: inline-block; padding: 12px 24px;">
                Ja, ich bin dabei! 🧠
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 12px; line-height: 1.5; color: #666; text-align: center;">
          Dieser Link ist 48 Stunden gültig.
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;">

        <p style="font-size: 12px; line-height: 1.5; color: #ccc; text-align: center; text-transform: uppercase; letter-spacing: 0.05em;">
          KINN – Wo Tiroler KI Profil bekommt
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Serverless function to handle signup email via Resend API
 *
 * [CP01] KISS: Simple request/response pattern
 * [EH02] User-friendly error messages
 * [SC02] Input validation
 */
export default async function handler(req, res) {
  // Set CORS headers
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

    // Generate HTML email
    const optInHtml = generateOptInEmail(confirmUrl);

    // Send TWO emails in parallel for speed
    const [adminEmail, userEmail] = await Promise.all([
      // 1. Admin notification to treff@in.kinn.at
      resend.emails.send({
        from: (process.env.SENDER_EMAIL || 'KINN <noreply@in.kinn.at>').trim(),
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

      // 2. Opt-in confirmation to user with React Email template
      resend.emails.send({
        from: (process.env.SENDER_EMAIL || 'KINN <noreply@in.kinn.at>').trim(),
        to: email.trim(),
        subject: 'Bestätige deine Anmeldung zum KINN KI Treff',
        html: optInHtml,
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
