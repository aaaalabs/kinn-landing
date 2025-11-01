import { verifyConfirmToken } from './utils/tokens.js';
import { addSubscriber, isSubscribed } from './utils/redis.js';
import { generateBrandedError, ErrorTemplates } from './utils/branded-error.js';
import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Generate Welcome Email with calendar subscription links
 */
function generateWelcomeEmail() {
  const baseUrl = process.env.BASE_URL || 'https://kinn.at';
  const googleCalUrl = `https://calendar.google.com/calendar/u/0/r/settings/addbyurl?url=${baseUrl}/api/calendar.ics`;
  const webcalUrl = `webcal://${baseUrl.replace('https://', '').replace('http://', '')}/api/calendar.ics`;

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
        <h1 style="font-size: 24px; line-height: 1.3; font-weight: 300; color: #333; margin-bottom: 20px;">Willkommen beim KINN! 🎉</h1>

        <p style="font-size: 16px; line-height: 1.618; color: #000; margin-bottom: 16px;">
          Deine Email-Adresse ist jetzt bestätigt!
        </p>

        <p style="font-size: 16px; line-height: 1.618; color: #000; margin-bottom: 16px;">
          <strong>Nächster Schritt:</strong> Abonniere den KINN Event-Kalender und verpasse keinen KI Treff mehr.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
          <tr>
            <td style="padding-bottom: 12px;">
              <a href="${googleCalUrl}" style="background-color: #E0EEE9; border-radius: 12px; color: #000; font-size: 14px; font-weight: 600; text-decoration: none; text-align: center; display: block; padding: 14px 24px;">
                📅 Zu Google Calendar hinzufügen
              </a>
            </td>
          </tr>
          <tr>
            <td>
              <a href="${webcalUrl}" style="background-color: #f5f5f5; border-radius: 12px; color: #000; font-size: 14px; font-weight: 600; text-decoration: none; text-align: center; display: block; padding: 14px 24px;">
                📱 Andere Kalender (Apple, Outlook, etc.)
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 14px; line-height: 1.618; color: #666; margin-bottom: 16px;">
          <strong>Was ist eine Kalender-Subscription?</strong><br>
          Neue Events erscheinen automatisch in deinem Kalender – keine weiteren Emails nötig.
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;">

        <p style="font-size: 12px; line-height: 1.5; color: #ccc; text-align: center; text-transform: uppercase; letter-spacing: 0.05em;">
          KINN – Wo Tiroler KI Profil bekommt
        </p>

        <p style="font-size: 11px; line-height: 1.5; color: #999; text-align: center; margin-top: 16px;">
          Bei Fragen: <a href="mailto:thomas@kinn.at" style="color: #999;">thomas@kinn.at</a> oder <a href="mailto:ki@in.kinn.at" style="color: #999;">ki@in.kinn.at</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Confirmation endpoint for email opt-in
 * Verifies JWT token and adds subscriber to Redis
 *
 * [CP01] KISS: Simple GET → verify → store → redirect
 * [EH02] User-friendly error messages
 */
export default async function handler(req, res) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are accepted'
    });
  }

  try {
    // Extract token from query params
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(
        generateBrandedError({
          ...ErrorTemplates.invalidRequest,
          title: 'Ungültiger Link',
          message: 'Der Bestätigungslink ist ungültig oder fehlt.'
        })
      );
    }

    // [EH01] Log for debugging
    console.log('[CONFIRM] Verifying token...');

    // Verify token and extract email
    const email = verifyConfirmToken(token);

    if (!email) {
      console.error('[CONFIRM] Token verification failed');
      return res.status(400).send(
        generateBrandedError({
          ...ErrorTemplates.tokenExpired,
          details: 'Bitte melde dich erneut an, um einen neuen Link zu erhalten.'
        })
      );
    }

    // Check if already subscribed
    const alreadySubscribed = await isSubscribed(email);

    if (alreadySubscribed) {
      console.log(`[CONFIRM] Email already subscribed: ${email}`);
      return res.redirect(`/pages/success.html?status=already-subscribed&email=${encodeURIComponent(email)}`);
    }

    // Add to Redis subscribers set
    const added = await addSubscriber(email);

    if (!added) {
      // This shouldn't happen since we checked isSubscribed, but handle it anyway
      console.warn(`[CONFIRM] Subscriber was already in set: ${email}`);
      return res.redirect(`/pages/success.html?status=already-subscribed&email=${encodeURIComponent(email)}`);
    }

    // [EH01] Log success
    console.log(`[CONFIRM] New subscriber confirmed: ${email}`);

    // Send welcome email in background (don't block redirect)
    resend.emails.send({
      from: (process.env.SENDER_EMAIL || 'KINN <thomas@kinn.at>').trim(),
      to: email.trim(),
      subject: 'Willkommen beim KINN – Kalender abonnieren! 📅',
      html: generateWelcomeEmail(),
    }).then(result => {
      console.log(`[CONFIRM] Welcome email sent: ${result.id}`);
    }).catch(error => {
      // Log but don't fail - user is already confirmed
      console.error('[CONFIRM] Welcome email failed:', error.message);
    });

    // Redirect to success page (don't wait for email)
    return res.redirect(`/pages/success.html?status=confirmed&email=${encodeURIComponent(email)}`);

  } catch (error) {
    // [EH01] Contextual logging
    console.error('[CONFIRM] Error processing confirmation:', {
      message: error.message,
      name: error.name,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });

    // [EH02] User-friendly error response
    return res.status(500).send(
      generateBrandedError({
        ...ErrorTemplates.serverError,
        message: 'Die Bestätigung konnte nicht verarbeitet werden.',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Bitte versuche es später erneut.'
      })
    );
  }
}
