import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL?.trim(),
  token: process.env.KINNST_KV_REST_API_TOKEN?.trim(),
});

const SUBSCRIBERS_KEY = 'subscribers:confirmed';
const EVENTS_CONFIG_KEY = 'events:config';

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

// ===== Event Configuration Storage =====

/**
 * Gets event configuration from Redis
 * @returns {Promise<Object>} Event configuration with events array and defaults
 */
export async function getEventsConfig() {
  try {
    const config = await redis.get(EVENTS_CONFIG_KEY);

    // Return config or default structure
    if (!config) {
      return {
        events: [],
        defaults: {
          timezone: 'Europe/Vienna',
          organizer: 'treff@in.kinn.at',
          categories: ['KI', 'AI', 'Networking', 'Innsbruck'],
          reminder: '24h'
        }
      };
    }

    return config;
  } catch (error) {
    console.error('[REDIS] Failed to get events config:', error.message);
    // Return default config on error
    return {
      events: [],
      defaults: {
        timezone: 'Europe/Vienna',
        organizer: 'treff@in.kinn.at',
        categories: ['KI', 'AI', 'Networking', 'Innsbruck'],
        reminder: '24h'
      }
    };
  }
}

/**
 * Updates event configuration in Redis
 * @param {Object} config - Event configuration object
 * @returns {Promise<void>}
 */
export async function updateEventsConfig(config) {
  try {
    await redis.set(EVENTS_CONFIG_KEY, config);
    console.log('[REDIS] Events config updated:', config.events?.length || 0, 'events');
  } catch (error) {
    console.error('[REDIS] Failed to update events config:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}
