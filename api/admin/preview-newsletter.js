import { render } from '@react-email/render';
import EventAnnouncement from '../../emails/event-announcement.js';
import { getEventsConfig } from '../utils/redis.js';

/**
 * Admin Endpoint: Preview Newsletter Email
 * GET /api/admin/preview-newsletter?eventId=X
 *
 * Renders React Email template for preview
 * Shows exactly what subscribers will receive
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

    // Render email with React Email (dummy data for preview)
    const html = await render(
      EventAnnouncement({
        name: 'Thomas', // Preview with dummy name
        event,
        rsvpLinks: {
          yesUrl: `${baseUrl}#preview-rsvp-yes`,
          maybeUrl: `${baseUrl}#preview-rsvp-maybe`,
          noUrl: `${baseUrl}#preview-rsvp-no`
        },
        unsubscribeUrl: `${baseUrl}/pages/profil.html#unsubscribe`
      })
    );

    // Return raw HTML (browser displays directly)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);

  } catch (error) {
    console.error('[PREVIEW-NEWSLETTER] Error:', error);
    res.status(500).send(`<h1>Error generating preview</h1><pre>${error.message}\n\n${error.stack}</pre>`);
  }
}
