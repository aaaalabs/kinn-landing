import { getRedisClient } from '../utils/redis.js';
import bcrypt from 'bcryptjs';

const redis = getRedisClient();
const TOPICS_KEY = 'voting:kinn-6:topics';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: `Method ${req.method} not supported`
    });
  }

  // Admin authentication
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin authorization required'
    });
  }

  const password = authHeader.replace('Bearer ', '');
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminPasswordHash) {
    console.error('[ADMIN] No admin password hash configured');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Admin access not configured'
    });
  }

  // Verify admin password
  const isValidPassword = await bcrypt.compare(password, adminPasswordHash);

  if (!isValidPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin credentials'
    });
  }

  try {
    console.log('[ADMIN] Fixing voting topics data format...');

    // Get existing data
    const existing = await redis.json.get(TOPICS_KEY, '$');

    if (!existing || !existing[0]) {
      return res.status(404).json({
        error: 'No data found',
        message: `No data found at ${TOPICS_KEY}`
      });
    }

    const data = existing[0];

    // Check if it's already an array
    if (Array.isArray(data)) {
      return res.status(200).json({
        message: 'Data is already in correct array format',
        topicCount: data.length
      });
    }

    // Convert object to array
    console.log('[ADMIN] Converting object to array...');
    const topics = [];

    // Sort keys and convert to array
    const keys = Object.keys(data).sort((a, b) => {
      // Try numeric sort first
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      // Fall back to string sort
      return a.localeCompare(b);
    });

    for (const key of keys) {
      const topic = data[key];
      if (topic && typeof topic === 'object') {
        // Ensure all required fields exist
        topic.id = topic.id || `topic-${Date.now()}-${key}`;
        topic.votes = topic.votes || 0;
        topic.voterEmails = topic.voterEmails || [];
        topic.createdAt = topic.createdAt || new Date().toISOString();

        topics.push(topic);
        console.log(`  Added topic: "${topic.title}" (${topic.votes} votes)`);
      }
    }

    // Save back as array
    await redis.json.set(TOPICS_KEY, '$', topics);

    console.log(`[ADMIN] Successfully converted ${topics.length} topics to array format`);

    return res.status(200).json({
      success: true,
      message: `Successfully converted ${topics.length} topics to array format`,
      topics: topics.map(t => ({
        id: t.id,
        title: t.title,
        votes: t.votes,
        author: t.authorName
      }))
    });

  } catch (error) {
    console.error('[ADMIN] Error fixing voting data:', error);
    return res.status(500).json({
      error: 'Failed to fix voting data',
      message: error.message
    });
  }
}