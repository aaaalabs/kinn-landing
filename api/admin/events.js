import { getEventsConfig, updateEventsConfig } from '../utils/redis.js';
import { enforceRateLimit } from '../utils/rate-limiter.js';
import crypto from 'crypto';

/**
 * Admin API for Event Management
 *
 * GET  /api/admin/events - Get all events
 * PUT  /api/admin/events - Update events config
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
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    };
  }
  // Default: no CORS headers for unauthorized origins
  return {};
}

/**
 * Verify admin password using timing-safe comparison
 * Prevents timing attacks that could leak password length
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

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Use timing-safe comparison to prevent timing attacks
    const tokenBuffer = Buffer.from(token);
    const passwordBuffer = Buffer.from(adminPassword);

    // Check lengths match first (this is safe)
    if (tokenBuffer.length !== passwordBuffer.length) {
      return false;
    }

    // Timing-safe comparison
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
    keyPrefix: 'ratelimit:admin:events'
  });

  if (!rateLimitAllowed) {
    return; // Response already sent by enforceRateLimit
  }

  // Verify authentication
  if (!isAuthenticated(req)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing admin password'
    });
  }

  try {
    // GET: Return current events config
    if (req.method === 'GET') {
      const config = await getEventsConfig();
      return res.status(200).json({
        success: true,
        data: config
      });
    }

    // PUT: Update events config
    if (req.method === 'PUT') {
      const { events, defaults } = req.body;

      // Validate input
      if (!events || !Array.isArray(events)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Events array is required'
        });
      }

      // Validate each event has required fields
      const requiredFields = ['id', 'title', 'date', 'startTime', 'endTime', 'location', 'description'];
      for (const event of events) {
        // Check required fields
        for (const field of requiredFields) {
          if (!event[field]) {
            return res.status(400).json({
              error: 'Invalid event',
              message: `Event missing required field: ${field}`,
              event
            });
          }
        }

        // Validate event type
        if (event.type && !['online', 'in-person', 'hybrid'].includes(event.type)) {
          return res.status(400).json({
            error: 'Invalid event',
            message: `Event type must be 'online', 'in-person', or 'hybrid'`,
            event
          });
        }

        // Validate meetingLink for online/hybrid events
        if ((event.type === 'online' || event.type === 'hybrid') && event.meetingLink) {
          try {
            new URL(event.meetingLink);
          } catch (e) {
            return res.status(400).json({
              error: 'Invalid event',
              message: `Invalid meetingLink URL: ${event.meetingLink}`,
              event
            });
          }
        }

        // Validate maxCapacity if present
        if (event.maxCapacity !== undefined && (typeof event.maxCapacity !== 'number' || event.maxCapacity < 1)) {
          return res.status(400).json({
            error: 'Invalid event',
            message: `maxCapacity must be a positive number`,
            event
          });
        }

        // Initialize rsvps if not present
        if (!event.rsvps) {
          event.rsvps = { yes: [], no: [], maybe: [] };
        }
      }

      // Update config in Redis
      const config = {
        events,
        defaults: defaults || {
          timezone: 'Europe/Vienna',
          organizer: 'thomas@kinn.at',
          categories: ['KI', 'AI', 'Networking', 'Innsbruck'],
          reminder: '24h'
        }
      };

      await updateEventsConfig(config);

      console.log('[ADMIN] Events config updated:', events.length, 'events');

      return res.status(200).json({
        success: true,
        message: 'Events updated successfully',
        data: config
      });
    }

    // Method not allowed
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET and PUT requests are accepted'
    });

  } catch (error) {
    console.error('[ADMIN] Error:', error.message);
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
}
