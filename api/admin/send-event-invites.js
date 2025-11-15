import { Resend } from 'resend';
import { render } from '@react-email/render';
import EventAnnouncement from '../../emails/event-announcement.js';
import { generateAuthToken } from '../utils/tokens.js';
import { getAllSubscribers, getEventsConfig, getProfile, updateEventsConfig } from '../utils/redis.js';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Smart Event Type Matching
 * Determines if a user should receive an event invite based on their location preference
 *
 * @param {string} eventType - Event type: 'online', 'in-person', 'hybrid'
 * @param {string} userLocation - User location preference: 'online', 'in-person', 'all', or undefined
 * @returns {boolean} True if user should receive invite
 */
function matchesEventType(eventType, userLocation) {
  // Fallback: User without location preference gets ALL events (opt-out model)
  if (!userLocation || userLocation === 'all') {
    return true;
  }

  // Hybrid events → everyone gets invite (flexible participation)
  if (eventType === 'hybrid') {
    return true;
  }

  // Map legacy values to current values
  const locationMap = {
    'ibk': 'in-person',
    'tirol': 'in-person',
    'remote': 'online'
  };
  const normalizedLocation = locationMap[userLocation] || userLocation;

  // Exact match (online→online, in-person→in-person)
  if (eventType === normalizedLocation) {
    return true;
  }

  // No match
  return false;
}

/**
 * Generate Event Invite Email using React Email template
 * Renders both HTML and plain text versions
 */
async function renderEventInviteEmail(name, event, rsvpLinks) {
  const baseUrl = process.env.BASE_URL || 'https://kinn.at';
  const unsubscribeUrl = `${baseUrl}/pages/profil.html#unsubscribe`;

  // Render HTML version
  const html = await render(
    EventAnnouncement({
      name,
      event,
      rsvpLinks,
      unsubscribeUrl
    })
  );

  // Render plain text version
  const text = await render(
    EventAnnouncement({
      name,
      event,
      rsvpLinks,
      unsubscribeUrl
    }),
    { plainText: true }
  );

  return { html, text };
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

    // Initialize invitesSent tracking if not exists
    if (!event.invitesSent) {
      event.invitesSent = [];
    }

    console.log(`[SEND-INVITES] Processing ${event.title} for ${allSubscribers.length} subscribers (Type: ${event.type || 'in-person'})`);

    const baseUrl = process.env.BASE_URL || 'https://kinn.at';
    const stats = {
      total: allSubscribers.length,
      sent: 0,
      failed: 0,
      skipped: {
        alreadyInvited: 0,
        notifications: 0,
        location: 0
      },
      errors: []
    };

    // Collect eligible emails (apply 3-layer filter)
    const eligibleEmails = [];

    for (const email of allSubscribers) {
      // === FILTER 1: Already invited? ===
      if (event.invitesSent.includes(email)) {
        stats.skipped.alreadyInvited++;
        console.log(`[SEND-INVITES] ⊘ Skipped ${email} - already invited`);
        continue;
      }

      // Get user profile for filters 2 & 3
      const profile = await getProfile(email);

      // === FILTER 2: Notifications enabled? (opt-out model) ===
      // Default: true (users who subscribed want emails)
      // Only skip if explicitly disabled
      if (profile?.preferences?.notifications?.enabled === false) {
        stats.skipped.notifications++;
        console.log(`[SEND-INVITES] ⊘ Skipped ${email} - notifications disabled`);
        continue;
      }

      // === FILTER 3: Location/Event-Type match? ===
      const userLocation = profile?.identity?.location;
      const eventType = event.type || 'in-person'; // Fallback for legacy events

      if (!matchesEventType(eventType, userLocation)) {
        stats.skipped.location++;
        console.log(`[SEND-INVITES] ⊘ Skipped ${email} - location mismatch (event: ${eventType}, user: ${userLocation || 'all'})`);
        continue;
      }

      // Passed all filters → eligible for invite
      eligibleEmails.push({ email, profile });
    }

    console.log(`[SEND-INVITES] Eligible: ${eligibleEmails.length}/${allSubscribers.length} (Skipped: ${stats.skipped.alreadyInvited} already invited, ${stats.skipped.notifications} notifications off, ${stats.skipped.location} location mismatch)`);

    if (eligibleEmails.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No eligible subscribers for this event',
        stats
      });
    }

    // Send in batches of 10 (Resend rate limit: 10 emails/sec)
    for (let i = 0; i < eligibleEmails.length; i += 10) {
      const batch = eligibleEmails.slice(i, i + 10);

      await Promise.all(
        batch.map(async ({ email, profile }) => {
          try {
            const name = profile?.identity?.name || email.split('@')[0];

            // Generate RSVP token (30 days validity)
            const rsvpToken = generateAuthToken(email);

            // Build RSVP URLs
            const rsvpLinks = {
              yesUrl: `${baseUrl}/api/rsvp?token=${rsvpToken}&event=${eventId}&response=yes`,
              noUrl: `${baseUrl}/api/rsvp?token=${rsvpToken}&event=${eventId}&response=no`,
              maybeUrl: `${baseUrl}/api/rsvp?token=${rsvpToken}&event=${eventId}&response=maybe`
            };

            // Render email template
            const { html, text } = await renderEventInviteEmail(name, event, rsvpLinks);

            // Send email
            await resend.emails.send({
              from: process.env.SENDER_EMAIL || 'KINN <thomas@kinn.at>',
              to: email,
              subject: `${event.title} – Bist du dabei?`,
              html,
              text,
              tags: [
                { name: 'type', value: 'event-invite' },
                { name: 'event_id', value: eventId }
              ]
            });

            // Track successful send
            event.invitesSent.push(email);
            stats.sent++;
            console.log(`[SEND-INVITES] ✓ Sent to ${email}`);

          } catch (error) {
            stats.failed++;
            stats.errors.push({
              email,
              error: error.message
            });
            console.error(`[SEND-INVITES] ✗ Failed for ${email}:`, error.message);
          }
        })
      );

      // Rate limiting: wait 1 second between batches
      if (i + 10 < eligibleEmails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update event config with invitesSent tracking
    event.invitesSentAt = new Date().toISOString();
    await updateEventsConfig(eventsConfig);

    console.log(`[SEND-INVITES] Complete: ${stats.sent} sent, ${stats.failed} failed`);

    return res.status(200).json({
      success: true,
      message: `Event invites sent with smart filtering`,
      stats: {
        total: stats.total,
        sent: stats.sent,
        failed: stats.failed,
        skipped: stats.skipped
      },
      errors: stats.errors.length > 0 ? stats.errors : undefined
    });

  } catch (error) {
    console.error('[SEND-INVITES] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to send event invites'
    });
  }
}
