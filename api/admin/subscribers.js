import { getAllSubscribers, getSubscriberCount } from '../utils/redis.js';
import { enforceRateLimit } from '../utils/rate-limiter.js';
import crypto from 'crypto';

/**
 * Admin API for Subscriber Management
 *
 * GET /api/admin/subscribers - Get all subscribers
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
    // Get all subscribers from Redis
    const subscribers = await getAllSubscribers();
    const count = await getSubscriberCount();

    console.log('[ADMIN] Subscribers fetched:', count);

    return res.status(200).json({
      success: true,
      data: {
        subscribers: subscribers.sort(), // Sort alphabetically
        count
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
