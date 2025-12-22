import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

const REDIS_KEY = 'kinn:event-links';
const CALENDAR_URL = 'https://luma.com/kinns';

// Fallback if Redis unavailable
const FALLBACK_LINKS = {
  '7': 'https://lu.ma/kinn-7',
  '8': 'https://lu.ma/kinn-8',
};

/**
 * Event Redirect Handler with OG Tags
 * GET /7 → Shows branded preview for social media, then redirects to Luma
 *
 * Config stored in Redis, manageable via Admin Dashboard
 */
export default async function handler(req, res) {
  const { id } = req.query;

  // Normalize ID (remove leading zeros)
  const normalizedId = String(id).replace(/^0+/, '') || id;

  let targetUrl = null;

  try {
    const links = await redis.get(REDIS_KEY);
    if (links) {
      const parsed = typeof links === 'string' ? JSON.parse(links) : links;
      targetUrl = parsed[normalizedId];
    }
  } catch (error) {
    console.error('[EVENT-REDIRECT] Redis error:', error.message);
    targetUrl = FALLBACK_LINKS[normalizedId];
  }

  if (!targetUrl) {
    targetUrl = FALLBACK_LINKS[normalizedId];
  }

  if (!targetUrl) {
    targetUrl = CALENDAR_URL;
  }

  // Return HTML with OG tags for social media + meta-refresh for redirect
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1h

  return res.status(200).send(generateEventPage(normalizedId, targetUrl));
}

function generateEventPage(eventId, targetUrl) {
  const title = `KINN#${eventId} - KI Netzwerk Tirol`;
  const description = `Anmeldung zu KINN#${eventId}. Monatlicher KI-Treff in Innsbruck - Networking, Wissensaustausch, Community.`;
  const ogImage = 'https://kinn.at/public/og-image.png';
  const url = `https://kinn.at/${eventId}`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">

  <!-- Redirect after 0 seconds -->
  <meta http-equiv="refresh" content="0; url=${targetUrl}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:site_name" content="KINN - KI Netzwerk Tirol">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${url}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">

  <!-- Canonical -->
  <link rel="canonical" href="${url}">

  <style>
    body {
      font-family: 'Work Sans', system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f8f9fa;
      color: #3A3A3A;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e0e0e0;
      border-top-color: #5ED9A6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    a {
      color: #5ED9A6;
      text-decoration: none;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>Weiterleitung zu KINN#${eventId}...</p>
    <p><a href="${targetUrl}">Hier klicken falls nicht automatisch weitergeleitet</a></p>
  </div>
</body>
</html>`;
}
