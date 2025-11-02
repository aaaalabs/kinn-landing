import { Resend } from 'resend';
import { generateAuthToken } from '../utils/tokens.js';
import { getAllSubscribers, getEventsConfig, getProfile } from '../utils/redis.js';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Event Invite Email Template (HTML)
 * With RSVP buttons (Yes/No/Maybe)
 */
function generateEventInviteEmail(name, event, rsvpLinks) {
  const { yesUrl, noUrl, maybeUrl } = rsvpLinks;

  // Format date/time nicely
  const eventDate = new Date(event.start);
  const dateStr = eventDate.toLocaleDateString('de-AT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeStr = eventDate.toLocaleTimeString('de-AT', {
    hour: '2-digit',
    minute: '2-digit'
  });

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
          Der nächste <strong>KINN Treff</strong> steht an:
        </p>

        <div style="background: rgba(94, 217, 166, 0.08); padding: 1.5rem; border-radius: 12px; margin: 24px 0; border-left: 4px solid #5ED9A6;">
          <h2 style="margin: 0 0 0.75rem 0; font-size: 1.25rem; font-weight: 600; color: #2C3E50;">${event.title}</h2>
          <p style="margin: 0.5rem 0; font-size: 0.95rem; color: #666;">
            📅 ${dateStr}<br>
            🕐 ${timeStr} Uhr<br>
            ${event.type === 'online' || event.type === 'hybrid'
              ? `💻 <a href="${event.meetingLink}" style="color: #5ED9A6; text-decoration: none;">Meeting Link</a>`
              : `📍 ${event.location}`
            }
          </p>
          ${event.description ? `<p style="margin: 1rem 0 0 0; font-size: 0.9rem; color: #666;">${event.description}</p>` : ''}
        </div>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px; font-weight: 600;">
          Kommst du?
        </p>

        <!-- RSVP Buttons -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td style="text-align: center; padding-bottom: 12px;">
              <a href="${yesUrl}" style="background-color: #5ED9A6; color: #000; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; padding: 14px 32px; display: inline-block; min-width: 200px;">
                ✅ Ja, ich komme
              </a>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding-bottom: 12px;">
              <a href="${maybeUrl}" style="background-color: #FFA500; color: #000; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; padding: 14px 32px; display: inline-block; min-width: 200px;">
                ❓ Vielleicht
              </a>
            </td>
          </tr>
          <tr>
            <td style="text-align: center;">
              <a href="${noUrl}" style="background-color: #f0f0f0; color: #666; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; padding: 14px 32px; display: inline-block; min-width: 200px;">
                ❌ Kann nicht
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 14px; line-height: 1.6; color: #999; margin-top: 32px; text-align: center;">
          Ein Klick genügt – kein Login nötig.
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-top: 32px;">
          Bis bald!<br>
          <strong>Thomas</strong>
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
 * Event Invite Email Template (Plain Text)
 */
function generateEventInviteEmailPlainText(name, event, rsvpLinks) {
  const { yesUrl, noUrl, maybeUrl } = rsvpLinks;

  const eventDate = new Date(event.start);
  const dateStr = eventDate.toLocaleDateString('de-AT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeStr = eventDate.toLocaleTimeString('de-AT', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
Hey ${name}!

Der nächste KINN Treff steht an:

${event.title}
📅 ${dateStr}
🕐 ${timeStr} Uhr
${event.type === 'online' || event.type === 'hybrid'
    ? `💻 ${event.meetingLink}`
    : `📍 ${event.location}`
  }

${event.description || ''}

Kommst du?

✅ Ja, ich komme:
${yesUrl}

❓ Vielleicht:
${maybeUrl}

❌ Kann nicht:
${noUrl}

Ein Klick genügt – kein Login nötig.

Bis bald!
Thomas

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
 * Admin Endpoint: Send Event Invites
 * POST /api/admin/send-event-invites
 *
 * Sends event invitations with RSVP links to all subscribers
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

  try {
    const { eventId, sendTo = 'all' } = req.body;

    if (!eventId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'eventId is required'
      });
    }

    // Get event details
    const eventsConfig = await getEventsConfig();
    const event = eventsConfig.events.find(e => e.id === eventId);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        message: `Event ${eventId} does not exist`
      });
    }

    // Get all subscribers
    const allSubscribers = await getAllSubscribers();

    if (allSubscribers.length === 0) {
      return res.status(400).json({
        error: 'No subscribers',
        message: 'No subscribers to send invites to'
      });
    }

    console.log(`[SEND-INVITES] Sending ${event.title} to ${allSubscribers.length} subscribers`);

    const baseUrl = process.env.BASE_URL || 'https://kinn.at';
    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    // Send in batches of 10 (Resend rate limit: 10 emails/sec)
    for (let i = 0; i < allSubscribers.length; i += 10) {
      const batch = allSubscribers.slice(i, i + 10);

      await Promise.all(
        batch.map(async (email) => {
          try {
            // Get user profile for name (fallback to email)
            const profile = await getProfile(email);
            const name = profile?.identity?.name || email.split('@')[0];

            // Generate RSVP token (30 days validity)
            const rsvpToken = generateAuthToken(email);

            // Build RSVP URLs
            const rsvpLinks = {
              yesUrl: `${baseUrl}/api/rsvp?token=${rsvpToken}&event=${eventId}&response=yes`,
              noUrl: `${baseUrl}/api/rsvp?token=${rsvpToken}&event=${eventId}&response=no`,
              maybeUrl: `${baseUrl}/api/rsvp?token=${rsvpToken}&event=${eventId}&response=maybe`
            };

            // Send email
            await resend.emails.send({
              from: process.env.SENDER_EMAIL || 'KINN <thomas@kinn.at>',
              to: email,
              subject: `${event.title} – Bist du dabei?`,
              html: generateEventInviteEmail(name, event, rsvpLinks),
              text: generateEventInviteEmailPlainText(name, event, rsvpLinks),
              tags: [
                { name: 'type', value: 'event-invite' },
                { name: 'event_id', value: eventId }
              ]
            });

            results.sent++;
            console.log(`[SEND-INVITES] ✓ Sent to ${email}`);

          } catch (error) {
            results.failed++;
            results.errors.push({
              email,
              error: error.message
            });
            console.error(`[SEND-INVITES] ✗ Failed for ${email}:`, error.message);
          }
        })
      );

      // Rate limiting: wait 1 second between batches
      if (i + 10 < allSubscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[SEND-INVITES] Complete: ${results.sent} sent, ${results.failed} failed`);

    return res.status(200).json({
      success: true,
      message: `Event invites sent`,
      stats: {
        total: allSubscribers.length,
        sent: results.sent,
        failed: results.failed
      },
      errors: results.errors.length > 0 ? results.errors : undefined
    });

  } catch (error) {
    console.error('[SEND-INVITES] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to send event invites'
    });
  }
}
