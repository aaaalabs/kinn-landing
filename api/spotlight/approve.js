import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL?.trim(),
  token: process.env.KINNST_KV_REST_API_TOKEN?.trim(),
});

/**
 * Spotlight Approval Endpoint
 * GET /api/spotlight/approve?id=[spotlight-id]
 *
 * Stores approval status in Redis and returns a thank you page
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).send(generateErrorPage('Keine Spotlight-ID angegeben.'));
  }

  try {
    // Store approval in Redis
    const key = `spotlight:${id}`;
    const approvalData = {
      status: 'approved',
      approvedAt: new Date().toISOString(),
      spotlightId: id
    };

    await redis.set(key, JSON.stringify(approvalData));

    console.log(`[SPOTLIGHT] Approval received for spotlight: ${id}`);

    // Return thank you page
    return res.status(200).send(generateThankYouPage(id));

  } catch (error) {
    console.error('[SPOTLIGHT] Approval error:', error.message);
    return res.status(500).send(generateErrorPage('Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.'));
  }
}

function generateThankYouPage(spotlightId) {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Freigabe bestätigt - KINN Spotlight</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Work Sans', system-ui, sans-serif;
      background: #f8f9fa;
      color: #3A3A3A;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .container {
      max-width: 480px;
      text-align: center;
      background: #fff;
      padding: 3rem 2rem;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    .checkmark {
      width: 80px;
      height: 80px;
      background: #5ED9A6;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .checkmark svg {
      width: 40px;
      height: 40px;
      stroke: #fff;
      stroke-width: 3;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #2C3E50;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1rem;
      line-height: 1.6;
      color: #6B6B6B;
      margin-bottom: 1rem;
    }
    .highlight {
      color: #5ED9A6;
      font-weight: 600;
    }
    .back-link {
      display: inline-block;
      margin-top: 1.5rem;
      color: #4A90E2;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.875rem;
    }
    .back-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <h1>Danke für deine Freigabe!</h1>
    <p>Dein Spotlight ist jetzt <span class="highlight">zur Veröffentlichung freigegeben</span>.</p>
    <p>Ich melde mich, sobald es live ist.</p>
    <a href="/" class="back-link">Zur KINN Startseite</a>
  </div>
</body>
</html>
`;
}

function generateErrorPage(message) {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fehler - KINN Spotlight</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Work Sans', system-ui, sans-serif;
      background: #f8f9fa;
      color: #3A3A3A;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .container {
      max-width: 480px;
      text-align: center;
      background: #fff;
      padding: 3rem 2rem;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #2C3E50;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1rem;
      line-height: 1.6;
      color: #6B6B6B;
    }
    .back-link {
      display: inline-block;
      margin-top: 1.5rem;
      color: #4A90E2;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.875rem;
    }
    .back-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Oops!</h1>
    <p>${message}</p>
    <a href="/" class="back-link">Zur KINN Startseite</a>
  </div>
</body>
</html>
`;
}
