import { verifyAuthToken } from '../utils/tokens.js';
import { getRedisClient } from '../utils/redis.js';

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

    // Get all topics
    let topics = await redis.json.get(TOPICS_KEY, '$');

    // Handle empty or non-existent topics
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Keine Topics gefunden'
      });
    }

    // Flatten if nested array
    topics = topics.flat();

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

    // Save back to Redis
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