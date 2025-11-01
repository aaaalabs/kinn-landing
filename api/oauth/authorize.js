import { generateConfirmToken } from '../utils/tokens.js';
import { generateBrandedError, ErrorTemplates } from '../utils/branded-error.js';

/**
 * OAuth Authorization Endpoint
 * Initiates Google Calendar OAuth flow
 *
 * [CP01] KISS: Simple redirect to Google OAuth
 * [SC02] Input validation and CSRF protection
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
    const { email } = req.query;

    // [SC02] Validate email parameter
    if (!email || typeof email !== 'string') {
      return res.status(400).send(
        generateBrandedError({
          ...ErrorTemplates.invalidRequest,
          details: 'Email-Parameter fehlt.'
        })
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).send(
        generateBrandedError(ErrorTemplates.invalidEmail)
      );
    }

    // [SC02] Generate state parameter for CSRF protection
    // State = JWT with email + timestamp (15 min expiry)
    const state = generateConfirmToken(email);

    // Build Google OAuth URL
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');

    googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set('redirect_uri', `${process.env.BASE_URL || 'https://kinn.at'}/api/oauth/callback`);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events');
    googleAuthUrl.searchParams.set('access_type', 'offline'); // Request refresh token
    googleAuthUrl.searchParams.set('prompt', 'consent'); // Force consent screen to get refresh token
    googleAuthUrl.searchParams.set('state', state);

    console.log('[OAUTH] Initiating OAuth flow for:', email.split('@')[1]);

    // Redirect to Google OAuth consent screen
    return res.redirect(googleAuthUrl.toString());

  } catch (error) {
    console.error('[OAUTH] Authorization error:', error.message);

    return res.status(500).send(
      generateBrandedError({
        ...ErrorTemplates.serverError,
        message: 'Die OAuth-Autorisierung konnte nicht gestartet werden.',
        details: process.env.NODE_ENV === 'development' ? error.message : null
      })
    );
  }
}
