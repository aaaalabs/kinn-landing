import { verifyConfirmToken } from './utils/tokens.js';
import { addSubscriber, isSubscribed } from './utils/redis.js';

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
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <title>Fehler - KINN</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: #ffffff;
              margin: 0;
            }
            .container {
              text-align: center;
              max-width: 400px;
              padding: 40px;
            }
            h1 { font-size: 2rem; font-weight: 300; color: #333; margin-bottom: 1rem; }
            p { color: #666; line-height: 1.618; }
            a {
              display: inline-block;
              margin-top: 2rem;
              padding: 12px 24px;
              background: #E0EEE9;
              color: #000;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Ungültiger Link</h1>
            <p>Der Bestätigungslink ist ungültig oder fehlt.</p>
            <a href="/">Zurück zur Startseite</a>
          </div>
        </body>
        </html>
      `);
    }

    // [EH01] Log for debugging
    console.log('[CONFIRM] Verifying token...');

    // Verify token and extract email
    const email = verifyConfirmToken(token);

    if (!email) {
      console.error('[CONFIRM] Token verification failed');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <title>Link abgelaufen - KINN</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: #ffffff;
              margin: 0;
            }
            .container {
              text-align: center;
              max-width: 400px;
              padding: 40px;
            }
            h1 { font-size: 2rem; font-weight: 300; color: #333; margin-bottom: 1rem; }
            p { color: #666; line-height: 1.618; }
            a {
              display: inline-block;
              margin-top: 2rem;
              padding: 12px 24px;
              background: #E0EEE9;
              color: #000;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Link abgelaufen</h1>
            <p>Dieser Bestätigungslink ist abgelaufen (gültig für 48 Stunden).</p>
            <p>Bitte melde dich erneut an, um einen neuen Link zu erhalten.</p>
            <a href="/">Zurück zur Startseite</a>
          </div>
        </body>
        </html>
      `);
    }

    // Check if already subscribed
    const alreadySubscribed = await isSubscribed(email);

    if (alreadySubscribed) {
      console.log(`[CONFIRM] Email already subscribed: ${email}`);
      return res.redirect('/pages/success.html?status=already-subscribed');
    }

    // Add to Redis subscribers set
    const added = await addSubscriber(email);

    if (!added) {
      // This shouldn't happen since we checked isSubscribed, but handle it anyway
      console.warn(`[CONFIRM] Subscriber was already in set: ${email}`);
      return res.redirect('/pages/success.html?status=already-subscribed');
    }

    // [EH01] Log success
    console.log(`[CONFIRM] New subscriber confirmed: ${email}`);

    // Redirect to success page
    return res.redirect('/pages/success.html?status=confirmed');

  } catch (error) {
    // [EH01] Contextual logging
    console.error('[CONFIRM] Error processing confirmation:', {
      message: error.message,
      name: error.name,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });

    // [EH02] User-friendly error response
    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <title>Fehler - KINN</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #ffffff;
            margin: 0;
          }
          .container {
            text-align: center;
            max-width: 400px;
            padding: 40px;
          }
          h1 { font-size: 2rem; font-weight: 300; color: #333; margin-bottom: 1rem; }
          p { color: #666; line-height: 1.618; }
          a {
            display: inline-block;
            margin-top: 2rem;
            padding: 12px 24px;
            background: #E0EEE9;
            color: #000;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Ein Fehler ist aufgetreten</h1>
          <p>Die Bestätigung konnte nicht verarbeitet werden.</p>
          <p>Bitte versuche es später erneut.</p>
          <a href="/">Zurück zur Startseite</a>
        </div>
      </body>
      </html>
    `);
  }
}
