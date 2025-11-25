import { getEventsConfig, getEventRSVPs } from '../utils/redis.js';
import { renderEventEmail } from '../../emails/render-event-email.js';

/**
 * Admin Endpoint: Preview Newsletter Email
 * GET /api/admin/preview-newsletter?eventId=X&format=both|text&baseAttendees=0
 *
 * Renders inline HTML preview
 * - format=both: Rich HTML with buttons, cards, styling
 * - format=text: Simple HTML (text-like, but with <strong>, clickable links)
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
    const { html, simpleHtml } = renderEventEmail({
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

    // SIMPLE HTML FORMAT
    if (format === 'text') {
      const simpleHtmlWithBadge = simpleHtml.replace(
        '</body>',
        `<div style="position: fixed; top: 20px; right: 20px; background: #5ED9A6; color: #000; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: -apple-system, sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          SIMPLE HTML PREVIEW
        </div>
        <div style="position: fixed; bottom: 20px; left: 20px; background: #252525; color: #888; padding: 12px 16px; border-radius: 8px; font-size: 12px; font-family: -apple-system, sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          RSVP: ${rsvpCounts.yes} Zusagen, ${rsvpCounts.maybe} Vielleicht
          ${rsvpCounts.yes >= 10 ? ' (Social Proof aktiv)' : ''}
        </div>
        </body>`
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(simpleHtmlWithBadge);
    }

    // RICH HTML FORMAT (default)
    const previewHtml = html.replace(
      '</body>',
      `<div style="position: fixed; top: 20px; right: 20px; background: #5ED9A6; color: #000; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: 'Work Sans', sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
        RICH HTML PREVIEW
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
