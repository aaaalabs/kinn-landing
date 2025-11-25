import { Resend } from 'resend';
import { renderEventEmail } from '../../emails/render-event-email.js';
import { isAuthenticated } from '../utils/auth.js';
import { getAllSubscribers, getEventsConfig, getProfile, getUserPreferences, getEventRSVPs } from '../utils/redis.js';
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
 *   recipients: 'all' | 'notifications' | 'engaged',
 *   testEmail?: string,  // If provided, sends only to this email
 *   format?: 'both' | 'text'  // 'both' = HTML+Text (default), 'text' = plain text only
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
    const { eventId, recipients = 'all', testEmail, format = 'both', baseAttendees = 0 } = req.body;

    if (!eventId) {
      return res.status(400).json({
        error: 'Missing eventId',
        message: 'eventId is required'
      });
    }

    // Validate recipients filter (only if not test mode)
    const validFilters = ['all', 'notifications', 'engaged'];
    if (!testEmail && !validFilters.includes(recipients)) {
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

    const baseUrl = process.env.BASE_URL || 'https://kinn.at';

    // Get RSVP counts for social proof
    const rsvps = await getEventRSVPs(eventId);
    const eventBaseAttendees = event.baseAttendees || 0;
    const totalBase = parseInt(baseAttendees, 10) || eventBaseAttendees;
    const rsvpCounts = {
      yes: (rsvps?.counts?.yes || 0) + totalBase,
      maybe: rsvps?.counts?.maybe || 0
    };

    console.log(`[NEWSLETTER] RSVP counts: ${rsvpCounts.yes} yes (incl. ${totalBase} base), ${rsvpCounts.maybe} maybe`);

    // TEST MODE: Send only to specified email
    if (testEmail) {
      console.log(`[NEWSLETTER] TEST MODE: Sending to ${testEmail} (format: ${format})`);

      // Load profile to get real name
      const profile = await getProfile(testEmail);
      const preferences = await getUserPreferences(testEmail);
      const name = profile?.identity?.name || preferences?.adminDisplayName || null;

      const authToken = generateAuthToken(testEmail);

      const rsvpLinks = {
        yesUrl: `${baseUrl}/api/rsvp?token=${authToken}&event=${eventId}&response=yes`,
        maybeUrl: `${baseUrl}/api/rsvp?token=${authToken}&event=${eventId}&response=maybe`,
        noUrl: `${baseUrl}/api/rsvp?token=${authToken}&event=${eventId}&response=no`
      };

      const profileUrl = `${baseUrl}/api/auth/login?token=${encodeURIComponent(authToken)}&redirect=profil`;
      const unsubscribeUrl = `${baseUrl}/api/auth/login?token=${encodeURIComponent(authToken)}&redirect=settings`;

      const { html, text, simpleHtml } = renderEventEmail({
        name,
        event,
        rsvpLinks,
        profileUrl,
        unsubscribeUrl,
        isTest: true,
        rsvpCounts
      });

      // Build email payload based on format
      const emailPayload = {
        from: process.env.SENDER_EMAIL || 'KINN <thomas@kinn.at>',
        to: testEmail,
        subject: `[TEST] ${event.title} - Bist du dabei?`,
        tags: [
          { name: 'type', value: 'newsletter-test' },
          { name: 'event_id', value: eventId },
          { name: 'format', value: format }
        ]
      };

      if (format === 'text') {
        // Simple HTML - looks like plain text but with basic formatting
        emailPayload.html = simpleHtml;
      } else {
        // Rich HTML + plain text fallback
        emailPayload.html = html;
        emailPayload.text = text;
      }

      await resend.emails.send(emailPayload);

      console.log(`[NEWSLETTER] Test email sent to ${testEmail}`);

      return res.status(200).json({
        success: true,
        message: `Test email sent to ${testEmail} (${format === 'text' ? 'plain text only' : 'HTML + text'})`,
        stats: { total: 1, sent: 1, failed: 0, skipped: 0 }
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

    // Send in batches of 10
    for (let i = 0; i < eligibleEmails.length; i += 10) {
      const batch = eligibleEmails.slice(i, i + 10);

      await Promise.all(
        batch.map(async ({ email, profile, preferences }) => {
          try {
            const name = profile?.identity?.name || preferences?.adminDisplayName || null;

            // Generate auth token (used for both RSVP and profile)
            const authToken = generateAuthToken(email);

            // RSVP URLs
            const rsvpLinks = {
              yesUrl: `${baseUrl}/api/rsvp?token=${authToken}&event=${eventId}&response=yes`,
              maybeUrl: `${baseUrl}/api/rsvp?token=${authToken}&event=${eventId}&response=maybe`,
              noUrl: `${baseUrl}/api/rsvp?token=${authToken}&event=${eventId}&response=no`
            };

            // Profile URL (direct login to profile page)
            const profileUrl = `${baseUrl}/api/auth/login?token=${encodeURIComponent(authToken)}&redirect=profil`;

            // Unsubscribe URL (direct login to settings page where unsubscribe button is)
            const unsubscribeUrl = `${baseUrl}/api/auth/login?token=${encodeURIComponent(authToken)}&redirect=settings`;

            const { html, text, simpleHtml } = renderEventEmail({
              name,
              event,
              rsvpLinks,
              profileUrl,
              unsubscribeUrl,
              rsvpCounts
            });

            // Build email payload based on format
            const emailPayload = {
              from: process.env.SENDER_EMAIL || 'KINN <thomas@kinn.at>',
              to: email,
              subject: `${event.title} - Bist du dabei?`,
              tags: [
                { name: 'type', value: 'newsletter' },
                { name: 'event_id', value: eventId },
                { name: 'format', value: format }
              ]
            };

            if (format === 'text') {
              // Simple HTML - looks like plain text but with basic formatting
              emailPayload.html = simpleHtml;
            } else {
              // Rich HTML + plain text fallback
              emailPayload.html = html;
              emailPayload.text = text;
            }

            // Send
            await resend.emails.send(emailPayload);

            stats.sent++;
            console.log(`[NEWSLETTER] Sent to ${email}`);

          } catch (error) {
            stats.failed++;
            console.error(`[NEWSLETTER] Failed for ${email}:`, error.message);
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
