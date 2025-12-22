import { createClient } from '@vercel/kv';
import { SOURCE_CONFIGS } from './source-configs.js';

const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

/**
 * GET /api/radar/source-health
 * Returns health status for all configured radar sources
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sources = [];
    const sourceNames = Object.keys(SOURCE_CONFIGS);

    // Fetch health data for each source in parallel
    const healthPromises = sourceNames.map(async (name) => {
      const config = SOURCE_CONFIGS[name];
      const normalizedName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Get health metrics from Redis
      const [lastSuccess, lastError, events7d, approved7d] = await Promise.all([
        kv.get(`radar:source:${normalizedName}:lastSuccess`),
        kv.get(`radar:source:${normalizedName}:lastError`),
        kv.get(`radar:source:${normalizedName}:events7d`),
        kv.get(`radar:source:${normalizedName}:approved7d`)
      ]);

      // Calculate status
      let status = 'unknown';
      const now = new Date();
      const lastSuccessDate = lastSuccess ? new Date(lastSuccess) : null;
      const daysSinceSuccess = lastSuccessDate
        ? (now - lastSuccessDate) / (1000 * 60 * 60 * 24)
        : Infinity;

      if (!config.active) {
        status = 'inactive';
      } else if (lastError && (!lastSuccessDate || daysSinceSuccess > 1)) {
        status = 'failing';
      } else if (daysSinceSuccess > 3) {
        status = 'degraded';
      } else if (lastSuccessDate) {
        status = 'healthy';
      }

      // Calculate approval rate
      const eventsCount = parseInt(events7d) || 0;
      const approvedCount = parseInt(approved7d) || 0;
      const approvalRate = eventsCount > 0 ? Math.round((approvedCount / eventsCount) * 100) : null;

      return {
        name,
        url: config.url,
        active: config.active !== false,
        status,
        lastSuccess: lastSuccess || null,
        lastError: lastError || null,
        events7d: eventsCount,
        approved7d: approvedCount,
        approvalRate,
        method: config.extraction?.method || 'unknown',
        requiresJS: config.extraction?.requiresJS || false,
        requiresAuth: config.extraction?.requiresAuth || false
      };
    });

    const healthData = await Promise.all(healthPromises);

    // Sort: healthy first, then by events count
    healthData.sort((a, b) => {
      const statusOrder = { healthy: 0, degraded: 1, unknown: 2, failing: 3, inactive: 4 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return b.events7d - a.events7d;
    });

    // Calculate summary
    const summary = {
      total: healthData.length,
      healthy: healthData.filter(s => s.status === 'healthy').length,
      degraded: healthData.filter(s => s.status === 'degraded').length,
      failing: healthData.filter(s => s.status === 'failing').length,
      inactive: healthData.filter(s => s.status === 'inactive').length,
      unknown: healthData.filter(s => s.status === 'unknown').length
    };

    return res.status(200).json({
      success: true,
      sources: healthData,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SOURCE-HEALTH] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch source health',
      message: error.message
    });
  }
}
