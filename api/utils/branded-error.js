/**
 * Branded Error Page Generator for KINN
 *
 * Generates consistent, brand-aligned error pages for OAuth and other flows
 * Uses KINN visual identity: Work Sans font, Mountain Blue colors, KINN logo
 *
 * [CP01] KISS: Simple HTML template with inline styles
 */

/**
 * Generate a branded error page
 *
 * @param {Object} options - Error page options
 * @param {string} options.title - Page title (e.g., "Ungültige Anfrage")
 * @param {string} options.message - Error message to display
 * @param {string} [options.details] - Optional additional details
 * @param {string} [options.backUrl] - URL for back button (default: "/")
 * @param {string} [options.backText] - Text for back button (default: "Zurück zur Startseite")
 * @returns {string} Complete HTML page
 */
export function generateBrandedError({
  title,
  message,
  details = null,
  backUrl = '/',
  backText = 'Zurück zur Startseite'
}) {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - KINN</title>

  <!-- Typography: Work Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Work Sans', system-ui, -apple-system, sans-serif;
      background: #fff;
      color: #3A3A3A;
      line-height: 1.618;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .container {
      max-width: 600px;
      width: 100%;
      text-align: center;
    }

    .logo {
      width: 280px;
      max-width: 80%;
      margin: 0 auto 2rem;
      display: block;
    }

    h1 {
      font-family: 'Work Sans', sans-serif;
      font-size: 1.75rem;
      font-weight: 700;
      color: #2C3E50;
      margin-bottom: 1rem;
      line-height: 1.3;
    }

    .message {
      font-family: 'Work Sans', sans-serif;
      font-size: 1rem;
      font-weight: 400;
      color: #6B6B6B;
      margin-bottom: 1.5rem;
      line-height: 1.6;
    }

    .details {
      font-family: 'Work Sans', sans-serif;
      font-size: 0.875rem;
      font-weight: 300;
      color: #999;
      margin-bottom: 2rem;
      padding: 1rem;
      background: #F8F9FA;
      border-radius: 8px;
      border-left: 3px solid #E0EEE9;
    }

    .back-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.5rem;
      background: #E0EEE9;
      color: #000;
      text-decoration: none;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: 'Work Sans', sans-serif;
    }

    .back-button:hover {
      background: #d5e3de;
    }

    .back-button:active {
      background: #cad8d3;
    }

    .footer {
      margin-top: 3rem;
      font-size: 0.75rem;
      color: #ccc;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 300;
      font-family: 'Work Sans', sans-serif;
    }

    @media (max-width: 640px) {
      .logo {
        width: 200px;
      }

      h1 {
        font-size: 1.5rem;
      }

      .message {
        font-size: 0.9rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- KINN Logo SVG -->
    <svg class="logo" viewBox="0 0 931.35 308.55" xmlns="http://www.w3.org/2000/svg">
      <polygon points="495.04 20.27 569.04 153.27 569.04 20.27 654.04 20.27 654.04 288.27 572.54 288.27 498.04 159.27 498.04 288.27 416.04 288.27 416.04 20.27 495.04 20.27"/>
      <path d="M682.04,20.27l78.89.11,73.11,133.89V20.27h81v268h-80l-72-130v130h-78.5c-.61,0-1.53-.8-2.5,0V20.27Z"/>
      <polygon points="100.04 20.27 100.04 136.27 160.54 20.27 256.04 20.27 182.26 145.61 262.04 288.27 166.54 288.27 100.04 159.27 100.04 288.27 21.04 288.27 21.04 20.27 100.04 20.27"/>
      <path d="M359.04,20.27v265.5c0,.31,1.37,1.42,1,2.5h-82V20.27h81Z"/>
    </svg>

    <h1>${title}</h1>
    <p class="message">${message}</p>

    ${details ? `<div class="details">${details}</div>` : ''}

    <a href="${backUrl}" class="back-button">${backText}</a>

    <p class="footer">KINN – Wo Tiroler KI Profil bekommt</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Common error scenarios with pre-defined messages
 */
export const ErrorTemplates = {
  invalidRequest: {
    title: 'Ungültige Anfrage',
    message: 'Die Anfrage konnte nicht verarbeitet werden.',
  },

  invalidEmail: {
    title: 'Ungültige Email-Adresse',
    message: 'Bitte gib eine gültige Email-Adresse an.',
  },

  oauthFailed: {
    title: 'Autorisierung fehlgeschlagen',
    message: 'Die Google Calendar Autorisierung konnte nicht abgeschlossen werden.',
  },

  serverError: {
    title: 'Ein Fehler ist aufgetreten',
    message: 'Entschuldigung, etwas ist schiefgelaufen. Bitte versuche es später erneut.',
  },

  tokenExpired: {
    title: 'Link abgelaufen',
    message: 'Dieser Bestätigungslink ist abgelaufen. Bitte fordere einen neuen Link an.',
  },
};
