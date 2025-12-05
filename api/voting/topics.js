import { verifyAuthToken } from '../utils/tokens.js';
import { getRedisClient } from '../utils/redis.js';

const redis = getRedisClient();
const TOPICS_KEY = 'voting:kinn-6:topics';

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

      // Get topics from Redis
      let topics = await redis.json.get(TOPICS_KEY, '$');

      // Handle empty or non-existent topics
      if (!topics || !Array.isArray(topics) || topics.length === 0) {
        topics = [];
      } else {
        // Flatten if nested array
        topics = topics.flat();
      }

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
        const profile = await redis.json.get(`profile:${email}`, '$');
        if (profile && profile[0]?.identity?.name) {
          authorName = profile[0].identity.name;
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

      // Get existing topics
      let topics = await redis.json.get(TOPICS_KEY, '$');

      // Initialize if doesn't exist
      if (!topics || !Array.isArray(topics)) {
        topics = [];
      } else {
        topics = topics.flat();
      }

      // Add new topic
      topics.push(newTopic);

      // Save back to Redis
      await redis.json.set(TOPICS_KEY, '$', topics);

      console.log('[VOTING] Topic created successfully:', newTopic.id);

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