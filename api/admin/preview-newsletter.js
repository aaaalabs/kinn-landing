import { render } from '@react-email/render';
import EventAnnouncement from '../../emails/event-announcement';
import { getEventsConfig } from '../utils/redis.js';

/**
 * Admin Endpoint: Preview Newsletter Email
 * GET /api/admin/preview-newsletter?eventId=X
 *
 * Renders email template with dummy data for preview
 * No authentication required (just a template preview)
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

    console.log('[PREVIEW-NEWSLETTER] Fetching event:', eventId);

    // Get event
    const eventsConfig = await getEventsConfig();
    console.log('[PREVIEW-NEWSLETTER] Got events config:', eventsConfig?.events?.length || 0, 'events');

    const event = eventsConfig.events.find(e => e.id === eventId);

    if (!event) {
      console.error('[PREVIEW-NEWSLETTER] Event not found:', eventId);
      return res.status(404).send('<h1>Event not found</h1>');
    }

    console.log('[PREVIEW-NEWSLETTER] Found event:', event.title);

    const baseUrl = process.env.BASE_URL || 'https://kinn.at';

    console.log('[PREVIEW-NEWSLETTER] Rendering email template...');

    // Render email with dummy data for preview
    const html = await render(
      EventAnnouncement({
        name: 'Thomas', // Dummy name for preview
        event,
        rsvpLinks: {
          yesUrl: `${baseUrl}#preview-rsvp-yes`,
          maybeUrl: `${baseUrl}#preview-rsvp-maybe`,
          noUrl: `${baseUrl}#preview-rsvp-no`
        },
        unsubscribeUrl: `${baseUrl}/pages/profil.html#unsubscribe`
      })
    );

    console.log('[PREVIEW-NEWSLETTER] Email rendered successfully, length:', html.length);

    // Return raw HTML (browser displays directly)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);

  } catch (error) {
    console.error('[PREVIEW-NEWSLETTER] Error:', error);
    console.error('[PREVIEW-NEWSLETTER] Stack:', error.stack);
    res.status(500).send(`<h1>Error generating preview</h1><pre>${error.message}\n\n${error.stack}</pre>`);
  }
}
