import { createBulkCalendarEvents } from '../utils/calendar.js';

/**
 * Event Creation Endpoint
 * Creates calendar events for all users with OAuth tokens
 *
 * [CP01] KISS: Validate → create events → return results
 * [SC02] Admin API key authentication
 */
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
  }

  try {
    // [SC02] Admin authentication via API key
    const authHeader = req.headers.authorization;
    const apiKey = process.env.ADMIN_API_KEY;

    if (!apiKey) {
      console.error('[EVENTS] ADMIN_API_KEY not configured');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Admin API key not configured'
      });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Use: Bearer <api-key>'
      });
    }

    const providedKey = authHeader.substring(7); // Remove 'Bearer '

    if (providedKey !== apiKey) {
      console.warn('[EVENTS] Invalid API key attempt');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    // [SC02] Validate event data
    const { summary, description, location, start, end } = req.body;

    if (!summary || typeof summary !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Event summary is required and must be a string'
      });
    }

    if (!start || !end) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Start and end times are required (ISO 8601 format)'
      });
    }

    // Validate datetime format (basic check)
    try {
      new Date(start);
      new Date(end);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Invalid datetime format. Use ISO 8601 (e.g., 2025-02-01T18:00:00)'
      });
    }

    // Check that end is after start
    if (new Date(end) <= new Date(start)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'End time must be after start time'
      });
    }

    // Build event data
    const eventData = {
      summary,
      description: description || `KINN KI Treff Innsbruck\n\n${summary}`,
      location: location || 'Innsbruck, Tirol',
      start,
      end,
    };

    console.log('[EVENTS] Creating bulk calendar events:', {
      summary,
      start,
      end,
      location: eventData.location,
    });

    // Create events for all OAuth users
    const results = await createBulkCalendarEvents(eventData);

    // Return results
    return res.status(200).json({
      success: true,
      message: `Events created for ${results.success} users`,
      stats: {
        total: results.total,
        successful: results.success,
        failed: results.failed,
      },
      results: results.results,
    });

  } catch (error) {
    console.error('[EVENTS] Event creation error:', {
      message: error.message,
      name: error.name,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });

    return res.status(500).json({
      error: 'Event creation failed',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { details: error.stack })
    });
  }
}
