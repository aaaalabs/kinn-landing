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
 * Generates an auth token for all authenticated operations
 * Used for: email links, dashboard sessions, profile management, API access
 * @param {string} email - User email address
 * @returns {string} JWT token valid for 30 days
 */
export function generateAuthToken(email) {
  return jwt.sign(
    {
      email,
      type: 'auth',
      timestamp: Date.now()
    },
    SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Verifies and decodes an auth token
 * @param {string} token - JWT token to verify
 * @returns {string|null} Email address if valid, null if invalid/expired
 */
export function verifyAuthToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET);

    // Accept both 'auth' (new) and 'profile'/'session' (legacy from development)
    // This allows seamless transition during MVP development
    const validTypes = ['auth', 'profile', 'session'];
    if (!validTypes.includes(decoded.type)) {
      console.error('[TOKENS] Invalid token type:', decoded.type);
      return null;
    }

    return decoded.email;
  } catch (error) {
    console.error('[TOKENS] Token verification failed:', error.message);
    return null;
  }
}

// Backwards compatible exports (will be removed after full migration)
export const generateProfileToken = generateAuthToken;
export const verifyProfileToken = verifyAuthToken;
