import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL?.trim(),
  token: process.env.KINNST_KV_REST_API_TOKEN?.trim(),
});

/**
 * Get Spotlight Status
 * GET /api/spotlight/status?id=[spotlight-id]
 * GET /api/spotlight/status (returns all spotlights)
 */
export default async function handler(req, res) {
  // CORS headers for admin dashboard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    if (id) {
      // Single spotlight status
      const key = `spotlight:${id}`;
      const data = await redis.get(key);

      if (!data) {
        return res.status(200).json({
          id,
          status: 'pending',
          approvedAt: null
        });
      }

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return res.status(200).json({
        id,
        status: parsed.status || 'pending',
        approvedAt: parsed.approvedAt || null
      });
    }

    // All spotlights - check known IDs
    const spotlightIds = ['b8211f', 'f768d7', '82c026', '192ca0', 'cebbe2'];
    const results = [];

    for (const spotlightId of spotlightIds) {
      const key = `spotlight:${spotlightId}`;
      const data = await redis.get(key);

      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        results.push({
          id: spotlightId,
          status: parsed.status || 'pending',
          approvedAt: parsed.approvedAt || null
        });
      } else {
        results.push({
          id: spotlightId,
          status: 'pending',
          approvedAt: null
        });
      }
    }

    return res.status(200).json({ spotlights: results });

  } catch (error) {
    console.error('[SPOTLIGHT] Status error:', error.message);
    return res.status(500).json({ error: 'Failed to get status' });
  }
}
