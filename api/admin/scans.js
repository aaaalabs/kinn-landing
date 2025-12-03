/**
 * Get QR scan counts for all events
 * Returns unique scan counts (IP-based deduplication)
 */

import { getRedisClient, getEventsConfig } from '../utils/redis.js';

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

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  if (token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  try {
    const redis = getRedisClient();
    const eventsConfig = await getEventsConfig();

    if (!eventsConfig || !eventsConfig.events) {
      return res.status(200).json({});
    }

    // Fetch scan counts for all events
    const scanCounts = {};

    for (const event of eventsConfig.events) {
      const count = await redis.scard(`scan:${event.id}:unique`);
      scanCounts[event.id] = count || 0;
    }

    return res.status(200).json(scanCounts);

  } catch (error) {
    console.error('Failed to fetch scan counts:', error);
    return res.status(500).json({
      error: 'Failed to fetch scan counts',
      message: error.message
    });
  }
}
