import { getEventsConfig, getEventRSVPs } from '../utils/redis.js';
import { renderEventEmail } from '../../emails/render-event-email.js';

/**
 * Admin Endpoint: Preview Newsletter Email
 * GET /api/admin/preview-newsletter?eventId=X&format=both|text&baseAttendees=0
 *
 * Renders inline HTML or plain text preview
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
    const { eventId, format = 'both', baseAttendees = '0' } = req.query;

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

    // Get RSVP counts for social proof
    const rsvps = await getEventRSVPs(eventId);
    const eventBaseAttendees = event.baseAttendees || 0;
    const totalBase = parseInt(baseAttendees, 10) || eventBaseAttendees;
    const rsvpCounts = {
      yes: (rsvps?.counts?.yes || 0) + totalBase,
      maybe: rsvps?.counts?.maybe || 0
    };

    // Generate email content using shared template
    const { html, text } = renderEventEmail({
      name: 'Thomas',  // Preview uses placeholder name
      event,
      rsvpLinks: {
        yesUrl: `${baseUrl}#preview-rsvp-yes`,
        maybeUrl: `${baseUrl}#preview-rsvp-maybe`,
        noUrl: `${baseUrl}#preview-rsvp-no`
      },
      profileUrl: `${baseUrl}/api/auth/login?redirect=profil`,
      unsubscribeUrl: `${baseUrl}/api/auth/login?redirect=settings`,
      isTest: true,
      rsvpCounts
    });

    // TEXT FORMAT: Show plain text in styled container
    if (format === 'text') {
      const textPreviewHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <title>Plain Text Preview - ${event.title}</title>
  <style>
    body {
      font-family: 'Work Sans', sans-serif;
      background: #1a1a1a;
      color: #e0e0e0;
      padding: 40px 20px;
      margin: 0;
    }
    .container {
      max-width: 700px;
      margin: 0 auto;
    }
    .badge {
      display: inline-block;
      background: #5ED9A6;
      color: #000;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #fff;
    }
    .subtitle {
      color: #888;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      background: #252525;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .info-label { color: #888; }
    .info-value { color: #5ED9A6; }
    pre {
      background: #0d0d0d;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 24px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-x: auto;
      color: #d4d4d4;
    }
    .note {
      margin-top: 24px;
      padding: 16px;
      background: rgba(94, 217, 166, 0.1);
      border-left: 3px solid #5ED9A6;
      border-radius: 4px;
      font-size: 13px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">TEXT-ONLY PREVIEW</span>
    <h1>${event.title}</h1>
    <p class="subtitle">So sieht die Plain-Text-Version der Email aus</p>

    <div class="info-row">
      <span class="info-label">RSVP Counts (Social Proof)</span>
      <span class="info-value">${rsvpCounts.yes} Zusagen, ${rsvpCounts.maybe} Vielleicht</span>
    </div>
    <div class="info-row">
      <span class="info-label">Social Proof angezeigt?</span>
      <span class="info-value">${rsvpCounts.yes >= 10 ? 'Ja (10+ Zusagen)' : 'Nein (weniger als 10 Zusagen)'}</span>
    </div>

    <pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>

    <div class="note">
      <strong>Tipp:</strong> Plain-Text-Only Emails haben oft bessere Deliverability und landen seltener im Spam.
      Die Social Proof Zeile ("X+ Zusagen") wird nur angezeigt, wenn mindestens 10 Personen zugesagt haben.
    </div>
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(textPreviewHtml);
    }

    // HTML FORMAT (default): Show rendered email
    // Add preview badge
    const previewHtml = html.replace(
      '</body>',
      `<div style="position: fixed; top: 20px; right: 20px; background: #5ED9A6; color: #000; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: 'Work Sans', sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
        HTML + TEXT PREVIEW
      </div>
      <div style="position: fixed; bottom: 20px; left: 20px; background: #252525; color: #888; padding: 12px 16px; border-radius: 8px; font-size: 12px; font-family: 'Work Sans', sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
        RSVP: ${rsvpCounts.yes} Zusagen, ${rsvpCounts.maybe} Vielleicht
        ${rsvpCounts.yes >= 10 ? ' (Social Proof aktiv)' : ''}
      </div>
      </body>`
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(previewHtml);

  } catch (error) {
    console.error('[PREVIEW-NEWSLETTER] Error:', error);
    res.status(500).send(`<h1>Error generating preview</h1><pre>${error.message}\n\n${error.stack}</pre>`);
  }
}
