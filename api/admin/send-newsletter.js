import { Resend } from 'resend';
import { render } from '@react-email/render';
import EventAnnouncement from '../../emails/event-announcement';
import { isAuthenticated } from '../utils/auth.js';
import { getAllSubscribers, getEventsConfig, getProfile, getUserPreferences } from '../utils/redis.js';
import { generateAuthToken } from '../utils/tokens.js';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Admin Endpoint: Send Newsletter
 * POST /api/admin/send-newsletter
 *
 * Sends event newsletter to filtered subscribers
 *
 * Body: {
 *   eventId: string,
 *   recipients: 'all' | 'notifications' | 'engaged'
 * }
 *
 * Authentication: Bearer token (ADMIN_PASSWORD)
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { eventId, recipients = 'all' } = req.body;

    if (!eventId) {
      return res.status(400).json({
        error: 'Missing eventId',
        message: 'eventId is required'
      });
    }

    // Validate recipients filter
    const validFilters = ['all', 'notifications', 'engaged'];
    if (!validFilters.includes(recipients)) {
      return res.status(400).json({
        error: 'Invalid recipients filter',
        message: `recipients must be one of: ${validFilters.join(', ')}`
      });
    }

    // Get event
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
        message: 'No subscribers found'
      });
    }

    console.log(`[NEWSLETTER] Event: ${event.title}, Filter: ${recipients}, Total subscribers: ${allSubscribers.length}`);

    // Filter subscribers
    const eligibleEmails = [];
    const stats = {
      total: allSubscribers.length,
      sent: 0,
      failed: 0,
      skipped: 0
    };

    for (const email of allSubscribers) {
      const profile = await getProfile(email);
      const preferences = await getUserPreferences(email);

      // Filter: notifications
      if (recipients === 'notifications' || recipients === 'engaged') {
        const notificationsEnabled = preferences?.notifications?.enabled !== false;
        if (!notificationsEnabled) {
          stats.skipped++;
          continue;
        }
      }

      // Filter: engaged users only
      if (recipients === 'engaged') {
        const engagementStats = profile?.engagement?.stats || {};
        const subscribedAt = preferences?.subscribedAt ? new Date(preferences.subscribedAt) : null;

        // Get last event date for "new subscriber" check
        const pastEvents = eventsConfig.events
          .filter(e => new Date(e.date) < new Date())
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastEventDate = pastEvents.length > 0 ? new Date(pastEvents[0].date) : null;

        const hasAttended = engagementStats.totalAttended > 0;
        const wantedToCome = engagementStats.totalConfirmed > engagementStats.totalAttended;
        const registeredAfterLastEvent = lastEventDate && subscribedAt && subscribedAt > lastEventDate;

        if (!hasAttended && !wantedToCome && !registeredAfterLastEvent) {
          stats.skipped++;
          continue;
        }
      }

      // Eligible!
      eligibleEmails.push({ email, profile, preferences });
    }

    console.log(`[NEWSLETTER] Eligible: ${eligibleEmails.length}/${allSubscribers.length} (skipped: ${stats.skipped})`);

    if (eligibleEmails.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No eligible subscribers',
        stats
      });
    }

    const baseUrl = process.env.BASE_URL || 'https://kinn.at';

    // Send in batches of 10
    for (let i = 0; i < eligibleEmails.length; i += 10) {
      const batch = eligibleEmails.slice(i, i + 10);

      await Promise.all(
        batch.map(async ({ email, profile, preferences }) => {
          try {
            const name = profile?.identity?.name || preferences?.adminDisplayName || email.split('@')[0];

            // Generate RSVP token
            const rsvpToken = generateAuthToken(email);

            // RSVP URLs
            const rsvpLinks = {
              yesUrl: `${baseUrl}/api/rsvp?token=${rsvpToken}&event=${eventId}&response=yes`,
              maybeUrl: `${baseUrl}/api/rsvp?token=${rsvpToken}&event=${eventId}&response=maybe`,
              noUrl: `${baseUrl}/api/rsvp?token=${rsvpToken}&event=${eventId}&response=no`
            };

            // Render email
            const unsubscribeUrl = `${baseUrl}/pages/profil.html#unsubscribe`;
            const html = await render(
              EventAnnouncement({
                name,
                event,
                rsvpLinks,
                unsubscribeUrl
              })
            );

            const text = await render(
              EventAnnouncement({
                name,
                event,
                rsvpLinks,
                unsubscribeUrl
              }),
              { plainText: true }
            );

            // Send
            await resend.emails.send({
              from: process.env.SENDER_EMAIL || 'KINN <thomas@kinn.at>',
              to: email,
              subject: `${event.title} – Bist du dabei?`,
              html,
              text,
              tags: [
                { name: 'type', value: 'newsletter' },
                { name: 'event_id', value: eventId }
              ]
            });

            stats.sent++;
            console.log(`[NEWSLETTER] ✓ Sent to ${email}`);

          } catch (error) {
            stats.failed++;
            console.error(`[NEWSLETTER] ✗ Failed for ${email}:`, error.message);
          }
        })
      );

      // Rate limiting: 1 second between batches
      if (i + 10 < eligibleEmails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[NEWSLETTER] Complete: ${stats.sent} sent, ${stats.failed} failed`);

    return res.status(200).json({
      success: true,
      message: `Newsletter sent to ${stats.sent} subscribers`,
      stats: {
        total: stats.total,
        sent: stats.sent,
        failed: stats.failed,
        skipped: stats.skipped
      }
    });

  } catch (error) {
    console.error('[NEWSLETTER] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
