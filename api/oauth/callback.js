import { verifyConfirmToken } from '../utils/tokens.js';
import { encryptTokens } from '../utils/encryption.js';
import { storeOAuthTokens } from '../utils/redis.js';

/**
 * OAuth Callback Endpoint
 * Handles Google OAuth callback and stores tokens
 *
 * [CP01] KISS: Verify state → exchange code → encrypt → store → redirect
 * [SC02] Input validation and token security
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
    const { code, state, error: oauthError } = req.query;

    // Check if user denied authorization
    if (oauthError) {
      console.log('[OAUTH] User denied authorization:', oauthError);
      return res.redirect('/pages/success.html?status=oauth-denied');
    }

    // [SC02] Validate parameters
    if (!code || !state) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <title>Fehler - KINN</title>
        </head>
        <body>
          <h1>Ungültige OAuth Callback</h1>
          <p>Code oder State Parameter fehlt.</p>
          <a href="/">Zurück zur Startseite</a>
        </body>
        </html>
      `);
    }

    // [SC02] Verify state parameter (CSRF protection)
    const email = verifyConfirmToken(state);

    if (!email) {
      console.error('[OAUTH] Invalid or expired state token');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <title>Fehler - KINN</title>
        </head>
        <body>
          <h1>Ungültiger oder abgelaufener Link</h1>
          <p>Der OAuth-Link ist abgelaufen oder ungültig.</p>
          <p>Bitte starte den Prozess erneut.</p>
          <a href="/">Zurück zur Startseite</a>
        </body>
        </html>
      `);
    }

    console.log('[OAUTH] Valid state, exchanging code for tokens...');

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.BASE_URL || 'https://kinn.at'}/api/oauth/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[OAUTH] Token exchange failed:', errorData);
      throw new Error(`Token exchange failed: ${errorData.error || 'Unknown error'}`);
    }

    const tokens = await tokenResponse.json();

    // Build token object
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: Date.now() + (tokens.expires_in * 1000), // Convert seconds to ms
      scope: tokens.scope,
      token_type: tokens.token_type,
    };

    // [SC02] Encrypt tokens before storage
    const encryptedTokens = encryptTokens(tokenData);

    // Store in Redis
    await storeOAuthTokens(email, encryptedTokens);

    console.log('[OAUTH] Tokens stored successfully for:', email.split('@')[1]);

    // Redirect to success page
    return res.redirect('/pages/success.html?status=oauth-connected');

  } catch (error) {
    console.error('[OAUTH] Callback error:', {
      message: error.message,
      name: error.name,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });

    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <title>Fehler - KINN</title>
      </head>
      <body>
        <h1>Ein Fehler ist aufgetreten</h1>
        <p>Die Kalender-Verbindung konnte nicht hergestellt werden.</p>
        <p>Bitte versuche es später erneut.</p>
        <a href="/">Zurück zur Startseite</a>
      </body>
      </html>
    `);
  }
}
