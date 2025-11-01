import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
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
 * @returns {string} JWT token with no expiration (long-lived)
 */
export function generateProfileToken(email) {
  return jwt.sign(
    {
      email,
      type: 'profile',
      timestamp: Date.now()
    },
    SECRET
    // No expiresIn = never expires (long-lived token)
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
