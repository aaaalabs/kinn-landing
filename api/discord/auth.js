/**
 * Discord OAuth2 - Authorization Start
 * Initiates the OAuth2 flow by redirecting to Discord's authorization page
 */

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://kinn.at',
    'https://www.kinn.at',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:8000', 'http://localhost:3000'] : [])
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Discord configuration
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_REDIRECT_URI) {
    console.error('Discord OAuth Error: Missing configuration', {
      hasClientId: !!process.env.DISCORD_CLIENT_ID,
      hasRedirectUri: !!process.env.DISCORD_REDIRECT_URI
    });
    return res.status(500).json({
      error: 'Discord nicht konfiguriert',
      details: 'DISCORD_CLIENT_ID oder DISCORD_REDIRECT_URI fehlt'
    });
  }

  try {
    // Generate CSRF protection state
    const state = Buffer.from(JSON.stringify({
      ts: Date.now(),
      nonce: Math.random().toString(36).substring(7)
    })).toString('base64');

    // Build Discord OAuth2 authorization URL
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds.join',
      state: state,
    });

    const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

    console.log('Discord OAuth: Redirecting to authorization page', {
      clientId: process.env.DISCORD_CLIENT_ID,
      redirectUri: process.env.DISCORD_REDIRECT_URI
    });

    // Redirect to Discord
    return res.redirect(302, authUrl);

  } catch (error) {
    console.error('Discord OAuth Error:', error);
    return res.status(500).json({
      error: 'Fehler beim Starten der Discord-Autorisierung',
      message: error.message
    });
  }
}
