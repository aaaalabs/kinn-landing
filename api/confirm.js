import { verifyConfirmToken } from './utils/tokens.js';
import { addSubscriber, isSubscribed } from './utils/redis.js';
import { generateBrandedError, ErrorTemplates } from './utils/branded-error.js';

/**
 * Confirmation endpoint for email opt-in
 * Verifies JWT token and adds subscriber to Redis
 *
 * [CP01] KISS: Simple GET → verify → store → redirect
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
          message: 'Der Bestätigungslink ist ungültig oder fehlt.'
        })
      );
    }

    // [EH01] Log for debugging
    console.log('[CONFIRM] Verifying token...');

    // Verify token and extract email
    const email = verifyConfirmToken(token);

    if (!email) {
      console.error('[CONFIRM] Token verification failed');
      return res.status(400).send(
        generateBrandedError({
          ...ErrorTemplates.tokenExpired,
          details: 'Bitte melde dich erneut an, um einen neuen Link zu erhalten.'
        })
      );
    }

    // Check if already subscribed
    const alreadySubscribed = await isSubscribed(email);

    if (alreadySubscribed) {
      console.log(`[CONFIRM] Email already subscribed: ${email}`);
      return res.redirect(`/pages/success.html?status=already-subscribed&email=${encodeURIComponent(email)}`);
    }

    // Add to Redis subscribers set
    const added = await addSubscriber(email);

    if (!added) {
      // This shouldn't happen since we checked isSubscribed, but handle it anyway
      console.warn(`[CONFIRM] Subscriber was already in set: ${email}`);
      return res.redirect(`/pages/success.html?status=already-subscribed&email=${encodeURIComponent(email)}`);
    }

    // [EH01] Log success
    console.log(`[CONFIRM] New subscriber confirmed: ${email}`);

    // Redirect to success page with email for OAuth flow
    return res.redirect(`/pages/success.html?status=confirmed&email=${encodeURIComponent(email)}`);

  } catch (error) {
    // [EH01] Contextual logging
    console.error('[CONFIRM] Error processing confirmation:', {
      message: error.message,
      name: error.name,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });

    // [EH02] User-friendly error response
    return res.status(500).send(
      generateBrandedError({
        ...ErrorTemplates.serverError,
        message: 'Die Bestätigung konnte nicht verarbeitet werden.',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Bitte versuche es später erneut.'
      })
    );
  }
}
