import crypto from 'crypto';

// Encryption key from environment (must be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

// Convert base64 key to Buffer
const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'base64');

if (keyBuffer.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits) when decoded from base64');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // GCM auth tag

/**
 * Encrypts sensitive data (OAuth tokens)
 * Uses AES-256-GCM for authenticated encryption
 *
 * @param {string} plaintext - Data to encrypt
 * @returns {string} Encrypted data in format: iv:authTag:ciphertext (base64)
 */
export function encrypt(plaintext) {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  // Generate random IV (initialization vector)
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  // Encrypt the data
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Get authentication tag (GCM provides integrity check)
  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:ciphertext (all base64 encoded)
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted
  ].join(':');
}

/**
 * Decrypts data encrypted with encrypt()
 *
 * @param {string} encryptedData - Encrypted string in format: iv:authTag:ciphertext
 * @returns {string} Decrypted plaintext
 */
export function decrypt(encryptedData) {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty string');
  }

  try {
    // Split into components
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivB64, authTagB64, ciphertext] = parts;

    // Convert from base64
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');

    // Validate lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error('Invalid IV length');
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid auth tag length');
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;

  } catch (error) {
    console.error('[ENCRYPTION] Decryption failed:', error.message);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Encrypts OAuth token object for storage
 * @param {Object} tokens - OAuth tokens (access_token, refresh_token, expiry_date)
 * @returns {string} Encrypted token string
 */
export function encryptTokens(tokens) {
  const tokenString = JSON.stringify(tokens);
  return encrypt(tokenString);
}

/**
 * Decrypts OAuth token object from storage
 * @param {string} encryptedTokens - Encrypted token string
 * @returns {Object} OAuth tokens object
 */
export function decryptTokens(encryptedTokens) {
  const tokenString = decrypt(encryptedTokens);
  return JSON.parse(tokenString);
}
