import crypto from 'crypto';
import {
  getEventEngagement,
  updateEventEngagement
} from '../utils/redis.js';

/**
 * Admin API: Event Engagement Tracking
 * GET/PUT /api/admin/event-engagement?eventId=...
 *
 * Manages engagement tracking for events (invited, confirmed, attended)
 *
 * Authentication: Bearer token via ADMIN_PASSWORD env var
 */

/**
 * Verify admin password using timing-safe comparison
 */
function isAuthenticated(req) {
  const authHeader = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('[EVENT-ENGAGEMENT] ADMIN_PASSWORD not set');
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
    console.error('[EVENT-ENGAGEMENT] Auth error:', error.message);
    return false;
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

  // Get eventId from query
  const { eventId } = req.query;

  if (!eventId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing required parameter: eventId'
    });
  }

  try {
    if (req.method === 'GET') {
      // GET: Fetch engagement data for event
      console.log('[EVENT-ENGAGEMENT] GET:', eventId);

      const data = await getEventEngagement(eventId);

      return res.status(200).json({
        success: true,
        data
      });

    } else if (req.method === 'PUT') {
      // PUT: Update engagement data for event
      console.log('[EVENT-ENGAGEMENT] PUT:', eventId);

      const { updates } = req.body;

      if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Missing or invalid "updates" array in request body'
        });
      }

      // Validate each update
      for (const update of updates) {
        if (!update.email) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Each update must include "email" field'
          });
        }
      }

      // Apply updates
      const updatedEvent = await updateEventEngagement(eventId, updates);

      return res.status(200).json({
        success: true,
        message: `Engagement data updated for ${updates.length} users`,
        stats: {
          updated: updates.length,
          errors: 0
        },
        updatedEvent: {
          id: updatedEvent.id,
          engagement: updatedEvent.engagement
        }
      });

    } else {
      return res.status(405).json({
        error: 'Method not allowed',
        message: 'Only GET and PUT requests are accepted'
      });
    }

  } catch (error) {
    console.error('[EVENT-ENGAGEMENT] Error:', error);

    if (error.message === 'Event not found') {
      return res.status(404).json({
        error: 'Not Found',
        message: `Event with ID '${eventId}' does not exist`
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
