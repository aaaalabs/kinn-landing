import { verifyProfileToken } from '../utils/tokens.js';
import { enforceRateLimit } from '../utils/rate-limiter.js';

/**
 * Magic Link Login Endpoint
 * Verifies auth token from email and redirects to dashboard
 *
 * Flow:
 * 1. User clicks magic link in email (/api/auth/login?token=xxx)
 * 2. Verify token validity and expiration
 * 3. Redirect to dashboard with token in URL fragment
 * 4. Client-side JS stores token in localStorage
 *
 * Security:
 * - Rate limited to prevent brute force attacks
 * - Tokens expire after 30 days
 * - Single token type for simplicity
 */
export default async function handler(req, res) {
  // Only accept GET requests (magic links are GET)
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are accepted'
    });
  }

  // Rate limiting: 5 requests per 15 minutes per IP
  const rateLimitAllowed = await enforceRateLimit(req, res, {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'ratelimit:login'
  });

  if (!rateLimitAllowed) {
    return; // Response already sent by enforceRateLimit
  }

  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ungültiger Link | KINN</title>
          <style>
            body {
              font-family: 'Work Sans', system-ui, sans-serif;
              background: linear-gradient(135deg, #E0EEE9 0%, #ffffff 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 1rem;
            }
            .container {
              background: white;
              border-radius: 16px;
              padding: 2rem;
              max-width: 480px;
              box-shadow: 0 4px 16px rgba(0,0,0,0.08);
              text-align: center;
            }
            h1 {
              color: #2C3E50;
              font-size: 1.5rem;
              margin-bottom: 1rem;
            }
            p {
              color: #6B6B6B;
              line-height: 1.6;
              margin-bottom: 1.5rem;
            }
            a {
              display: inline-block;
              background: #5ED9A6;
              color: #000;
              text-decoration: none;
              padding: 0.875rem 2rem;
              border-radius: 8px;
              font-weight: 600;
              transition: all 0.2s;
            }
            a:hover {
              background: #4EC995;
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ Ungültiger Login-Link</h1>
            <p>Der Login-Link ist ungültig oder unvollständig. Bitte verwende den Link aus deiner Email.</p>

            <div style="background: rgba(94, 217, 166, 0.1); border: 2px solid #5ED9A6; border-radius: 12px; padding: 1.5rem; margin: 2rem 0; text-align: left;">
              <h3 style="color: #2C3E50; margin: 0 0 1rem 0; font-size: 1rem; font-weight: 600;">
                🆘 Kein Link erhalten?
              </h3>
              <p style="color: #6B6B6B; margin-bottom: 1rem; font-size: 0.95rem; line-height: 1.6;">
                Falls du keine Email bekommen hast oder der Link immer noch nicht funktioniert:
              </p>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <a href="mailto:thomas@kinn.at?subject=Kein%20Login-Link%20erhalten&body=Hallo%2C%0A%0AIch%20habe%20keinen%20Login-Link%20erhalten.%20Meine%20Email%3A%20"
                   style="display: inline-flex; align-items: center; gap: 0.5rem; color: #2C3E50; text-decoration: none; padding: 0.75rem 1rem; background: white; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); font-weight: 500;">
                  <span>📧</span>
                  <span>thomas@kinn.at</span>
                </a>
                <a href="https://wa.me/436601238172?text=Hallo%2C%20ich%20habe%20keinen%20KINN%20Login-Link%20erhalten."
                   style="display: inline-flex; align-items: center; gap: 0.5rem; color: #2C3E50; text-decoration: none; padding: 0.75rem 1rem; background: white; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); font-weight: 500;">
                  <span>💬</span>
                  <span>0660 123 8172</span>
                </a>
              </div>
            </div>

            <a href="/">Zur Startseite</a>
          </div>
        </body>
        </html>
      `);
    }

    // Verify auth token (profile token - valid for 30 days)
    const email = verifyProfileToken(token);

    if (!email) {
      console.log('[LOGIN] Invalid or expired token');
      return res.status(401).send(`
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link abgelaufen | KINN</title>
          <style>
            body {
              font-family: 'Work Sans', system-ui, sans-serif;
              background: linear-gradient(135deg, #E0EEE9 0%, #ffffff 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 1rem;
            }
            .container {
              background: white;
              border-radius: 16px;
              padding: 2rem;
              max-width: 480px;
              box-shadow: 0 4px 16px rgba(0,0,0,0.08);
              text-align: center;
            }
            h1 {
              color: #2C3E50;
              font-size: 1.5rem;
              margin-bottom: 1rem;
            }
            p {
              color: #6B6B6B;
              line-height: 1.6;
              margin-bottom: 1.5rem;
            }
            a {
              display: inline-block;
              background: #5ED9A6;
              color: #000;
              text-decoration: none;
              padding: 0.875rem 2rem;
              border-radius: 8px;
              font-weight: 600;
              transition: all 0.2s;
              margin: 0.5rem;
            }
            a:hover {
              background: #4EC995;
              transform: translateY(-2px);
            }
            .secondary {
              background: rgba(255,255,255,0.8);
              color: #6B6B6B;
              border: 1px solid rgba(0,0,0,0.12);
            }
            .secondary:hover {
              background: rgba(255,255,255,0.95);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⏰ Login-Link abgelaufen</h1>
            <p>Dieser Login-Link ist abgelaufen oder wurde bereits verwendet. Links sind 30 Tage gültig.</p>
            <p>Gib deine Email-Adresse erneut ein, um einen neuen Login-Link zu erhalten.</p>

            <div style="background: rgba(94, 217, 166, 0.1); border: 2px solid #5ED9A6; border-radius: 12px; padding: 1.5rem; margin: 2rem 0; text-align: left;">
              <h3 style="color: #2C3E50; margin: 0 0 1rem 0; font-size: 1rem; font-weight: 600;">
                🆘 Link funktioniert immer noch nicht?
              </h3>
              <p style="color: #6B6B6B; margin-bottom: 1rem; font-size: 0.95rem; line-height: 1.6;">
                Kontaktiere uns direkt:
              </p>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <a href="mailto:thomas@kinn.at?subject=Login-Link%20abgelaufen&body=Hallo%2C%0A%0AMein%20Login-Link%20ist%20abgelaufen.%20Meine%20Email%3A%20"
                   style="display: inline-flex; align-items: center; gap: 0.5rem; color: #2C3E50; text-decoration: none; padding: 0.75rem 1rem; background: white; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); font-weight: 500;">
                  <span>📧</span>
                  <span>thomas@kinn.at</span>
                </a>
                <a href="https://wa.me/436601238172?text=Hallo%2C%20mein%20KINN%20Login-Link%20ist%20abgelaufen."
                   style="display: inline-flex; align-items: center; gap: 0.5rem; color: #2C3E50; text-decoration: none; padding: 0.75rem 1rem; background: white; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); font-weight: 500;">
                  <span>💬</span>
                  <span>0660 123 8172</span>
                </a>
              </div>
            </div>

            <a href="/">Neuen Link anfordern</a>
          </div>
        </body>
        </html>
      `);
    }

    console.log(`[LOGIN] Valid token for ${email}`);

    // Redirect to user portal (profil.html) with token in URL fragment (hash)
    // This keeps the token client-side only (not sent to server)
    const portalUrl = `/pages/profil.html#token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    return res.redirect(302, portalUrl);

  } catch (error) {
    console.error('[LOGIN] Error processing login:', error.message);

    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fehler | KINN</title>
        <style>
          body {
            font-family: 'Work Sans', system-ui, sans-serif;
            background: linear-gradient(135deg, #E0EEE9 0%, #ffffff 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 1rem;
          }
          .container {
            background: white;
            border-radius: 16px;
            padding: 2rem;
            max-width: 480px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.08);
            text-align: center;
          }
          h1 {
            color: #2C3E50;
            font-size: 1.5rem;
            margin-bottom: 1rem;
          }
          p {
            color: #6B6B6B;
            line-height: 1.6;
            margin-bottom: 1.5rem;
          }
          a {
            display: inline-block;
            background: #5ED9A6;
            color: #000;
            text-decoration: none;
            padding: 0.875rem 2rem;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.2s;
          }
          a:hover {
            background: #4EC995;
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Ein Fehler ist aufgetreten</h1>
          <p>Beim Verarbeiten deines Login-Links ist ein Fehler aufgetreten. Bitte versuche es erneut.</p>

          <div style="background: rgba(94, 217, 166, 0.1); border: 2px solid #5ED9A6; border-radius: 12px; padding: 1.5rem; margin: 2rem 0; text-align: left;">
            <h3 style="color: #2C3E50; margin: 0 0 1rem 0; font-size: 1rem; font-weight: 600;">
              🆘 Brauchst du Hilfe?
            </h3>
            <p style="color: #6B6B6B; margin-bottom: 1rem; font-size: 0.95rem; line-height: 1.6;">
              Dieser Fehler sollte nicht passieren. Kontaktiere uns bitte:
            </p>
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              <a href="mailto:thomas@kinn.at?subject=Login-Fehler&body=Hallo%2C%0A%0ABei%20meinem%20Login%20ist%20ein%20Fehler%20aufgetreten.%20Meine%20Email%3A%20"
                 style="display: inline-flex; align-items: center; gap: 0.5rem; color: #2C3E50; text-decoration: none; padding: 0.75rem 1rem; background: white; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); font-weight: 500;">
                <span>📧</span>
                <span>thomas@kinn.at</span>
              </a>
              <a href="https://wa.me/436601238172?text=Hallo%2C%20bei%20meinem%20KINN%20Login%20ist%20ein%20Fehler%20aufgetreten."
                 style="display: inline-flex; align-items: center; gap: 0.5rem; color: #2C3E50; text-decoration: none; padding: 0.75rem 1rem; background: white; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); font-weight: 500;">
                <span>💬</span>
                <span>0660 123 8172</span>
              </a>
            </div>
          </div>

          <a href="/">Zur Startseite</a>
        </div>
      </body>
      </html>
    `);
  }
}
