/**
 * POST /api/radar/notify-failure
 * Sends immediate Pushbullet notification for source failures
 * Called internally when extraction fails
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Internal calls only
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.RADAR_ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const PUSHBULLET_API_KEY = process.env.PUSHBULLET_API_KEY;
  if (!PUSHBULLET_API_KEY) {
    return res.status(200).json({
      success: false,
      reason: 'PUSHBULLET_API_KEY not configured'
    });
  }

  try {
    const { sourceName, error, timestamp } = req.body;

    if (!sourceName || !error) {
      return res.status(400).json({ error: 'sourceName and error required' });
    }

    const title = `KINN Radar: ${sourceName} failed`;
    const body = `Error: ${error}\nTime: ${timestamp || new Date().toISOString()}`;

    const response = await fetch('https://api.pushbullet.com/v2/pushes', {
      method: 'POST',
      headers: {
        'Access-Token': PUSHBULLET_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'note',
        title: title,
        body: body
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pushbullet API error: ${response.status} - ${errorText}`);
    }

    return res.status(200).json({
      success: true,
      notified: true
    });

  } catch (error) {
    console.error('[NOTIFY-FAILURE] Error:', error);
    return res.status(500).json({
      error: 'Failed to send notification',
      message: error.message
    });
  }
}
