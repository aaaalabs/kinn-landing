import { Resend } from 'resend';
import { generateConfirmToken } from '../utils/tokens.js';
import { isSubscribed } from '../utils/redis.js';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Invite Email Template (HTML)
 * Personalized invitation from admin/organizer
 */
function generateInviteEmail(name, confirmUrl, invitedBy = 'Thomas') {
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

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">Hey ${name}!</p>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          <strong>${invitedBy}</strong> hat dich zu <strong>KINN</strong> eingeladen – der AI Community in Tirol.
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          <strong>Was ist KINN?</strong><br>
          Monatlicher AI Treff in Innsbruck + Skills-Matching mit anderen AI Devs, Freelancern und Studenten in der Region.
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          <strong>Bist du dabei?</strong>
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${confirmUrl}" style="background-color: #5ED9A6; color: #000; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; padding: 14px 32px; display: inline-block;">
                Ja, Einladung annehmen
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 14px; line-height: 1.6; color: #666; margin: 24px 0;">
          <strong>Nach der Anmeldung kannst du:</strong><br>
          → Dein Skills-Profil erstellen<br>
          → Events abonnieren (Google Calendar, Apple Kalender, Outlook)<br>
          → Andere AI Devs in Tirol kennenlernen
        </p>

        <p style="font-size: 14px; line-height: 1.6; color: #666; margin-bottom: 32px;">
          Dieser Einladungslink ist 7 Tage gültig.
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-top: 32px;">
          <strong>Bis bald beim nächsten KINN Treff!</strong><br>
          ${invitedBy}
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
 * Invite Email Template (Plain Text)
 */
function generateInviteEmailPlainText(name, confirmUrl, invitedBy = 'Thomas') {
  return `
Hey ${name}!

${invitedBy} hat dich zu KINN eingeladen – der AI Community in Tirol.

Was ist KINN?
Monatlicher AI Treff in Innsbruck + Skills-Matching mit anderen AI Devs, Freelancern und Studenten in der Region.

Bist du dabei?

Ja, Einladung annehmen:
${confirmUrl}

Nach der Anmeldung kannst du:
→ Dein Skills-Profil erstellen
→ Events abonnieren (Google Calendar, Apple Kalender, Outlook)
→ Andere AI Devs in Tirol kennenlernen

Dieser Einladungslink ist 7 Tage gültig.

Bis bald beim nächsten KINN Treff!
${invitedBy}

---
KINN – KI Treff Innsbruck
Thomas Seiger
E-Mail: thomas@kinn.at
Web: kinn.at

Datenschutz: https://kinn.at/pages/privacy.html
Impressum: https://kinn.at/pages/agb.html
  `.trim();
}

/**
 * Admin Endpoint: Send Invite
 * POST /api/admin/invite
 *
 * Sends personalized invite email to someone the admin met at an event.
 * Reuses existing confirmation flow (same as signup).
 *
 * Requires Bearer token (ADMIN_PASSWORD)
 */
export default async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check admin auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  if (token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Extract and validate data
  const { name, email, invitedBy } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Name and email are required'
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedName = name.trim();
  const normalizedInvitedBy = invitedBy?.trim() || 'Thomas';

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      error: 'Invalid email format',
      message: 'Please provide a valid email address'
    });
  }

  try {
    // Check if already subscribed
    const alreadySubscribed = await isSubscribed(normalizedEmail);
    if (alreadySubscribed) {
      return res.status(409).json({
        error: 'Already subscribed',
        message: `${normalizedEmail} is already a KINN member`
      });
    }

    // Generate confirmation token (7 days expiry for invites)
    const confirmToken = generateConfirmToken(normalizedEmail, '7d');

    // Build confirmation URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const confirmUrl = `${baseUrl}/api/confirm?token=${confirmToken}`;

    // Send personalized invite email
    const emailResult = await resend.emails.send({
      from: process.env.SENDER_EMAIL || 'KINN <thomas@kinn.at>',
      to: normalizedEmail,
      subject: `${normalizedInvitedBy} hat dich zu KINN eingeladen`,
      html: generateInviteEmail(normalizedName, confirmUrl, normalizedInvitedBy),
      text: generateInviteEmailPlainText(normalizedName, confirmUrl, normalizedInvitedBy),
      // Add tags for tracking
      tags: [
        { name: 'type', value: 'invite' },
        { name: 'invited_by', value: normalizedInvitedBy }
      ]
    });

    console.log('[INVITE] Invite sent to:', normalizedEmail, 'by:', normalizedInvitedBy);

    return res.status(200).json({
      success: true,
      message: `Invite sent to ${normalizedName} (${normalizedEmail})`,
      emailId: emailResult.id
    });

  } catch (error) {
    console.error('[INVITE] Error sending invite:', error);

    // Handle Resend API errors
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: 'Email delivery failed',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to send invite email'
    });
  }
}
