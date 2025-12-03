/**
 * Short Link Generator API
 *
 * GET /api/shortlink?eventId=kinn-treff-12-1730123456
 * Returns: { shortId: "abc123", shortUrl: "https://kinn.at/s?id=abc123" }
 *
 * Admin-only endpoint (requires ADMIN_PASSWORD)
 */

import { encodeEventId } from './utils/shortlink.js';

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

  // OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin authentication
  const authHeader = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.substring(7) !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { eventId } = req.query;

  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId parameter' });
  }

  try {
    console.log('Generating short link for event:', eventId);

    // Generate short link
    const shortId = encodeEventId(eventId);
    const baseUrl = (process.env.BASE_URL || 'https://kinn.at').trim();
    const shortUrl = `${baseUrl}/s?id=${shortId}`;

    console.log('Short link generated successfully', { eventId, shortId, shortUrl });

    return res.status(200).json({
      success: true,
      eventId,
      shortId,
      shortUrl,
      qrUrl: shortUrl  // Same URL for QR code generation
    });

  } catch (error) {
    console.error('Short link generation error:', {
      eventId,
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      error: 'Failed to generate short link',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
