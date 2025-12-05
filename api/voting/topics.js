import { verifyAuthToken } from '../utils/tokens.js';
import { getRedisClient } from '../utils/redis.js';

const redis = getRedisClient();
const TOPICS_KEY = 'voting:kinn-6:topics';

// Helper function to flatten nested objects/arrays into a flat array of topics
function flattenTopics(data) {
  const topics = [];

  function extractTopics(obj, level = 0) {
    // Safety check for deep recursion
    if (level > 10) {
      console.error('[VOTING] Too many nesting levels, stopping recursion');
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

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify auth token
  const token = req.headers.authorization?.replace('Bearer ', '');
  const email = verifyAuthToken(token);

  if (!email) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Gültiger Auth-Token erforderlich'
    });
  }

  // GET: Fetch all topics
  if (req.method === 'GET') {
    try {
      console.log('[VOTING] Fetching topics for:', email);

      // Get topics from Redis (using $ path)
      let rawData = await redis.json.get(TOPICS_KEY, '$');

      // Unwrap the array response from JSONPath
      const data = rawData?.[0] || rawData || [];

      // Flatten any nested structure into a simple array of topics
      const topics = flattenTopics(data);

      // Sort by votes (highest first) for consistent ordering
      topics.sort((a, b) => b.votes - a.votes);

      // Find which topics the user has voted for
      const userVotes = topics
        .filter(t => t.voterEmails && t.voterEmails.includes(email))
        .map(t => t.id);

      console.log(`[VOTING] Found ${topics.length} topics, user voted for ${userVotes.length}`);

      return res.status(200).json({
        topics,
        userVotes
      });

    } catch (error) {
      console.error('[VOTING] Error fetching topics:', error);

      // If Redis key doesn't exist, return empty array
      if (error.message?.includes('not found')) {
        return res.status(200).json({
          topics: [],
          userVotes: []
        });
      }

      return res.status(500).json({
        error: 'Failed to fetch topics',
        message: error.message
      });
    }
  }

  // POST: Create new topic
  if (req.method === 'POST') {
    try {
      const { title } = req.body;

      // Validate title
      if (!title || typeof title !== 'string') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Titel erforderlich'
        });
      }

      const trimmedTitle = title.trim();

      if (trimmedTitle.length === 0) {
        return res.status(400).json({
          error: 'Invalid title',
          message: 'Titel darf nicht leer sein'
        });
      }

      if (trimmedTitle.length > 80) {
        return res.status(400).json({
          error: 'Title too long',
          message: 'Titel darf maximal 80 Zeichen lang sein'
        });
      }

      console.log('[VOTING] Creating new topic:', trimmedTitle, 'by:', email);

      // Try to get user's name from profile
      let authorName = email.split('@')[0]; // Default to email prefix

      try {
        const profile = await redis.json.get(`profile:${email}`);
        if (profile?.identity?.name) {
          authorName = profile.identity.name;
        }
      } catch (profileError) {
        console.log('[VOTING] Could not fetch profile, using email prefix');
      }

      // Create new topic object
      const newTopic = {
        id: `topic-${Date.now()}`,
        title: trimmedTitle,
        authorEmail: email,
        authorName,
        votes: 1, // Creator automatically votes for their topic
        voterEmails: [email],
        createdAt: new Date().toISOString()
      };

      // Get existing topics and flatten any nested structure
      let topics = [];
      try {
        const rawData = await redis.json.get(TOPICS_KEY, '$');
        // Unwrap the array response from JSONPath
        const data = rawData?.[0] || rawData;
        topics = flattenTopics(data);
      } catch (error) {
        // Key doesn't exist yet, start with empty array
        console.log('[VOTING] No existing topics, creating new array');
      }

      // Check for duplicate titles (optional)
      const duplicate = topics.find(t =>
        t.title.toLowerCase() === trimmedTitle.toLowerCase()
      );

      if (duplicate) {
        return res.status(400).json({
          error: 'Duplicate topic',
          message: 'Ein Thema mit diesem Titel existiert bereits'
        });
      }

      // Add new topic
      topics.push(newTopic);

      // Save back to Redis as a clean array (using $ path)
      await redis.json.set(TOPICS_KEY, '$', topics);

      console.log('[VOTING] Topic created successfully:', newTopic.id);
      console.log('[VOTING] Total topics now:', topics.length);

      return res.status(201).json({
        topic: newTopic
      });

    } catch (error) {
      console.error('[VOTING] Error creating topic:', error);
      return res.status(500).json({
        error: 'Failed to create topic',
        message: error.message
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    message: `Method ${req.method} not supported`
  });
}