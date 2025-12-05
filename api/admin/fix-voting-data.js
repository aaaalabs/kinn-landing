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

    // Helper function to flatten nested objects/arrays into a flat array of topics
    function flattenTopics(data) {
      const topics = [];

      function extractTopics(obj, level = 0) {
        // Safety check for deep recursion
        if (level > 10) {
          console.error('[ADMIN] Too many nesting levels, stopping recursion');
          return;
        }

        if (!obj) return;

        // If it's an array, process each element
        if (Array.isArray(obj)) {
          obj.forEach(item => extractTopics(item, level + 1));
          return;
        }

        // If it's an object
        if (typeof obj === 'object') {
          // Check if it looks like a topic (has id, title, votes)
          if (obj.id && obj.title && typeof obj.votes === 'number') {
            topics.push(obj);
            return;
          }

          // Otherwise, it might be a container object, extract its values
          Object.values(obj).forEach(value => extractTopics(value, level + 1));
        }
      }

      extractTopics(data);
      return topics;
    }

    // Get existing data (using $ path)
    const rawData = await redis.json.get(TOPICS_KEY, '$');

    // Unwrap the array response from JSONPath
    const existing = rawData?.[0] || rawData;

    if (!existing) {
      return res.status(404).json({
        error: 'No data found',
        message: `No data found at ${TOPICS_KEY}`
      });
    }

    console.log('[ADMIN] Current data structure:', JSON.stringify(existing, null, 2).substring(0, 500));

    // Flatten any nested structure into a simple array of topics
    const topics = flattenTopics(existing);

    // Deduplicate topics by ID (in case of any duplication)
    const uniqueTopics = [];
    const seenIds = new Set();

    for (const topic of topics) {
      if (!seenIds.has(topic.id)) {
        // Ensure all required fields exist
        topic.id = topic.id || `topic-${Date.now()}-${uniqueTopics.length}`;
        topic.votes = topic.votes || 0;
        topic.voterEmails = topic.voterEmails || [];
        topic.createdAt = topic.createdAt || new Date().toISOString();

        seenIds.add(topic.id);
        uniqueTopics.push(topic);
        console.log(`  Processed topic: "${topic.title}" (${topic.votes} votes)`);
      }
    }

    // Sort by creation date (oldest first) to maintain order
    uniqueTopics.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Save back as a clean array (using $ path)
    await redis.json.set(TOPICS_KEY, '$', uniqueTopics);

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