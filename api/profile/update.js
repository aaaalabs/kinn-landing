import { verifyProfileToken } from '../utils/tokens.js';
import { getUserPreferences, updateUserPreferences, isSubscribed } from '../utils/redis.js';
import { generateBrandedError, ErrorTemplates } from '../utils/branded-error.js';

/**
 * Profile update endpoint for modifying user preferences
 * PUT /api/profile/update
 * Body: { token, notifications: { enabled: boolean } }
 *
 * [CP01] KISS: Verify → validate → update → return
 * [EH02] User-friendly error messages
 * [SC02] Input validation
 */
export default async function handler(req, res) {
  // Only accept PUT requests
  if (req.method !== 'PUT') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only PUT requests are accepted'
    });
  }

  try {
    // Extract token and preferences from body
    const { token, notifications } = req.body;

    // [SC02] Validate input
    if (!token) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Profile token is required'
      });
    }

    if (!notifications || typeof notifications.enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid preferences',
        message: 'Notifications preferences must include enabled: boolean'
      });
    }

    // [EH01] Log for debugging
    console.log('[PROFILE UPDATE] Verifying token...');

    // Verify token and extract email
    const email = verifyProfileToken(token);

    if (!email) {
      console.error('[PROFILE UPDATE] Token verification failed');
      return res.status(400).json({
        error: 'Invalid token',
        message: 'Profile token is invalid or expired'
      });
    }

    // Check if user is still subscribed
    const subscribed = await isSubscribed(email);

    if (!subscribed) {
      console.log(`[PROFILE UPDATE] User not subscribed: ${email}`);
      return res.status(404).json({
        error: 'Not subscribed',
        message: 'This email address is not registered'
      });
    }

    // Get existing preferences or create defaults
    let existingPreferences = await getUserPreferences(email);

    if (!existingPreferences) {
      existingPreferences = {
        email,
        subscribedAt: new Date().toISOString()
      };
    }

    // Update preferences
    const updatedPreferences = {
      ...existingPreferences,
      notifications: {
        enabled: notifications.enabled
      }
    };

    await updateUserPreferences(email, updatedPreferences);

    console.log(`[PROFILE UPDATE] Preferences updated for: ${email}`, notifications);

    // Return updated preferences
    return res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: {
        email: updatedPreferences.email,
        notifications: updatedPreferences.notifications,
        subscribedAt: updatedPreferences.subscribedAt,
        updatedAt: updatedPreferences.updatedAt
      }
    });

  } catch (error) {
    // [EH01] Contextual logging
    console.error('[PROFILE UPDATE] Error updating profile:', {
      message: error.message,
      name: error.name,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });

    // [EH02] User-friendly error response
    return res.status(500).json({
      error: 'Server error',
      message: 'Failed to update preferences',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
}
