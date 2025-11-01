import { verifyConfirmToken, generateProfileToken } from './utils/tokens.js';
import { addSubscriber, isSubscribed, updateUserPreferences, getUserPreferences } from './utils/redis.js';
import { generateBrandedError, ErrorTemplates } from './utils/branded-error.js';
import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Generate Welcome Email - Simple, spam-safe version
 * Links to website instead of direct webcal:// links
 * @param {string} profileToken - JWT token for profile management
 */
function generateWelcomeEmail(profileToken) {
  const baseUrl = process.env.BASE_URL || 'https://kinn.at';
  const calendarPageUrl = `${baseUrl}/pages/success.html?status=confirmed`;
  const profilePageUrl = `${baseUrl}/pages/profil.html?token=${profileToken}`;

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Work Sans', system-ui, -apple-system, sans-serif; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td style="padding: 0 20px;">
        <!-- Header -->
        <h1 style="font-size: 26px; line-height: 1.3; font-weight: 600; color: #2C3E50; margin-bottom: 16px; letter-spacing: 0.02em;">
          Willkommen beim KINN
        </h1>

        <!-- Body -->
        <p style="font-size: 16px; line-height: 1.6; color: #3A3A3A; margin-bottom: 16px;">
          Deine Email-Adresse ist jetzt bestätigt.
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #3A3A3A; margin-bottom: 24px;">
          Nächster Schritt: Abonniere den Event-Kalender, um keinen KI Treff in Innsbruck zu verpassen.
        </p>

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
          <tr>
            <td align="center">
              <a href="${calendarPageUrl}" style="display: inline-block; padding: 14px 32px; background-color: #5ED9A6; color: #000; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; letter-spacing: 0.01em;">
                Kalender-Abonnement einrichten
              </a>
            </td>
          </tr>
        </table>

        <!-- Info -->
        <p style="font-size: 14px; line-height: 1.6; color: #6B6B6B; margin-top: 24px; margin-bottom: 8px;">
          <strong>Was ist eine Kalender-Subscription?</strong>
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #6B6B6B; margin-bottom: 32px;">
          Neue Events erscheinen automatisch in deinem Kalender – keine weiteren Emails nötig. Funktioniert mit Google Calendar, Apple Kalender und Outlook.
        </p>

        <!-- Divider -->
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;">

        <!-- Profile CTA Section -->
        <h2 style="font-size: 18px; line-height: 1.3; font-weight: 600; color: #2C3E50; margin-bottom: 12px; letter-spacing: 0.01em;">
          Zeit sparen beim Stammtisch
        </h2>

        <p style="font-size: 14px; line-height: 1.6; color: #6B6B6B; margin-bottom: 16px;">
          Füll dein KINN Profil vorab aus (5 Min) und ich kann dich schon vorher mit passenden Leuten matchen:
        </p>

        <ul style="font-size: 14px; line-height: 1.8; color: #6B6B6B; margin: 0 0 24px 20px; padding: 0;">
          <li>Was du suchst (Jobs, Co-Founder, Projekte)</li>
          <li>Was du anbietest (Skills, Experience, Verfügbarkeit)</li>
        </ul>

        <!-- Profile Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${profilePageUrl}#profil" style="display: inline-block; padding: 12px 28px; background-color: #ffffff; color: #2C3E50; border: 2px solid #5ED9A6; text-decoration: none; border-radius: 12px; font-size: 15px; font-weight: 600; letter-spacing: 0.01em;">
                Profil ausfüllen
              </a>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;">

        <!-- Profile Settings Link -->
        <p style="font-size: 13px; line-height: 1.6; color: #6B6B6B; text-align: center; margin-bottom: 16px;">
          <a href="${profilePageUrl}" style="color: #5ED9A6; text-decoration: none; font-weight: 500;">Einstellungen verwalten</a> •
          Email-Benachrichtigungen anpassen oder abmelden
        </p>

        <!-- Divider -->
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">

        <!-- Footer -->
        <p style="font-size: 12px; line-height: 1.5; color: #999; text-align: center; margin-bottom: 8px;">
          KINN – Wo Tiroler KI Profil bekommt
        </p>

        <p style="font-size: 11px; line-height: 1.5; color: #999; text-align: center;">
          Bei Fragen: <a href="mailto:thomas@kinn.at" style="color: #999; text-decoration: none;">thomas@kinn.at</a> oder <a href="mailto:ki@in.kinn.at" style="color: #999; text-decoration: none;">ki@in.kinn.at</a>
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

    // [EH01] Log for debugging with User-Agent to detect prefetch
    const userAgent = req.headers['user-agent'] || 'unknown';
    const timestamp = new Date().toISOString();
    console.log('[CONFIRM] Verifying token...', {
      timestamp,
      userAgent: userAgent.substring(0, 100)
    });

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
      console.log(`[CONFIRM] Email already subscribed: ${email} (User-Agent: ${userAgent.substring(0, 60)})`);

      // Get existing profile token from user preferences
      const existingPrefs = await getUserPreferences(email);
      const existingToken = existingPrefs?.profileToken;

      if (existingToken) {
        return res.redirect(`/pages/success.html?status=already-subscribed&email=${encodeURIComponent(email)}&token=${existingToken}`);
      } else {
        return res.redirect(`/pages/success.html?status=already-subscribed&email=${encodeURIComponent(email)}`);
      }
    }

    // Add to Redis subscribers set
    const added = await addSubscriber(email);

    if (!added) {
      // This shouldn't happen since we checked isSubscribed, but handle it anyway
      console.warn(`[CONFIRM] Subscriber was already in set: ${email}`);
      return res.redirect(`/pages/success.html?status=already-subscribed&email=${encodeURIComponent(email)}`);
    }

    // Generate profile token for user preference management
    const profileToken = generateProfileToken(email);

    // Create initial user preferences in Redis
    await updateUserPreferences(email, {
      email,
      profileToken,
      notifications: {
        enabled: true // Default: notifications enabled
      },
      subscribedAt: new Date().toISOString()
    });

    // [EH01] Log success with timestamp to detect duplicate requests
    console.log(`[CONFIRM] New subscriber confirmed with profile: ${email}`, {
      timestamp: new Date().toISOString(),
      userAgent: userAgent.substring(0, 60)
    });

    // Send welcome email in background (don't block redirect)
    resend.emails.send({
      from: (process.env.SENDER_EMAIL || 'KINN <thomas@kinn.at>').trim(),
      to: email.trim(),
      subject: 'Willkommen beim KINN – Kalender-Abonnement',
      html: generateWelcomeEmail(profileToken),
    }).then(result => {
      console.log(`[CONFIRM] Welcome email sent: ${result.id}`);
    }).catch(error => {
      // Log but don't fail - user is already confirmed
      console.error('[CONFIRM] Welcome email failed:', error.message);
    });

    // Redirect to success page with profile token (don't wait for email)
    return res.redirect(`/pages/success.html?status=confirmed&email=${encodeURIComponent(email)}&token=${profileToken}`);

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
