import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL?.trim(),
  token: process.env.KV_REST_API_TOKEN?.trim(),
});

const SUBSCRIBERS_KEY = 'subscribers:confirmed';
const OAUTH_TOKEN_PREFIX = 'oauth:tokens:';

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

// ===== OAuth Token Storage =====

/**
 * Stores encrypted OAuth tokens for a user
 * @param {string} email - User email address
 * @param {string} encryptedTokens - Encrypted token string
 * @returns {Promise<void>}
 */
export async function storeOAuthTokens(email, encryptedTokens) {
  try {
    const key = `${OAUTH_TOKEN_PREFIX}${email.toLowerCase()}`;
    await redis.set(key, encryptedTokens);
    console.log('[REDIS] OAuth tokens stored for:', email.split('@')[1]);
  } catch (error) {
    console.error('[REDIS] Failed to store OAuth tokens:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Retrieves encrypted OAuth tokens for a user
 * @param {string} email - User email address
 * @returns {Promise<string|null>} Encrypted token string or null if not found
 */
export async function getOAuthTokens(email) {
  try {
    const key = `${OAUTH_TOKEN_PREFIX}${email.toLowerCase()}`;
    const tokens = await redis.get(key);
    return tokens;
  } catch (error) {
    console.error('[REDIS] Failed to get OAuth tokens:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Checks if user has OAuth tokens stored
 * @param {string} email - User email address
 * @returns {Promise<boolean>} True if tokens exist
 */
export async function hasOAuthTokens(email) {
  try {
    const key = `${OAUTH_TOKEN_PREFIX}${email.toLowerCase()}`;
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('[REDIS] Failed to check OAuth tokens:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Deletes OAuth tokens for a user
 * @param {string} email - User email address
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteOAuthTokens(email) {
  try {
    const key = `${OAUTH_TOKEN_PREFIX}${email.toLowerCase()}`;
    const result = await redis.del(key);
    return result === 1;
  } catch (error) {
    console.error('[REDIS] Failed to delete OAuth tokens:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Gets all users with OAuth tokens
 * @returns {Promise<string[]>} Array of email addresses with tokens
 */
export async function getAllOAuthUsers() {
  try {
    const keys = await redis.keys(`${OAUTH_TOKEN_PREFIX}*`);
    // Extract emails from keys (remove prefix)
    return keys.map(key => key.replace(OAUTH_TOKEN_PREFIX, ''));
  } catch (error) {
    console.error('[REDIS] Failed to get OAuth users:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}
