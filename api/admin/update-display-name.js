import { getUserPreferences, updateUserPreferences } from '../utils/redis.js';
import { isAuthenticated } from '../utils/auth.js';

/**
 * Admin API: Update Admin Display Name
 * PUT /api/admin/update-display-name
 *
 * Updates admin-only display name for a user (for organization/search)
 * This name is NOT visible to the user, only to admins.
 *
 * Authentication: Bearer token via ADMIN_PASSWORD env var
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only accept PUT requests
  if (req.method !== 'PUT') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only PUT requests are accepted'
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
    const { email, adminDisplayName } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required field: email'
      });
    }

    // Get existing preferences
    const preferences = await getUserPreferences(email.toLowerCase());

    if (!preferences) {
      return res.status(404).json({
        error: 'Not Found',
        message: `User with email '${email}' not found`
      });
    }

    // Update admin display name
    const updated = {
      ...preferences,
      adminDisplayName: adminDisplayName || null
    };

    await updateUserPreferences(email.toLowerCase(), updated);

    console.log('[UPDATE-DISPLAY-NAME] Updated:', email.toLowerCase(), '→', adminDisplayName || '(cleared)');

    return res.status(200).json({
      success: true,
      message: 'Admin display name updated',
      data: {
        email: email.toLowerCase(),
        adminDisplayName: adminDisplayName || null
      }
    });

  } catch (error) {
    console.error('[UPDATE-DISPLAY-NAME] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
