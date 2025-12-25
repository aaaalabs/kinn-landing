/**
 * GET /api/admin/raus - List all RAUS submissions
 * PUT /api/admin/raus - Update submission status
 *
 * Authentication: Bearer token via ADMIN_PASSWORD
 */

import { Redis } from '@upstash/redis';
import { isAuthenticated } from '../utils/auth.js';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

const ALLOWED_ORIGINS = [
  'https://kinn.at',
  'https://www.kinn.at',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:8000', 'http://localhost:3000'] : [])
];

function getCorsHeaders(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    };
  }
  return {};
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const corsHeaders = getCorsHeaders(origin);
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'PUT') {
    return handlePut(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET: List all submissions
 */
async function handleGet(req, res) {
  try {
    const submissions = await redis.lrange('raus:submissions', 0, -1);

    // Parse and sort by date (newest first)
    const parsed = submissions
      .map(s => typeof s === 'string' ? JSON.parse(s) : s)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    // Calculate stats from actual submissions (more reliable than counters)
    const total = parsed.length;
    const verified = parsed.filter(s => s.status === 'verified' || s.status === 'published').length;

    return res.status(200).json({
      submissions: parsed,
      stats: {
        total,
        verified,
        goal: 50
      }
    });

  } catch (error) {
    console.error('[RAUS Admin] List error:', error);
    return res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}

/**
 * PUT: Update submission status
 * Body: { id, status, adminNotes? }
 */
async function handlePut(req, res) {
  try {
    const { id, status, adminNotes } = req.body;

    if (!id || !status) {
      return res.status(400).json({ error: 'Missing id or status' });
    }

    const validStatuses = ['submitted', 'reviewed', 'verified', 'rejected', 'published'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get all submissions
    const submissions = await redis.lrange('raus:submissions', 0, -1);
    const parsed = submissions.map(s => typeof s === 'string' ? JSON.parse(s) : s);

    // Find and update
    const index = parsed.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const oldStatus = parsed[index].status;
    parsed[index].status = status;
    parsed[index].updatedAt = new Date().toISOString();
    if (adminNotes) {
      parsed[index].adminNotes = adminNotes;
    }

    // Update verified counter if status changed to/from verified
    if (oldStatus !== 'verified' && status === 'verified') {
      await redis.incr('raus:stats:verified');
    } else if (oldStatus === 'verified' && status !== 'verified') {
      await redis.decr('raus:stats:verified');
    }

    // Replace entire list (Redis doesn't have LSET for complex updates)
    await redis.del('raus:submissions');
    if (parsed.length > 0) {
      // Push in reverse order to maintain original order
      for (const s of parsed.reverse()) {
        await redis.lpush('raus:submissions', JSON.stringify(s));
      }
    }

    return res.status(200).json({
      success: true,
      submission: parsed.find(s => s.id === id)
    });

  } catch (error) {
    console.error('[RAUS Admin] Update error:', error);
    return res.status(500).json({ error: 'Failed to update submission' });
  }
}
