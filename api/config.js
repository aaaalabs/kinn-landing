/**
 * GET /api/config
 *
 * Returns public configuration values (non-sensitive)
 * Used by frontend to get admin email for UI features
 */
export default function handler(req, res) {
  // CORS headers for public endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return non-sensitive config
  res.status(200).json({
    adminEmail: process.env.ADMIN_USERNAME || 'admin@libralab.ai',
  });
}
