import { getEventsConfig, updateEventsConfig } from '../utils/redis.js';
import { enforceRateLimit } from '../utils/rate-limiter.js';
import crypto from 'crypto';

/**
 * Event Creation API
 *
 * POST /api/events/create
 *   Creates a new event and adds it to the events config
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

/**
 * Generate unique event ID
 */
function generateEventId(title) {
  const timestamp = Date.now();
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  return `${slug}-${timestamp}`;
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
    keyPrefix: 'ratelimit:admin:events:create'
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
    const {
      type = 'in-person',
      summary,
      description,
      location,
      meetingLink,
      maxCapacity,
      start,
      end
    } = req.body;

    // Validate required fields
    if (!summary || !description || !start || !end) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'summary, description, start, and end are required'
      });
    }

    // Validate location or meetingLink based on type
    if (type === 'in-person' && !location) {
      return res.status(400).json({
        error: 'Missing location',
        message: 'location is required for in-person events'
      });
    }

    if (type === 'online' && !meetingLink) {
      return res.status(400).json({
        error: 'Missing meeting link',
        message: 'meetingLink is required for online events'
      });
    }

    if (type === 'hybrid' && (!location || !meetingLink)) {
      return res.status(400).json({
        error: 'Missing hybrid event fields',
        message: 'Both location and meetingLink are required for hybrid events'
      });
    }

    // Generate event ID
    const eventId = generateEventId(summary);

    // Parse dates
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Create event object
    const newEvent = {
      id: eventId,
      type,
      title: summary,
      description,
      location: location || (type === 'online' ? 'Online' : 'TBD'),
      meetingLink: meetingLink || undefined,
      maxCapacity: maxCapacity || undefined,
      date: startDate.toISOString().split('T')[0], // YYYY-MM-DD
      startTime: startDate.toTimeString().substring(0, 5), // HH:MM
      endTime: endDate.toTimeString().substring(0, 5), // HH:MM
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      status: 'confirmed',
      rsvps: {
        yes: [],
        no: [],
        maybe: []
      },
      createdAt: new Date().toISOString()
    };

    // Get current config
    const config = await getEventsConfig();

    // Add new event to config
    config.events.push(newEvent);

    // Save to Redis
    await updateEventsConfig(config);

    console.log('[EVENTS] New event created:', eventId);

    // TODO: Send email notifications to all subscribers

    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: {
        event: newEvent,
        stats: {
          totalEvents: config.events.length
        }
      }
    });

  } catch (error) {
    console.error('[EVENTS] Create error:', error.message);
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
}
