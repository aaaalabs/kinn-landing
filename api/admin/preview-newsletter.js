import { getEventsConfig } from '../utils/redis.js';

/**
 * Admin Endpoint: Preview Newsletter Email
 * GET /api/admin/preview-newsletter?eventId=X
 *
 * Renders inline HTML preview (professional Google Calendar design)
 * Matches React Email template design
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

    // Format event date
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

    // Event type badge text
    const badgeText = event.type === 'online' ? '🌐 Online Event' :
                      event.type === 'hybrid' ? '🔀 Hybrid Event' :
                      '📍 Präsenz Event';

    // Generate professional inline HTML (matches React Email design)
    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <title>${event.title}</title>
</head>
<body style="margin: 0; padding: 40px 20px; background-color: #FFFFFF; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Arial', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto;">

    <!-- Header with Logo -->
    <div style="text-align: center; margin-bottom: 32px; padding-top: 20px;">
      <img src="https://kinn.at/logo.svg" width="120" alt="KINN Logo" style="margin: 0 auto; display: block;">
    </div>

    <!-- Event Type Badge -->
    <div style="text-align: center; margin-top: 24px; margin-bottom: 16px;">
      <span style="display: inline-block; background-color: #E0EEE9; color: #1A1A1A; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 500;">
        ${badgeText}
      </span>
    </div>

    <!-- Main Heading -->
    <h1 style="font-size: 32px; font-weight: 700; color: #1A1A1A; text-align: center; line-height: 1.2; margin: 24px 0; padding: 0;">
      ${event.title}
    </h1>

    <!-- Greeting & Intro -->
    <p style="font-size: 16px; line-height: 1.6; color: #3A3A3A; margin: 24px 0 8px 0;">Hey Thomas!</p>
    <p style="font-size: 16px; line-height: 1.6; color: #3A3A3A; margin: 0;">
      Der nächste <strong>KINN Treff</strong> steht an:
    </p>

    <!-- Event Details Card -->
    <div style="background-color: #F8F8F8; padding: 24px; border-radius: 12px; margin: 24px 0;">
      <p style="font-size: 13px; font-weight: 600; color: #6B6B6B; margin: 12px 0 4px 0;">📅 Datum</p>
      <p style="font-size: 16px; font-weight: 500; color: #1A1A1A; margin: 0;">${dateStr}</p>

      <p style="font-size: 13px; font-weight: 600; color: #6B6B6B; margin: 12px 0 4px 0;">⏰ Uhrzeit</p>
      <p style="font-size: 16px; font-weight: 500; color: #1A1A1A; margin: 0;">${timeStr} Uhr</p>

      ${(event.type === 'in-person' || event.type === 'hybrid') && event.location ? `
      <p style="font-size: 13px; font-weight: 600; color: #6B6B6B; margin: 12px 0 4px 0;">📍 Ort</p>
      <p style="font-size: 16px; font-weight: 500; color: #1A1A1A; margin: 0;">${event.location}</p>
      ` : ''}

      ${(event.type === 'online' || event.type === 'hybrid') && event.meetingLink ? `
      <p style="font-size: 13px; font-weight: 600; color: #6B6B6B; margin: 12px 0 4px 0;">💻 Online-Teilnahme</p>
      <p style="font-size: 16px; font-weight: 500; color: #1A1A1A; margin: 0;">
        <a href="${event.meetingLink}" style="color: #5ED9A6; text-decoration: none; font-weight: 500;">Meeting Link →</a>
      </p>
      ` : ''}
    </div>

    <!-- Description -->
    ${event.description ? `
    <p style="font-size: 16px; line-height: 1.618; color: #3A3A3A; margin: 0;">
      ${event.description.replace(/\n/g, '<br>')}
    </p>
    ` : ''}

    <!-- Meeting Link Section (Online/Hybrid) -->
    ${(event.type === 'online' || event.type === 'hybrid') && event.meetingLink ? `
    <div style="background-color: #E8F4FD; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
      <p style="font-weight: 600; font-size: 16px; margin: 0 0 12px 0; color: #1A1A1A;">
        ${event.type === 'hybrid' ? '🎥 Online-Teilnahme auch möglich' : '🎥 Online-Meeting'}
      </p>
      <a href="${event.meetingLink}" style="display: inline-block; background-color: #5ED9A6; color: #000; font-weight: 600; border-radius: 8px; padding: 14px 32px; text-decoration: none; font-size: 16px; margin: 12px 0;">
        Meeting beitreten →
      </a>
      <p style="font-size: 13px; color: #6B6B6B; margin: 12px 0 0 0;">Link wird 15 Minuten vor Beginn aktiviert</p>
    </div>
    ` : ''}

    <!-- RSVP Section -->
    <div style="margin: 32px 0;">
      <p style="font-size: 18px; font-weight: 600; text-align: center; color: #1A1A1A; margin: 0 0 20px 0;">
        Wirst du dabei sein?
      </p>

      <div style="text-align: center; padding-bottom: 12px;">
        <a href="${baseUrl}#preview-rsvp-yes" style="display: inline-block; background-color: #5ED9A6; color: #000; font-weight: 600; border-radius: 8px; padding: 14px 32px; text-decoration: none; font-size: 16px; min-width: 200px; text-align: center;">
          ✓ Zusagen
        </a>
      </div>

      <div style="text-align: center; padding-bottom: 12px;">
        <a href="${baseUrl}#preview-rsvp-maybe" style="display: inline-block; background-color: #FFA500; color: #000; font-weight: 600; border-radius: 8px; padding: 14px 32px; text-decoration: none; font-size: 16px; min-width: 200px; text-align: center;">
          ? Vielleicht
        </a>
      </div>

      <div style="text-align: center; padding-bottom: 12px;">
        <a href="${baseUrl}#preview-rsvp-no" style="display: inline-block; background-color: #f0f0f0; color: #666; font-weight: 600; border-radius: 8px; padding: 14px 32px; text-decoration: none; font-size: 16px; min-width: 200px; text-align: center;">
          ✗ Absagen
        </a>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #999; margin: 32px 0 0 0; text-align: center;">
        Ein Klick genügt – kein Login nötig.
      </p>
    </div>

    <!-- Profile CTA Section -->
    <div style="margin: 32px 0 24px 0; padding: 24px; background-color: #F8F9FA; border-radius: 12px; border-left: 4px solid #5ED9A6;">
      <p style="font-size: 15px; font-weight: 600; color: #1A1A1A; margin: 0 0 8px 0;">
        Hilf uns, das Event auf dich zuzuschneiden
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #6B6B6B; margin: 0 0 16px 0;">
        Mit deinem Profil wissen wir, welche Themen dich interessieren und
        mit wem wir dich vernetzen können. So wird der Treff für alle wertvoller.
      </p>
      <a href="${baseUrl}/api/auth/login?redirect=profil" style="font-size: 14px; font-weight: 600; color: #5ED9A6; text-decoration: none;">
        Profil aktualisieren →
      </a>
    </div>

    <!-- Signature -->
    <p style="font-size: 16px; line-height: 1.6; color: #3A3A3A; margin: 32px 0;">
      Bis bald!<br>
      <strong>Thomas</strong>
    </p>

    <!-- Footer -->
    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 12px; line-height: 1.6; color: #999; margin: 0; text-align: center;">
        <a href="${baseUrl}/api/auth/login?redirect=settings" style="color: #999; text-decoration: underline;">Abmelden</a>
        <span style="font-size: 10px; color: #ccc;"> (+ token in production)</span>
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
