import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL?.trim(),
  token: process.env.KINNST_KV_REST_API_TOKEN?.trim(),
});

/**
 * Simple Redis-based rate limiter using sliding window
 *
 * [CP01] KISS: Simple counter with TTL
 * [SC01] Security: Prevents brute force and DoS attacks
 *
 * @param {Object} req - Request object
 * @param {Object} options - Rate limit configuration
 * @param {number} options.maxRequests - Maximum requests allowed
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {string} options.keyPrefix - Redis key prefix (e.g., 'ratelimit:signup')
 * @returns {Promise<Object>} { allowed: boolean, remaining: number, resetAt: number }
 */
export async function checkRateLimit(req, options) {
  const { maxRequests, windowMs, keyPrefix } = options;

  // Get identifier (IP address)
  const identifier = req.headers['x-forwarded-for'] ||
                    req.headers['x-real-ip'] ||
                    req.connection?.remoteAddress ||
                    'unknown';

  // Create Redis key
  const key = `${keyPrefix}:${identifier}`;

  try {
    // Get current count
    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    // Check if limit exceeded
    if (count >= maxRequests) {
      // Get TTL to tell user when they can retry
      const ttl = await redis.ttl(key);
      const resetAt = Date.now() + (ttl * 1000);

      console.log(`[RATE LIMIT] Blocked ${identifier} for ${keyPrefix} (${count}/${maxRequests})`);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil(ttl)
      };
    }

    // Increment counter
    const newCount = await redis.incr(key);

    // Set TTL on first request
    if (newCount === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }

    return {
      allowed: true,
      remaining: maxRequests - newCount,
      resetAt: Date.now() + windowMs
    };

  } catch (error) {
    console.error('[RATE LIMIT] Redis error:', error.message);
    // Fail open - allow request if rate limiter has issues
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: Date.now() + windowMs
    };
  }
}

/**
 * Express middleware wrapper for rate limiting
 * Returns 429 if rate limit exceeded
 *
 * @param {Object} options - Rate limit configuration
 * @returns {Function} Express middleware
 */
export function rateLimitMiddleware(options) {
  return async (req, res, next) => {
    const result = await checkRateLimit(req, options);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Bitte versuche es später erneut.',
        retryAfter: result.retryAfter
      });
    }

    next();
  };
}

/**
 * Direct rate limit check (for serverless functions without middleware)
 * Sends 429 response if limit exceeded
 *
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} options - Rate limit configuration
 * @returns {Promise<boolean>} True if allowed, false if blocked (response already sent)
 */
export async function enforceRateLimit(req, res, options) {
  const result = await checkRateLimit(req, options);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', options.maxRequests);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetAt);

  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfter);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Bitte versuche es später erneut.',
      retryAfter: result.retryAfter
    });
    return false;
  }

  return true;
}
