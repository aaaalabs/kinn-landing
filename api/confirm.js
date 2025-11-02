import { verifyConfirmToken, generateProfileToken } from './utils/tokens.js';
import { addSubscriber, isSubscribed, updateUserPreferences, getUserPreferences } from './utils/redis.js';
import { generateBrandedError, ErrorTemplates } from './utils/branded-error.js';
import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Generate Welcome Email (HTML)
 * Optimized for deliverability based on German best practices:
 * - Simple HTML structure
 * - Personal greeting and sign-off
 * - Maximum 2-3 links
 * - Clear value proposition
 * - DSGVO compliant with Impressum
 */
function generateWelcomeEmail(profileToken) {
  const baseUrl = process.env.BASE_URL || 'https://kinn.at';
  const calendarPageUrl = `${baseUrl}/pages/success.html?status=confirmed&token=${profileToken}`;
  const profilePageUrl = `${baseUrl}/pages/profil.html?token=${profileToken}`;

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
          <strong>deine E-Mail-Adresse ist jetzt bestätigt!</strong>
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Nächster Schritt: Abonniere den Event-Kalender, um keinen KI Treff in Innsbruck zu verpassen.
        </p>

        <!-- Primary CTA -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${calendarPageUrl}" style="background-color: #5ED9A6; color: #000; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; padding: 14px 32px; display: inline-block;">
                Kalender abonnieren
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 14px; line-height: 1.6; color: #666; margin: 24px 0;">
          <strong>Was ist eine Kalender-Subscription?</strong><br>
          Neue Events erscheinen automatisch in deinem Kalender – keine weiteren Emails nötig.
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;">

        <!-- Optional Profile Section -->
        <p style="font-size: 14px; line-height: 1.6; color: #666; margin-bottom: 16px;">
          Optional: Füll dein <a href="${profilePageUrl}" style="color: #5ED9A6; text-decoration: none; font-weight: 500;">KINN Profil</a> aus (5 Min), damit ich dich beim Stammtisch mit passenden Leuten matchen kann.
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-top: 32px;">
          Viele Grüße,<br>
          <strong>Thomas</strong><br>
          KINN
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;">

        <!-- Impressum (DSGVO Requirement) -->
        <p style="font-size: 12px; line-height: 1.5; color: #999;">
          <strong>KINN – KI Treff Innsbruck</strong><br>
          Thomas Seiger<br>
          E-Mail: thomas@kinn.at<br>
          Web: <a href="https://kinn.at" style="color: #999;">kinn.at</a>
        </p>

        <p style="font-size: 11px; line-height: 1.5; color: #999; margin-top: 16px;">
          <a href="https://kinn.at/pages/privacy.html" style="color: #999; text-decoration: none;">Datenschutz</a> |
          <a href="https://kinn.at/pages/agb.html" style="color: #999; text-decoration: none;">Impressum</a> |
          <a href="${profilePageUrl}" style="color: #999; text-decoration: none;">Abmelden</a>
        </p>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate Welcome Email (Plain Text)
 * Plain text version for better deliverability and spam filter compatibility
 */
function generateWelcomeEmailPlainText(profileToken) {
  const baseUrl = process.env.BASE_URL || 'https://kinn.at';
  const calendarPageUrl = `${baseUrl}/pages/success.html?status=confirmed&token=${profileToken}`;
  const profilePageUrl = `${baseUrl}/pages/profil.html?token=${profileToken}`;

  return `
Hallo,

deine E-Mail-Adresse ist jetzt bestätigt!

Nächster Schritt: Abonniere den Event-Kalender, um keinen KI Treff in Innsbruck zu verpassen.

Kalender abonnieren:
${calendarPageUrl}

Was ist eine Kalender-Subscription?
Neue Events erscheinen automatisch in deinem Kalender – keine weiteren Emails nötig.

---

Optional: Füll dein KINN Profil aus (5 Min), damit ich dich beim Stammtisch mit passenden Leuten matchen kann.

Profil: ${profilePageUrl}

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
Abmelden: ${profilePageUrl}
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

    // Generate single auth token (30 days) - used for both email links and dashboard sessions
    const authToken = generateProfileToken(email);

    // Create initial user preferences in Redis (no need to store token - JWT is self-contained)
    await updateUserPreferences(email, {
      email,
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

    // Send welcome email (wait for it to ensure it gets sent)
    try {
      const emailResult = await resend.emails.send({
        from: (process.env.SENDER_EMAIL || 'Thomas @ KINN <thomas@kinn.at>').trim(),
        to: email.trim(),
        subject: 'Willkommen beim KINN',
        html: generateWelcomeEmail(authToken),
        text: generateWelcomeEmailPlainText(authToken),
        headers: {
          'List-Unsubscribe': `<mailto:thomas@kinn.at?subject=Abmelden>, <${process.env.BASE_URL || 'https://kinn.at'}/pages/profil.html?token=${authToken}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      console.log(`[CONFIRM] Welcome email sent: ${emailResult.id}`);
    } catch (emailError) {
      // Log but don't fail - user is already confirmed
      console.error('[CONFIRM] Welcome email failed:', emailError.message);
    }

    // Redirect to success page with auth token (30 days)
    // Token will be stored in localStorage for auto-login to dashboard
    return res.redirect(`/pages/success.html?status=confirmed&email=${encodeURIComponent(email)}&token=${authToken}`);

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
