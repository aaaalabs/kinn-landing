import { getAllSubscribers, getSubscriberCount, getSubscribersByRSVP, getEventRSVPs } from '../utils/redis.js';
import { enforceRateLimit } from '../utils/rate-limiter.js';
import crypto from 'crypto';

/**
 * Admin API for Subscriber Management
 *
 * GET /api/admin/subscribers - Get all subscribers
 *   Query params:
 *   - filter: 'all' | 'yes' | 'no' | 'maybe' | 'yes_maybe' | 'none' (default: 'all')
 *   - event: Event ID (required if filter != 'all')
 *   - format: 'json' | 'text' (default: 'json')
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
    const { filter = 'all', event, format = 'json' } = req.query;

    // Validate filter
    const validFilters = ['all', 'yes', 'no', 'maybe', 'yes_maybe', 'none'];
    if (!validFilters.includes(filter)) {
      return res.status(400).json({
        error: 'Invalid filter',
        message: `Filter must be one of: ${validFilters.join(', ')}`
      });
    }

    // Require event ID if filter is not 'all'
    if (filter !== 'all' && !event) {
      return res.status(400).json({
        error: 'Missing event ID',
        message: 'Event ID is required when using RSVP filters'
      });
    }

    // Get subscribers based on filter
    let subscribers;
    let rsvpStats = null;

    if (filter === 'all') {
      subscribers = await getAllSubscribers();
    } else {
      subscribers = await getSubscribersByRSVP(event, filter);
      // Also get RSVP stats for context
      rsvpStats = await getEventRSVPs(event);
    }

    const count = subscribers.length;

    console.log('[ADMIN] Subscribers fetched:', count, 'filter:', filter);

    // Return in requested format
    if (format === 'text') {
      // Plain text format for copy-paste
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(subscribers.sort().join(', '));
    }

    // Default JSON format
    return res.status(200).json({
      success: true,
      data: {
        subscribers: subscribers.sort(), // Sort alphabetically
        count,
        filter,
        eventId: event || null,
        rsvpStats
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
