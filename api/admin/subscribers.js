import { getAllSubscribers, getSubscriberCount } from '../utils/redis.js';

/**
 * Admin API for Subscriber Management
 *
 * GET /api/admin/subscribers - Get all subscribers
 *
 * Authentication: Bearer token via ADMIN_PASSWORD env var
 */

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Verify admin password
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
  return token === adminPassword;
}

export default async function handler(req, res) {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
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
