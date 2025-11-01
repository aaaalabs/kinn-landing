import { getEventsConfig, updateEventsConfig } from '../utils/redis.js';

/**
 * Admin API for Event Management
 *
 * GET  /api/admin/events - Get all events
 * PUT  /api/admin/events - Update events config
 *
 * Authentication: Bearer token via ADMIN_PASSWORD env var
 */

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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
        for (const field of requiredFields) {
          if (!event[field]) {
            return res.status(400).json({
              error: 'Invalid event',
              message: `Event missing required field: ${field}`,
              event
            });
          }
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
