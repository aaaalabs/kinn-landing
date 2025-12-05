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

  // Verify auth token
  const token = req.headers.authorization?.replace('Bearer ', '');
  const email = verifyAuthToken(token);

  if (!email) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Gültiger Auth-Token erforderlich'
    });
  }

  try {
    const { topicId } = req.body;

    // Validate topicId
    if (!topicId || typeof topicId !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Topic ID erforderlich'
      });
    }

    console.log('[VOTING] Toggle vote for topic:', topicId, 'by:', email);

    // Get all topics and flatten any nested structure
    let topics = [];
    try {
      const rawData = await redis.json.get(TOPICS_KEY, '$');
      // Unwrap the array response from JSONPath
      const data = rawData?.[0] || rawData || [];
      topics = flattenTopics(data);
    } catch (error) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Keine Topics gefunden'
      });
    }

    // Find the topic
    const topicIndex = topics.findIndex(t => t.id === topicId);

    if (topicIndex === -1) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Topic nicht gefunden'
      });
    }

    const topic = topics[topicIndex];

    // Initialize voterEmails if it doesn't exist
    if (!topic.voterEmails) {
      topic.voterEmails = [];
    }

    // Check if user has already voted
    const hasVoted = topic.voterEmails.includes(email);

    if (hasVoted) {
      // Remove vote
      topic.voterEmails = topic.voterEmails.filter(e => e !== email);
      topic.votes = Math.max(0, topic.votes - 1); // Ensure votes don't go below 0

      console.log('[VOTING] Removed vote from topic:', topicId, 'New count:', topic.votes);
    } else {
      // Add vote
      topic.voterEmails.push(email);
      topic.votes = topic.votes + 1;

      console.log('[VOTING] Added vote to topic:', topicId, 'New count:', topic.votes);
    }

    // Update the topic in the array
    topics[topicIndex] = topic;

    // Save back to Redis as a clean array (using $ path)
    await redis.json.set(TOPICS_KEY, '$', topics);

    return res.status(200).json({
      voted: !hasVoted,
      voteCount: topic.votes
    });

  } catch (error) {
    console.error('[VOTING] Error toggling vote:', error);
    return res.status(500).json({
      error: 'Failed to toggle vote',
      message: error.message
    });
  }
}