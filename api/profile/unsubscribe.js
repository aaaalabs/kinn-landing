import { verifyProfileToken } from '../utils/tokens.js';
import { removeSubscriber, isSubscribed } from '../utils/redis.js';
import { generateBrandedError, ErrorTemplates } from '../utils/branded-error.js';

/**
 * Unsubscribe endpoint for complete removal from mailing list
 * POST /api/profile/unsubscribe
 * Body: { token }
 *
 * [CP01] KISS: Verify → remove → redirect
 * [EH02] User-friendly error messages
 * GDPR: Complete data deletion
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
    // Extract token from body
    const { token } = req.body;

    // Validate input
    if (!token) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Profile token is required'
      });
    }

    // [EH01] Log for debugging
    console.log('[UNSUBSCRIBE] Verifying token...');

    // Verify token and extract email
    const email = verifyProfileToken(token);

    if (!email) {
      console.error('[UNSUBSCRIBE] Token verification failed');
      return res.status(400).json({
        error: 'Invalid token',
        message: 'Profile token is invalid or expired'
      });
    }

    // Check if user is currently subscribed
    const subscribed = await isSubscribed(email);

    if (!subscribed) {
      console.log(`[UNSUBSCRIBE] User already unsubscribed: ${email}`);
      // Return success even if already unsubscribed (idempotent)
      return res.status(200).json({
        success: true,
        message: 'Already unsubscribed',
        alreadyUnsubscribed: true
      });
    }

    // Remove subscriber completely (from set and preferences)
    await removeSubscriber(email);

    console.log(`[UNSUBSCRIBE] User unsubscribed successfully: ${email}`);

    // Return success
    return res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from KINN mailing list',
      email
    });

  } catch (error) {
    // [EH01] Contextual logging
    console.error('[UNSUBSCRIBE] Error processing unsubscribe:', {
      message: error.message,
      name: error.name,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });

    // [EH02] User-friendly error response
    return res.status(500).json({
      error: 'Server error',
      message: 'Failed to process unsubscribe request',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
}
