/**
 * GET /api/raus/stats
 *
 * Returns RAUS submission statistics for the teaser widget
 *
 * Response: { total, verified, goal, userSubmissions? }
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

const GOAL = 50;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.query;

    // Get counter values (fast path)
    const [total, verified] = await Promise.all([
      redis.get('raus:stats:total'),
      redis.get('raus:stats:verified')
    ]);

    const response = {
      total: parseInt(total) || 0,
      verified: parseInt(verified) || 0,
      goal: GOAL
    };

    // If email provided, count user's submissions
    if (email) {
      const submissions = await redis.lrange('raus:submissions', 0, -1);
      const userCount = submissions
        .map(s => typeof s === 'string' ? JSON.parse(s) : s)
        .filter(s => s.userEmail === email)
        .length;
      response.userSubmissions = userCount;
    }

    // Cache for 60 seconds
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    return res.status(200).json(response);

  } catch (error) {
    console.error('[RAUS] Stats error:', error);
    return res.status(500).json({ error: 'Stats failed', message: error.message });
  }
}
