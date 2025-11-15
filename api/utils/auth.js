import crypto from 'crypto';

/**
 * Shared authentication utilities for admin endpoints
 */

/**
 * Verify admin password using timing-safe comparison
 * @param {Object} req - Express request object
 * @returns {boolean} True if authenticated, false otherwise
 */
export function isAuthenticated(req) {
  const authHeader = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('[AUTH] ADMIN_PASSWORD not set in environment variables');
    return false;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  try {
    const tokenBuffer = Buffer.from(token);
    const passwordBuffer = Buffer.from(adminPassword);

    if (tokenBuffer.length !== passwordBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(tokenBuffer, passwordBuffer);
  } catch (error) {
    console.error('[AUTH] Authentication error:', error.message);
    return false;
  }
}
