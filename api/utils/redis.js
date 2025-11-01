import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL?.trim(),
  token: process.env.KINNST_KV_REST_API_TOKEN?.trim(),
});

const SUBSCRIBERS_KEY = 'subscribers:confirmed';

/**
 * Adds a confirmed subscriber to Redis set
 * @param {string} email - Subscriber email address
 * @returns {Promise<boolean>} True if added, false if already exists
 */
export async function addSubscriber(email) {
  try {
    // SADD returns 1 if member added, 0 if already exists
    const result = await redis.sadd(SUBSCRIBERS_KEY, email.toLowerCase());
    return result === 1;
  } catch (error) {
    console.error('[REDIS] Failed to add subscriber:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Checks if an email is already subscribed
 * @param {string} email - Email address to check
 * @returns {Promise<boolean>} True if subscribed, false otherwise
 */
export async function isSubscribed(email) {
  try {
    const result = await redis.sismember(SUBSCRIBERS_KEY, email.toLowerCase());
    return result === 1;
  } catch (error) {
    console.error('[REDIS] Failed to check subscription:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Gets all confirmed subscribers
 * @returns {Promise<string[]>} Array of subscriber email addresses
 */
export async function getAllSubscribers() {
  try {
    const subscribers = await redis.smembers(SUBSCRIBERS_KEY);
    return subscribers || [];
  } catch (error) {
    console.error('[REDIS] Failed to get subscribers:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Gets total subscriber count
 * @returns {Promise<number>} Number of confirmed subscribers
 */
export async function getSubscriberCount() {
  try {
    const count = await redis.scard(SUBSCRIBERS_KEY);
    return count || 0;
  } catch (error) {
    console.error('[REDIS] Failed to get subscriber count:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}
