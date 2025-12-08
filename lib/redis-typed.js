/**
 * Type-safe Redis wrapper for handling type conversions
 *
 * Redis stores everything as strings, which causes type confusion in our app.
 * This wrapper automatically converts string values to their proper types
 * based on common patterns and schema expectations.
 */

import { Redis } from '@upstash/redis';
import logger from './logger.js';

// Initialize Redis client
const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN
});

/**
 * Convert Redis string values to proper JavaScript types
 * @param {any} value - The value from Redis (usually a string)
 * @returns {any} The properly typed value
 */
function convertRedisValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle boolean conversions
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Handle number conversions
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const num = parseInt(value, 10);
    if (!isNaN(num)) return num;
  }

  if (typeof value === 'string' && /^-?\d+\.\d+$/.test(value)) {
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
  }

  // Return as-is for other types
  return value;
}

/**
 * Recursively convert all values in an object
 * @param {object} obj - The object from Redis
 * @returns {object} Object with properly typed values
 */
function convertRedisObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return convertRedisValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertRedisObject(item));
  }

  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    converted[key] = convertRedisObject(value);
  }
  return converted;
}

/**
 * Type-safe Redis wrapper class
 */
export class TypedRedis {
  constructor() {
    this.redis = redis;
  }

  /**
   * Get a value from Redis with automatic type conversion
   */
  async get(key) {
    try {
      const value = await this.redis.get(key);
      return convertRedisValue(value);
    } catch (error) {
      logger.error('TypedRedis get error:', error);
      throw error;
    }
  }

  /**
   * Get all fields from a hash with automatic type conversion
   */
  async hgetall(key) {
    try {
      const hash = await this.redis.hgetall(key);
      if (!hash) return null;
      return convertRedisObject(hash);
    } catch (error) {
      logger.error('TypedRedis hgetall error:', error);
      throw error;
    }
  }

  /**
   * Get a field from a hash with automatic type conversion
   */
  async hget(key, field) {
    try {
      const value = await this.redis.hget(key, field);
      return convertRedisValue(value);
    } catch (error) {
      logger.error('TypedRedis hget error:', error);
      throw error;
    }
  }

  /**
   * Set a hash field (pass-through, no conversion needed)
   */
  async hset(key, data) {
    try {
      return await this.redis.hset(key, data);
    } catch (error) {
      logger.error('TypedRedis hset error:', error);
      throw error;
    }
  }

  /**
   * Delete hash fields (pass-through)
   */
  async hdel(key, ...fields) {
    try {
      return await this.redis.hdel(key, ...fields);
    } catch (error) {
      logger.error('TypedRedis hdel error:', error);
      throw error;
    }
  }

  /**
   * Get members of a set (pass-through, sets are already string arrays)
   */
  async smembers(key) {
    try {
      return await this.redis.smembers(key);
    } catch (error) {
      logger.error('TypedRedis smembers error:', error);
      throw error;
    }
  }

  /**
   * Add members to a set (pass-through)
   */
  async sadd(key, ...members) {
    try {
      return await this.redis.sadd(key, ...members);
    } catch (error) {
      logger.error('TypedRedis sadd error:', error);
      throw error;
    }
  }

  /**
   * Remove members from a set (pass-through)
   */
  async srem(key, ...members) {
    try {
      return await this.redis.srem(key, ...members);
    } catch (error) {
      logger.error('TypedRedis srem error:', error);
      throw error;
    }
  }

  /**
   * Check if a member exists in a set (returns proper boolean)
   */
  async sismember(key, member) {
    try {
      const result = await this.redis.sismember(key, member);
      return result === 1 || result === true;
    } catch (error) {
      logger.error('TypedRedis sismember error:', error);
      throw error;
    }
  }

  /**
   * Delete keys (pass-through)
   */
  async del(...keys) {
    try {
      return await this.redis.del(...keys);
    } catch (error) {
      logger.error('TypedRedis del error:', error);
      throw error;
    }
  }

  /**
   * Check if key exists (returns proper boolean)
   */
  async exists(key) {
    try {
      const result = await this.redis.exists(key);
      return result === 1 || result === true;
    } catch (error) {
      logger.error('TypedRedis exists error:', error);
      throw error;
    }
  }

  /**
   * Set a key with value (pass-through)
   */
  async set(key, value, options) {
    try {
      return await this.redis.set(key, value, options);
    } catch (error) {
      logger.error('TypedRedis set error:', error);
      throw error;
    }
  }

  /**
   * Set expiration on a key (pass-through)
   */
  async expire(key, seconds) {
    try {
      return await this.redis.expire(key, seconds);
    } catch (error) {
      logger.error('TypedRedis expire error:', error);
      throw error;
    }
  }

  /**
   * Get all keys matching pattern (pass-through)
   */
  async keys(pattern) {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      logger.error('TypedRedis keys error:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const kv = new TypedRedis();

// Also export the conversion functions for testing or direct use
export { convertRedisValue, convertRedisObject };

// Export default instance for backward compatibility
export default kv;