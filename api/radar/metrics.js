import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

/**
 * GET /api/radar/metrics
 * Returns comprehensive radar metrics for dashboard
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
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get all events for counting
    const allEventIds = await kv.smembers('radar:events') || [];

    // Count by status
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    const categoryCount = {};
    const sourceCount = {};

    // Batch fetch events (limit to recent 200 for performance)
    const eventPromises = allEventIds.slice(0, 200).map(id =>
      kv.hgetall(`radar:event:${id}`).catch(() => null)
    );
    const events = await Promise.all(eventPromises);

    events.forEach(event => {
      if (!event) return;

      // Status count
      if (event.approved === 'true' || event.approved === true) {
        approved++;
      } else if (event.rejected === 'true' || event.rejected === true) {
        rejected++;
      } else {
        pending++;
      }

      // Category count
      const cat = event.category || 'Other';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;

      // Source count
      const src = event.source || 'unknown';
      sourceCount[src] = (sourceCount[src] || 0) + 1;
    });

    // Get daily metrics for today
    const todayMetrics = await kv.hgetall(`radar:metrics:daily:${today}`) || {};

    // Get global metrics
    const globalMetrics = await kv.hgetall('radar:metrics:global') || {};

    // Calculate week total (sum last 7 days)
    let weekFound = 0;
    let weekAdded = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dayMetrics = await kv.hgetall(`radar:metrics:daily:${date}`) || {};
      weekFound += parseInt(dayMetrics.found || 0);
      weekAdded += parseInt(dayMetrics.added || 0);
    }

    // Top categories (sorted)
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Top sources (sorted)
    const topSources = Object.entries(sourceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Approval rate
    const totalReviewed = approved + rejected;
    const approvalRate = totalReviewed > 0 ? Math.round((approved / totalReviewed) * 100) : 0;

    return res.status(200).json({
      success: true,
      summary: {
        today: {
          found: parseInt(todayMetrics.found || 0),
          added: parseInt(todayMetrics.added || 0)
        },
        week: {
          found: weekFound,
          added: weekAdded
        },
        total: {
          events: allEventIds.length,
          found: parseInt(globalMetrics.totalFound || 0),
          added: parseInt(globalMetrics.totalAdded || 0)
        }
      },
      status: {
        pending,
        approved,
        rejected,
        approvalRate
      },
      categories: topCategories,
      sources: topSources,
      lastRun: globalMetrics.lastRun || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[RADAR-METRICS] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch metrics',
      message: error.message
    });
  }
}
