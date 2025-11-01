import { verifyProfileToken } from './utils/tokens.js';
import { getUserPreferences, isSubscribed } from './utils/redis.js';
import { generateBrandedError, ErrorTemplates } from './utils/branded-error.js';

/**
 * Profile endpoint for fetching user preferences
 * GET /api/profile?token=...
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
      return res.status(400).send(
        generateBrandedError({
          ...ErrorTemplates.invalidRequest,
          title: 'Ungültiger Link',
          message: 'Der Profil-Link ist ungültig oder fehlt.'
        })
      );
    }

    // [EH01] Log for debugging
    console.log('[PROFILE] Verifying profile token...');

    // Verify token and extract email
    const email = verifyProfileToken(token);

    if (!email) {
      console.error('[PROFILE] Token verification failed');
      return res.status(400).send(
        generateBrandedError({
          ...ErrorTemplates.tokenExpired,
          title: 'Ungültiger Token',
          message: 'Der Profil-Link ist ungültig oder abgelaufen.',
          details: 'Bitte verwende den aktuellen Link aus deiner Willkommens-Email.'
        })
      );
    }

    // Check if user is still subscribed
    const subscribed = await isSubscribed(email);

    if (!subscribed) {
      console.log(`[PROFILE] User not subscribed: ${email}`);
      return res.status(404).send(
        generateBrandedError({
          title: 'Kein Abonnement gefunden',
          message: 'Diese Email-Adresse ist nicht (mehr) für den KINN KI Treff registriert.',
          details: 'Möchtest du dich neu anmelden? Besuche kinn.at'
        })
      );
    }

    // Fetch user preferences
    let preferences = await getUserPreferences(email);

    // If no preferences exist, create default preferences
    if (!preferences) {
      preferences = {
        email,
        notifications: {
          enabled: true // Default: notifications enabled
        },
        subscribedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    console.log(`[PROFILE] Preferences fetched for: ${email}`);

    // Return preferences
    return res.status(200).json({
      success: true,
      preferences: {
        email: preferences.email,
        notifications: preferences.notifications || { enabled: true },
        subscribedAt: preferences.subscribedAt,
        updatedAt: preferences.updatedAt
      }
    });

  } catch (error) {
    // [EH01] Contextual logging
    console.error('[PROFILE] Error fetching profile:', {
      message: error.message,
      name: error.name,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });

    // [EH02] User-friendly error response
    return res.status(500).send(
      generateBrandedError({
        ...ErrorTemplates.serverError,
        message: 'Das Profil konnte nicht geladen werden.',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Bitte versuche es später erneut.'
      })
    );
  }
}
