import { getEventsConfig } from '../utils/redis.js';

/**
 * Admin Endpoint: Preview Newsletter Email
 * GET /api/admin/preview-newsletter?eventId=X
 *
 * Renders email template with inline HTML (no React Email dependency)
 * SLC approach: Zero build step, just works
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).send('<h1>Method not allowed</h1>');
  }

  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).send('<h1>Missing eventId parameter</h1>');
    }

    // Get event
    const eventsConfig = await getEventsConfig();
    const event = eventsConfig.events.find(e => e.id === eventId);

    if (!event) {
      return res.status(404).send('<h1>Event not found</h1>');
    }

    const baseUrl = process.env.BASE_URL || 'https://kinn.at';

    // Format event date for Austria/Vienna timezone
    const eventDate = new Date(event.start);
    const dateStr = eventDate.toLocaleDateString('de-AT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Vienna'
    });
    const timeStr = eventDate.toLocaleTimeString('de-AT', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Vienna'
    });

    // Generate inline HTML email (matches EventAnnouncement template)
    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${event.title}</title>
</head>
<body style="margin: 0; padding: 20px 0 48px; background-color: #ffffff; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Arial', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

    <!-- Greeting -->
    <p style="font-size: 16px; line-height: 1.6; color: #3A3A3A; margin: 0 0 16px 0;">Hey Thomas!</p>

    <!-- Intro -->
    <p style="font-size: 16px; line-height: 1.6; color: #3A3A3A; margin: 0 0 16px 0;">
      Der nächste <strong>KINN Treff</strong> steht an:
    </p>

    <!-- Event Details Box -->
    <div style="background: rgba(94, 217, 166, 0.08); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #5ED9A6;">
      <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #2C3E50;">${event.title}</h2>
      <p style="font-size: 15px; line-height: 1.8; color: #666; margin: 0;">
        📅 ${dateStr}<br>
        🕐 ${timeStr} Uhr<br>
        ${event.type === 'online' || event.type === 'hybrid'
          ? `💻 <a href="${event.meetingLink || '#'}" style="color: #5ED9A6; text-decoration: none;">Meeting Link</a>`
          : `📍 ${event.location || ''}`
        }
      </p>
      ${event.description ? `
      <p style="font-size: 14px; line-height: 1.6; color: #666; margin: 16px 0 0 0;">
        ${event.description.replace(/\n/g, '<br>')}
      </p>` : ''}
    </div>

    <!-- RSVP Heading -->
    <p style="font-size: 16px; line-height: 1.6; font-weight: 600; color: #3A3A3A; margin: 0 0 16px 0;">Kommst du?</p>

    <!-- RSVP Buttons -->
    <div style="margin: 24px 0;">
      <div style="text-align: center; padding-bottom: 12px;">
        <a href="${baseUrl}#preview-rsvp-yes" style="display: inline-block; background-color: #5ED9A6; color: #000; font-weight: 600; border-radius: 8px; padding: 14px 32px; text-decoration: none; font-size: 16px; min-width: 200px; text-align: center;">
          ✅ Ja, ich komme
        </a>
      </div>
      <div style="text-align: center; padding-bottom: 12px;">
        <a href="${baseUrl}#preview-rsvp-maybe" style="display: inline-block; background-color: #FFA500; color: #000; font-weight: 600; border-radius: 8px; padding: 14px 32px; text-decoration: none; font-size: 16px; min-width: 200px; text-align: center;">
          ❓ Vielleicht
        </a>
      </div>
      <div style="text-align: center; padding-bottom: 12px;">
        <a href="${baseUrl}#preview-rsvp-no" style="display: inline-block; background-color: #f0f0f0; color: #666; font-weight: 600; border-radius: 8px; padding: 14px 32px; text-decoration: none; font-size: 16px; min-width: 200px; text-align: center;">
          ❌ Kann nicht
        </a>
      </div>
    </div>

    <!-- RSVP Meta -->
    <p style="font-size: 14px; line-height: 1.6; color: #999; margin: 32px 0 0 0; text-align: center;">
      Ein Klick genügt – kein Login nötig.
    </p>

    <!-- Signature -->
    <p style="font-size: 16px; line-height: 1.6; color: #3A3A3A; margin: 32px 0 0 0;">
      Bis bald!<br>
      <strong>Thomas</strong>
    </p>

    <!-- Footer -->
    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 12px; line-height: 1.6; color: #999; margin: 0; text-align: center;">
        <a href="${baseUrl}/pages/profil.html#unsubscribe" style="color: #999; text-decoration: underline;">Abmelden</a>
      </p>
    </div>

  </div>
</body>
</html>`;

    // Return raw HTML (browser displays directly)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);

  } catch (error) {
    console.error('[PREVIEW-NEWSLETTER] Error:', error);
    res.status(500).send(`<h1>Error generating preview</h1><pre>${error.message}\n\n${error.stack}</pre>`);
  }
}
