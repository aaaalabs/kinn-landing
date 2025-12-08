import { createClient } from '@vercel/kv';
import logger from '../../lib/logger.js';

// Use KINNST_ prefixed environment variables
const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const health = {
    service: 'KINN-RADAR',
    status: 'checking',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Check Redis connection
    await kv.ping();
    health.checks.redis = 'connected';

    // Check events count
    const eventIds = await kv.smembers('radar:events') || [];
    health.checks.eventCount = eventIds.length;

    // Check last sync
    const lastSync = await kv.get('radar:sheets:last-sync');
    health.checks.lastSheetsSync = lastSync || 'never';

    // Check metrics
    const totalEvents = await kv.get('radar:metrics:total') || 0;
    health.checks.totalProcessed = totalEvents;

    // Check Groq API key exists
    health.checks.groqConfigured = !!process.env.RADAR_GROQ_API_KEY;

    // Check Google Sheets configured
    health.checks.sheetsConfigured = !!(
      process.env.RADAR_GOOGLE_SHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    );

    // Overall status determination
    if (health.checks.redis === 'connected' && health.checks.groqConfigured && health.checks.sheetsConfigured) {
      health.status = health.checks.eventCount > 0 ? 'healthy' : 'ready';
    } else {
      health.status = 'degraded';
    }

    return res.status(200).json(health);

  } catch (error) {
    logger.error('[RADAR Health Check] Error:', error);
    health.status = 'error';
    health.error = error.message;
    health.checks.redis = 'disconnected';

    return res.status(503).json(health);
  }
}