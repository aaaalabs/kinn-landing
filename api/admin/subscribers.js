import {
  getAllSubscribers,
  getAllSubscribersWithTimestamps,
  getAllSubscribersWithNotificationPreferences,
  getSubscriberCount,
  getSubscribersByRSVP,
  getEventRSVPs,
  getProfile,
  getUserPreferences,
  getEventsConfig
} from '../utils/redis.js';
import { enforceRateLimit } from '../utils/rate-limiter.js';
import crypto from 'crypto';

/**
 * Admin API for Subscriber Management
 *
 * GET /api/admin/subscribers - Get all subscribers
 *   Query params:
 *   - filter: 'all' | 'yes' | 'no' | 'maybe' | 'yes_maybe' | 'none' (default: 'all')
 *   - event: Event ID (required if filter != 'all' or channel = 'google-calendar')
 *   - notifications: 'all' | 'enabled' | 'disabled' (default: 'all')
 *   - channel: 'newsletter' | 'google-calendar' (default: 'newsletter')
 *   - format: 'json' | 'text' (default: 'json')
 *
 * Channel Filtering:
 *   - newsletter: All subscribers with notifications enabled
 *   - google-calendar: Engaged users only (past attendees, wanted to come, or new since last event)
 *
 * Authentication: Bearer token via ADMIN_PASSWORD env var
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://kinn.at',
  'https://www.kinn.at',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:8000', 'http://localhost:3000'] : [])
];

/**
 * Get CORS headers for request origin
 */
function getCorsHeaders(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    };
  }
  return {};
}

/**
 * Verify admin password using timing-safe comparison
 */
function isAuthenticated(req) {
  const authHeader = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('[ADMIN] ADMIN_PASSWORD not set in environment variables');
    return false;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  try {
    const tokenBuffer = Buffer.from(token);
    const passwordBuffer = Buffer.from(adminPassword);

    if (tokenBuffer.length !== passwordBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(tokenBuffer, passwordBuffer);
  } catch (error) {
    console.error('[ADMIN] Authentication error:', error.message);
    return false;
  }
}

export default async function handler(req, res) {
  // Set CORS headers based on request origin
  const origin = req.headers.origin;
  const corsHeaders = getCorsHeaders(origin);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Rate limiting: 5 requests per minute per IP (stricter for admin)
  const rateLimitAllowed = await enforceRateLimit(req, res, {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'ratelimit:admin:subscribers'
  });

  if (!rateLimitAllowed) {
    return; // Response already sent by enforceRateLimit
  }

  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are accepted'
    });
  }

  // Verify authentication
  if (!isAuthenticated(req)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing admin password'
    });
  }

  try {
    const { filter = 'all', event, notifications = 'all', channel = 'newsletter', format = 'json' } = req.query;

    // Validate filter
    const validFilters = ['all', 'yes', 'no', 'maybe', 'yes_maybe', 'none'];
    if (!validFilters.includes(filter)) {
      return res.status(400).json({
        error: 'Invalid filter',
        message: `Filter must be one of: ${validFilters.join(', ')}`
      });
    }

    // Validate notifications filter
    const validNotifications = ['all', 'enabled', 'disabled'];
    if (!validNotifications.includes(notifications)) {
      return res.status(400).json({
        error: 'Invalid notifications filter',
        message: `Notifications must be one of: ${validNotifications.join(', ')}`
      });
    }

    // Validate channel filter
    const validChannels = ['newsletter', 'google-calendar'];
    if (!validChannels.includes(channel)) {
      return res.status(400).json({
        error: 'Invalid channel filter',
        message: `Channel must be one of: ${validChannels.join(', ')}`
      });
    }

    // Require event ID if filter is not 'all' or channel is 'google-calendar'
    if ((filter !== 'all' || channel === 'google-calendar') && !event) {
      return res.status(400).json({
        error: 'Missing event ID',
        message: 'Event ID is required when using RSVP filters or google-calendar channel'
      });
    }

    // Get subscribers based on filter
    let subscribersData;
    let rsvpStats = null;
    let notificationsStats = null;

    if (filter === 'all') {
      // Get subscribers with timestamps (sorted newest first)
      subscribersData = await getAllSubscribersWithTimestamps();
    } else {
      // Get filtered subscribers by RSVP (returns array of emails)
      const emails = await getSubscribersByRSVP(event, filter);
      // Convert to objects with null timestamps (we don't fetch timestamps for RSVP filters for performance)
      subscribersData = emails.map(email => ({ email, subscribedAt: null }));
      // Also get RSVP stats for context
      rsvpStats = await getEventRSVPs(event);
    }

    // Apply notifications filter if requested
    if (notifications !== 'all') {
      // Fetch notification preferences for all subscribers
      const allWithPreferences = await getAllSubscribersWithNotificationPreferences();
      const preferencesMap = new Map(allWithPreferences.map(s => [s.email, s.notificationsEnabled]));

      // Filter based on notifications preference
      const beforeCount = subscribersData.length;
      subscribersData = subscribersData.filter(subscriber => {
        const notificationsEnabled = preferencesMap.get(subscriber.email) ?? true; // Default: enabled
        return notifications === 'enabled' ? notificationsEnabled : !notificationsEnabled;
      });

      // Calculate stats
      const enabledCount = allWithPreferences.filter(s => s.notificationsEnabled).length;
      const disabledCount = allWithPreferences.length - enabledCount;
      notificationsStats = {
        total: allWithPreferences.length,
        enabled: enabledCount,
        disabled: disabledCount,
        filtered: subscribersData.length,
        skipped: beforeCount - subscribersData.length
      };

      console.log('[ADMIN] Notifications filter applied:', {
        filter: notifications,
        before: beforeCount,
        after: subscribersData.length,
        skipped: beforeCount - subscribersData.length
      });
    }

    // Apply Google Calendar channel filter if requested
    let channelStats = null;
    if (channel === 'google-calendar') {
      const eventsConfig = await getEventsConfig();

      // Get last event date (for new subscriber detection)
      const pastEvents = eventsConfig.events
        .filter(e => new Date(e.date) < new Date())
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastEventDate = pastEvents.length > 0 ? new Date(pastEvents[0].date) : null;

      const eligible = [];
      const breakdown = {
        pastAttendees: 0,
        wantedToCome: 0,
        newSubscribers: 0
      };

      for (const subscriber of subscribersData) {
        const email = subscriber.email;
        const profile = await getProfile(email);
        const preferences = await getUserPreferences(email);

        // Skip if notifications disabled
        if (preferences?.notifications?.enabled === false) continue;

        const stats = profile?.engagement?.stats || {};
        const subscribedAt = preferences?.subscribedAt ? new Date(preferences.subscribedAt) : null;

        const hasAttended = stats.totalAttended > 0;
        const wantedToCome = stats.totalConfirmed > stats.totalAttended;
        const registeredAfterLastEvent = lastEventDate && subscribedAt && subscribedAt > lastEventDate;

        if (hasAttended) {
          eligible.push(subscriber);
          breakdown.pastAttendees++;
        } else if (wantedToCome) {
          eligible.push(subscriber);
          breakdown.wantedToCome++;
        } else if (registeredAfterLastEvent) {
          eligible.push(subscriber);
          breakdown.newSubscribers++;
        }
      }

      const excluded = subscribersData.length - eligible.length;

      channelStats = {
        channel: 'google-calendar',
        total: subscribersData.length,
        eligible: eligible.length,
        excluded,
        breakdown
      };

      subscribersData = eligible;

      console.log('[ADMIN] Google Calendar filter applied:', {
        before: subscribersData.length + excluded,
        after: eligible.length,
        breakdown
      });
    }

    const count = subscribersData.length;

    console.log('[ADMIN] Subscribers fetched:', count, 'filter:', filter, 'notifications:', notifications, 'channel:', channel);

    // Return in requested format
    if (format === 'text') {
      // Plain text format for copy-paste (only emails, comma-separated)
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      const emails = subscribersData.map(s => s.email).sort();
      return res.status(200).send(emails.join(', '));
    }

    // Default JSON format (with timestamps)
    return res.status(200).json({
      success: true,
      data: {
        subscribers: subscribersData, // Array of {email, subscribedAt} objects
        count,
        filter,
        channel,
        eventId: event || null,
        rsvpStats,
        notificationsStats,
        channelStats
      }
    });

  } catch (error) {
    console.error('[ADMIN] Error fetching subscribers:', error.message);
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
}
