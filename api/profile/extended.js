import { verifyProfileToken } from '../utils/tokens.js';
import { getProfile, getUserPreferences, isSubscribed } from '../utils/redis.js';
import { generateBrandedError, ErrorTemplates } from '../utils/branded-error.js';

/**
 * Extended Profile endpoint - returns full profile including supply/demand
 * GET /api/profile/extended?token=...
 *
 * [CP01] KISS: Simple token verification → fetch → return
 * [EH02] User-friendly error messages
 */
export default async function handler(req, res) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are accepted'
    });
  }

  try {
    // Extract token from query params
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Token is required'
      });
    }

    // Verify token and extract email
    const email = verifyProfileToken(token);

    if (!email) {
      console.error('[PROFILE_EXTENDED] Token verification failed');
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token ist ungültig oder abgelaufen'
      });
    }

    // Check if user is still subscribed
    const subscribed = await isSubscribed(email);

    if (!subscribed) {
      console.log(`[PROFILE_EXTENDED] User not subscribed: ${email}`);
      return res.status(404).json({
        error: 'Not subscribed',
        message: 'Diese Email-Adresse ist nicht registriert'
      });
    }

    // Fetch extended profile and preferences
    const [profile, preferences] = await Promise.all([
      getProfile(email),
      getUserPreferences(email)
    ]);

    console.log(`[PROFILE_EXTENDED] Profile fetched for: ${email}`);

    // Return combined profile data
    return res.status(200).json({
      success: true,
      profile: profile || null,
      preferences: preferences || {
        email,
        notifications: { enabled: true },
        subscribedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[PROFILE_EXTENDED] Error fetching profile:', {
      message: error.message,
      name: error.name,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });

    return res.status(500).json({
      error: 'Server error',
      message: 'Das Profil konnte nicht geladen werden.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
