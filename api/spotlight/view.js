import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import { join } from 'path';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL?.trim(),
  token: process.env.KINNST_KV_REST_API_TOKEN?.trim(),
});

/**
 * Dynamic Spotlight View
 * GET /api/spotlight/view?id=[spotlight-id]
 *
 * Reads content from /spotlight/[id]/content.json
 * Checks approval status from Redis
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || !/^[a-z0-9]+$/i.test(id)) {
    return res.status(404).send(generateErrorPage('Spotlight nicht gefunden.'));
  }

  // Load content from static JSON file
  let spotlight;
  try {
    const contentPath = join(process.cwd(), 'spotlight', id, 'content.json');
    const content = readFileSync(contentPath, 'utf-8');
    spotlight = JSON.parse(content);
    spotlight.id = id;
  } catch (error) {
    console.error(`[SPOTLIGHT] Content not found for: ${id}`, error.message);
    return res.status(404).send(generateErrorPage('Spotlight nicht gefunden.'));
  }

  // Check approval status in Redis
  let isApproved = false;
  let approvedAt = null;

  try {
    const key = `spotlight:${id}`;
    const data = await redis.get(key);

    if (data) {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      isApproved = parsed.status === 'approved';
      approvedAt = parsed.approvedAt;
    }
  } catch (error) {
    console.error('[SPOTLIGHT] Error checking status:', error.message);
  }

  return res.status(200).send(generateSpotlightPage(spotlight, isApproved, approvedAt));
}

function generateSpotlightPage(spotlight, isApproved, approvedAt) {
  // Convert text with newlines to HTML paragraphs
  const textHtml = spotlight.text
    .split('\n\n')
    .map(para => {
      // Handle arrow lists
      if (para.includes('\n→')) {
        const lines = para.split('\n');
        const intro = lines[0];
        const items = lines.slice(1).map(l => `<li>${l.replace('→ ', '')}</li>`).join('');
        return `<p>${intro}</p><ul class="arrow-list">${items}</ul>`;
      }
      // Handle quotes
      if (para.startsWith('"') && para.endsWith('"')) {
        return `<p class="quote">${para}</p>`;
      }
      // First paragraph is highlight
      if (para === spotlight.text.split('\n\n')[0]) {
        return `<p class="highlight">${para}</p>`;
      }
      // Last paragraph is CTA
      if (para.includes('KINN#')) {
        return `<p class="cta-line">${para}</p>`;
      }
      return `<p>${para}</p>`;
    })
    .join('');

  const approvalSection = isApproved
    ? `
      <div class="approval-section approved">
        <div class="checkmark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 class="approval-title">Freigabe erteilt</h2>
        <p class="approval-desc">Danke! Dieses Spotlight wurde am ${formatDate(approvedAt)} freigegeben.</p>
      </div>
    `
    : `
      <div class="approval-section">
        <h2 class="approval-title">Passt alles?</h2>
        <p class="approval-desc">Mit deiner Freigabe können wir das Spotlight veröffentlichen.</p>

        <a href="/api/spotlight/approve?id=${spotlight.id}" class="approve-btn">
          Ich bin einverstanden
        </a>

        <p class="contact-hint">
          Anmerkungen oder Änderungswünsche?<br>
          <a href="https://linkedin.com/in/thomasseiger" target="_blank" rel="noopener">Kontaktiere mich auf LinkedIn</a>
        </p>
      </div>
    `;

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KINN Spotlight: ${spotlight.name}</title>
  <meta name="description" content="${spotlight.name} - ${spotlight.title}. KINN Spotlight Preview.">
  <meta name="robots" content="noindex, nofollow">

  <meta property="og:title" content="KINN Spotlight: ${spotlight.name}">
  <meta property="og:description" content="${spotlight.title}">
  <meta property="og:image" content="https://kinn.at/spotlight/${spotlight.id}/${spotlight.image}">
  <meta property="og:url" content="https://kinn.at/spotlight/${spotlight.id}">
  <meta property="og:type" content="profile">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Work Sans', system-ui, -apple-system, sans-serif;
      background: #f8f9fa;
      color: #3A3A3A;
      line-height: 1.618;
      min-height: 100vh;
    }
    .container { max-width: 600px; margin: 0 auto; padding: 2rem 1rem; }
    .header { text-align: center; margin-bottom: 1.5rem; }
    .header-label {
      font-size: 0.75rem; font-weight: 500; color: #5ED9A6;
      text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.25rem;
    }
    .header-title { font-size: 1.25rem; font-weight: 600; color: #2C3E50; }
    .spotlight-image {
      width: 100%; border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 1.5rem;
    }
    .spotlight-text {
      background: #fff; border-radius: 12px; padding: 1.5rem;
      margin-bottom: 1.5rem; box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .spotlight-text p { margin-bottom: 1rem; font-size: 0.9375rem; line-height: 1.7; }
    .spotlight-text p:last-child { margin-bottom: 0; }
    .spotlight-text .highlight { font-weight: 600; color: #2C3E50; }
    .spotlight-text .quote { font-style: italic; color: #6B6B6B; }
    .spotlight-text .arrow-list { margin: 0.75rem 0; padding-left: 0; list-style: none; }
    .spotlight-text .arrow-list li {
      position: relative; padding-left: 1.5rem; margin-bottom: 0.5rem; font-size: 0.9375rem;
    }
    .spotlight-text .arrow-list li::before {
      content: "→"; position: absolute; left: 0; color: #5ED9A6; font-weight: 600;
    }
    .spotlight-text .cta-line { font-weight: 600; color: #5ED9A6; margin-top: 1rem; }
    .approval-section {
      background: #fff; border-radius: 12px; padding: 1.5rem;
      text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .approval-section.approved { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .approval-title { font-size: 1rem; font-weight: 600; color: #2C3E50; margin-bottom: 0.5rem; }
    .approval-desc { font-size: 0.875rem; color: #6B6B6B; margin-bottom: 1rem; }
    .approve-btn {
      display: inline-block; background: #5ED9A6; color: #000;
      font-family: 'Work Sans', sans-serif; font-size: 0.9375rem; font-weight: 600;
      padding: 0.75rem 2rem; border: none; border-radius: 8px;
      cursor: pointer; text-decoration: none; transition: all 0.2s ease; margin-bottom: 1rem;
    }
    .approve-btn:hover { background: #4bc794; transform: translateY(-1px); }
    .checkmark {
      width: 60px; height: 60px; background: #5ED9A6; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;
    }
    .checkmark svg { width: 30px; height: 30px; stroke: #fff; stroke-width: 3; }
    .contact-hint { font-size: 0.8125rem; color: #999; }
    .contact-hint a { color: #4A90E2; text-decoration: none; font-weight: 500; }
    .contact-hint a:hover { text-decoration: underline; }
    .footer { text-align: center; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0; }
    .footer-logo { width: 80px; opacity: 0.6; margin-bottom: 0.5rem; }
    .footer-text { font-size: 0.75rem; color: #999; }
    @media (max-width: 480px) {
      .container { padding: 1rem; }
      .spotlight-text, .approval-section { padding: 1.25rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="header-label">KINN Spotlight Preview</p>
      <h1 class="header-title">${spotlight.name}</h1>
    </div>

    <img
      src="/spotlight/${spotlight.id}/${spotlight.image}"
      alt="${spotlight.name} - KINN Spotlight"
      class="spotlight-image"
    >

    <div class="spotlight-text">
      ${textHtml}
    </div>

    ${approvalSection}

    <div class="footer">
      <svg class="footer-logo" viewBox="0 0 931.35 308.55" xmlns="http://www.w3.org/2000/svg">
        <polygon fill="#3A3A3A" points="495.04 20.27 569.04 153.27 569.04 20.27 654.04 20.27 654.04 288.27 572.54 288.27 498.04 159.27 498.04 288.27 416.04 288.27 416.04 20.27 495.04 20.27"/>
        <path fill="#3A3A3A" d="M682.04,20.27l78.89.11,73.11,133.89V20.27h81v268h-80l-72-130v130h-78.5c-.61,0-1.53-.8-2.5,0V20.27Z"/>
        <polygon fill="#3A3A3A" points="100.04 20.27 100.04 136.27 160.54 20.27 256.04 20.27 182.26 145.61 262.04 288.27 166.54 288.27 100.04 159.27 100.04 288.27 21.04 288.27 21.04 20.27 100.04 20.27"/>
        <path fill="#3A3A3A" d="M359.04,20.27v265.5c0,.31,1.37,1.42,1,2.5h-82V20.27h81Z"/>
      </svg>
      <p class="footer-text">KI Netzwerk Tirol</p>
    </div>
  </div>
</body>
</html>
`;
}

function formatDate(isoString) {
  if (!isoString) return 'unbekannt';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return 'unbekannt';
  }
}

function generateErrorPage(message) {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nicht gefunden - KINN Spotlight</title>
  <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Work Sans', system-ui, sans-serif; background: #f8f9fa; color: #3A3A3A;
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem;
    }
    .container {
      max-width: 480px; text-align: center; background: #fff;
      padding: 3rem 2rem; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    h1 { font-size: 1.5rem; font-weight: 600; color: #2C3E50; margin-bottom: 1rem; }
    p { font-size: 1rem; line-height: 1.6; color: #6B6B6B; }
    .back-link {
      display: inline-block; margin-top: 1.5rem; color: #4A90E2;
      text-decoration: none; font-weight: 500; font-size: 0.875rem;
    }
    .back-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Nicht gefunden</h1>
    <p>${message}</p>
    <a href="/" class="back-link">Zur KINN Startseite</a>
  </div>
</body>
</html>
`;
}
