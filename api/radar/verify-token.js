export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        valid: false,
        error: 'Token required'
      });
    }

    // Check against environment variable
    const isValid = token === process.env.RADAR_ADMIN_TOKEN;

    if (isValid) {
      return res.status(200).json({
        valid: true,
        message: 'Token valid'
      });
    } else {
      return res.status(401).json({
        valid: false,
        error: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('[VERIFY-TOKEN] Error:', error);
    return res.status(500).json({
      valid: false,
      error: 'Verification failed'
    });
  }
}