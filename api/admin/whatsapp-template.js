import { getEventsConfig, getSubscribersByRSVP, getUserPreferences, getProfile } from '../utils/redis.js';
import { enforceRateLimit } from '../utils/rate-limiter.js';
import crypto from 'crypto';

/**
 * WhatsApp Template Generator API
 *
 * POST /api/admin/whatsapp-template
 *   Body: {
 *     eventId: string,
 *     templateType: '1day' | '2hours' | 'custom',
 *     rsvpFilter: 'all' | 'yes' | 'yes_maybe',
 *     customMessage?: string // for templateType='custom'
 *   }
 *
 * Returns array of WhatsApp messages with phone numbers and names
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  // Set CORS headers
  const origin = req.headers.origin;
  const corsHeaders = getCorsHeaders(origin);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
  }

  // Rate limiting
  const rateLimitAllowed = await enforceRateLimit(req, res, {
    maxRequests: 5,
    windowMs: 60 * 1000,
    keyPrefix: 'ratelimit:admin:whatsapp'
  });

  if (!rateLimitAllowed) {
    return;
  }

  // Verify authentication
  if (!isAuthenticated(req)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing admin password'
    });
  }

  try {
    const { eventId, templateType, rsvpFilter = 'yes', customMessage } = req.body;

    // Validate required params
    if (!eventId || !templateType) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'eventId and templateType are required'
      });
    }

    // Validate templateType
    const validTypes = ['1day', '2hours', 'custom'];
    if (!validTypes.includes(templateType)) {
      return res.status(400).json({
        error: 'Invalid template type',
        message: `templateType must be one of: ${validTypes.join(', ')}`
      });
    }

    // Get event details
    const config = await getEventsConfig();
    const event = config.events.find(e => e.id === eventId);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        message: `Event with ID ${eventId} not found`
      });
    }

    // Get filtered subscribers
    const subscribers = await getSubscribersByRSVP(eventId, rsvpFilter);

    // Generate messages for each subscriber with phone number
    const messages = [];
    const missingPhone = [];

    for (const email of subscribers) {
      // Try to get user preferences first (has phone), fallback to profile
      let userPrefs = await getUserPreferences(email);
      let profile = null;

      if (!userPrefs || !userPrefs.phone) {
        profile = await getProfile(email);
      }

      const phone = userPrefs?.phone || profile?.identity?.phone;
      const firstName = profile?.identity?.firstName || userPrefs?.firstName || email.split('@')[0];

      if (!phone) {
        missingPhone.push(email);
        continue;
      }

      // Only include users who opted in for WhatsApp reminders
      if (userPrefs?.whatsappReminders !== true && profile?.preferences?.whatsappReminders !== true) {
        continue;
      }

      // Generate message based on template type
      const message = generateMessage(templateType, event, firstName, customMessage);

      messages.push({
        email,
        phone,
        firstName,
        message
      });
    }

    console.log('[ADMIN] WhatsApp templates generated:', messages.length, 'messages,', missingPhone.length, 'missing phone');

    return res.status(200).json({
      success: true,
      data: {
        messages,
        count: messages.length,
        missingPhone,
        event: {
          id: event.id,
          title: event.title,
          date: event.date,
          startTime: event.startTime,
          location: event.location,
          meetingLink: event.meetingLink
        }
      }
    });

  } catch (error) {
    console.error('[ADMIN] WhatsApp template error:', error.message);
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
}

/**
 * Generate WhatsApp message based on template type
 */
function generateMessage(templateType, event, firstName, customMessage) {
  const eventDate = new Date(event.date + 'T' + event.startTime);
  const dayName = eventDate.toLocaleDateString('de-DE', { weekday: 'long' });
  const time = event.startTime;

  // Location or meeting link
  const locationInfo = event.type === 'online' && event.meetingLink
    ? `Online: ${event.meetingLink}`
    : `Location: ${event.location}`;

  switch (templateType) {
    case '1day':
      return `Hey ${firstName}, morgen ${dayName} um ${time} ist ${event.title}! 🤖\n${locationInfo}\nFreue mich auf dich!`;

    case '2hours':
      return `Hey ${firstName}, in 2 Stunden geht's los! ${event.title} um ${time}.\n${locationInfo}\nBis gleich! 👋`;

    case 'custom':
      // Replace placeholders in custom message
      return (customMessage || '')
        .replace(/{firstName}/g, firstName)
        .replace(/{eventTitle}/g, event.title)
        .replace(/{dayName}/g, dayName)
        .replace(/{time}/g, time)
        .replace(/{location}/g, locationInfo)
        .replace(/{meetingLink}/g, event.meetingLink || event.location);

    default:
      return `Hey ${firstName}, reminder für ${event.title} am ${dayName} um ${time}. ${locationInfo}`;
  }
}
