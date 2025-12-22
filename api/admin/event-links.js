import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

const REDIS_KEY = 'kinn:event-links';

// Default fallback if Redis is empty
const DEFAULT_LINKS = {
  '7': 'https://lu.ma/kinn-7',
  '8': 'https://lu.ma/kinn-8',
};

/**
 * Event Links Admin API
 * GET  /api/admin/event-links - Get all event links
 * POST /api/admin/event-links - Add/update event link
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Auth check for POST
  if (req.method === 'POST') {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    if (req.method === 'GET') {
      let links = await redis.get(REDIS_KEY);
      if (!links) {
        // Initialize with defaults
        await redis.set(REDIS_KEY, JSON.stringify(DEFAULT_LINKS));
        links = DEFAULT_LINKS;
      }
      const parsed = typeof links === 'string' ? JSON.parse(links) : links;
      return res.status(200).json({ links: parsed });
    }

    if (req.method === 'POST') {
      const { id, url, action } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Event ID required' });
      }

      let links = await redis.get(REDIS_KEY);
      links = links ? (typeof links === 'string' ? JSON.parse(links) : links) : DEFAULT_LINKS;

      if (action === 'delete') {
        delete links[id];
      } else {
        if (!url) {
          return res.status(400).json({ error: 'Luma URL required' });
        }
        links[id] = url;
      }

      await redis.set(REDIS_KEY, JSON.stringify(links));
      return res.status(200).json({ success: true, links });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[EVENT-LINKS] Error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
