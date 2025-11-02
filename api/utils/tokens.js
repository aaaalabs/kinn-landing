import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

// Validate JWT secret exists and is strong
if (!SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

if (SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long for security');
}

if (SECRET === 'secret' || SECRET === 'password' || SECRET.match(/^[a-z]+$/i)) {
  console.warn('[TOKENS] WARNING: JWT_SECRET appears weak. Use a strong random string.');
}

/**
 * Generates a confirmation token for email opt-in
 * @param {string} email - User email address
 * @returns {string} JWT token valid for 48 hours
 */
export function generateConfirmToken(email) {
  return jwt.sign(
    {
      email,
      type: 'confirm',
      timestamp: Date.now()
    },
    SECRET,
    { expiresIn: '48h' }
  );
}

/**
 * Verifies and decodes a confirmation token
 * @param {string} token - JWT token to verify
 * @returns {string|null} Email address if valid, null if invalid/expired
 */
export function verifyConfirmToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET);

    // Ensure it's a confirmation token
    if (decoded.type !== 'confirm') {
      console.error('[TOKENS] Invalid token type:', decoded.type);
      return null;
    }

    return decoded.email;
  } catch (error) {
    // Token expired, invalid signature, or malformed
    console.error('[TOKENS] Token verification failed:', error.message);
    return null;
  }
}

/**
 * Generates a profile token for user preference management
 * @param {string} email - User email address
 * @returns {string} JWT token valid for 30 days
 */
export function generateProfileToken(email) {
  return jwt.sign(
    {
      email,
      type: 'profile',
      timestamp: Date.now()
    },
    SECRET,
    { expiresIn: '30d' } // 30 days expiration for security
  );
}

/**
 * Verifies and decodes a profile token
 * @param {string} token - JWT token to verify
 * @returns {string|null} Email address if valid, null if invalid
 */
export function verifyProfileToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET);

    // Ensure it's a profile token
    if (decoded.type !== 'profile') {
      console.error('[TOKENS] Invalid token type:', decoded.type);
      return null;
    }

    return decoded.email;
  } catch (error) {
    // Invalid signature or malformed token
    console.error('[TOKENS] Profile token verification failed:', error.message);
    return null;
  }
}

/**
 * Generates a session token for authenticated dashboard access
 * @param {string} email - User email address
 * @returns {string} JWT token valid for 24 hours
 */
export function generateSessionToken(email) {
  return jwt.sign(
    {
      email,
      type: 'session',
      timestamp: Date.now()
    },
    SECRET,
    { expiresIn: '24h' } // 24 hours for security
  );
}

/**
 * Verifies and decodes a session token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token payload if valid, null if invalid/expired
 */
export function verifySessionToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET);

    // Ensure it's a session token
    if (decoded.type !== 'session') {
      console.error('[TOKENS] Invalid token type:', decoded.type);
      return null;
    }

    return {
      email: decoded.email,
      timestamp: decoded.timestamp,
      exp: decoded.exp
    };
  } catch (error) {
    // Token expired, invalid signature, or malformed
    console.error('[TOKENS] Session token verification failed:', error.message);
    return null;
  }
}
