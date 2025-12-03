/**
 * Shortlink Encoding/Decoding for QR Codes
 *
 * Converts event IDs to short 6-character codes:
 * "kinn-treff-12-1730123456" → "abc123"
 *
 * Security: XOR cipher with JWT_SECRET
 * Benefits: Simple QR codes, hard to fake, stateless
 */

import crypto from 'crypto';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generate cipher key from JWT_SECRET
 */
function getCipherKey() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  // Create 64-bit cipher key from JWT_SECRET
  const hash = crypto.createHash('sha256')
    .update(process.env.JWT_SECRET)
    .digest();

  // Use first 8 bytes as 64-bit key
  return hash.readBigUInt64BE(0);
}

/**
 * Encode number to Base62 string
 */
function toBase62(num) {
  if (num === 0n) return '0';

  let result = '';
  while (num > 0n) {
    result = BASE62[Number(num % 62n)] + result;
    num = num / 62n;
  }

  return result;
}

/**
 * Decode Base62 string to number
 */
function fromBase62(str) {
  let result = 0n;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const value = BASE62.indexOf(char);

    if (value === -1) {
      throw new Error('Invalid Base62 character');
    }

    result = result * 62n + BigInt(value);
  }

  return result;
}

/**
 * Parse event ID to extract event number and timestamp
 * Format: "kinn-treff-{number}-{timestamp}"
 */
function parseEventId(eventId) {
  if (!eventId || typeof eventId !== 'string') {
    throw new Error(`Invalid event ID type: ${typeof eventId}`);
  }

  const match = eventId.match(/kinn-treff-(\d+)-(\d+)/);

  if (!match) {
    throw new Error(`Invalid event ID format: "${eventId}" (expected: kinn-treff-{number}-{timestamp})`);
  }

  const eventNumber = parseInt(match[1], 10);
  const timestamp = parseInt(match[2], 10);

  // Validate ranges
  if (eventNumber < 1 || eventNumber > 65535) {
    throw new Error(`Event number out of range: ${eventNumber} (must be 1-65535)`);
  }

  if (timestamp < 1600000000 || timestamp > 2500000000) {
    throw new Error(`Timestamp out of range: ${timestamp} (must be valid Unix timestamp)`);
  }

  return { eventNumber, timestamp };
}

/**
 * Construct event ID from event number and timestamp
 */
function constructEventId(eventNumber, timestamp) {
  return `kinn-treff-${eventNumber}-${timestamp}`;
}

/**
 * Encode event ID to short link (6 characters)
 *
 * @param {string} eventId - Event ID like "kinn-treff-12-1730123456"
 * @returns {string} Short ID like "abc123"
 */
export function encodeEventId(eventId) {
  try {
    const { eventNumber, timestamp } = parseEventId(eventId);

    // Combine into 64-bit number:
    // Upper 16 bits: event number (0-65535)
    // Lower 48 bits: timestamp (good until year 8921)
    const combined = (BigInt(eventNumber) << 48n) | BigInt(timestamp);

    // XOR with cipher key for security
    const cipherKey = getCipherKey();
    const encoded = combined ^ cipherKey;

    // Base62 encode
    let shortId = toBase62(encoded);

    // Pad to exactly 6 characters
    shortId = shortId.padStart(6, '0');

    // Take first 6 chars (in case encoding is longer)
    return shortId.substring(0, 6);
  } catch (error) {
    console.error('Shortlink encoding error:', error);
    throw new Error('Failed to encode event ID');
  }
}

/**
 * Decode short link to event ID
 *
 * @param {string} shortId - Short ID like "abc123"
 * @returns {string} Event ID like "kinn-treff-12-1730123456"
 */
export function decodeShortId(shortId) {
  try {
    if (!shortId || shortId.length !== 6) {
      throw new Error('Invalid short ID length');
    }

    // Base62 decode
    const encoded = fromBase62(shortId);

    // XOR decrypt
    const cipherKey = getCipherKey();
    const combined = encoded ^ cipherKey;

    // Extract event number and timestamp
    const eventNumber = Number(combined >> 48n);
    const timestamp = Number(combined & 0xFFFFFFFFFFFFn);

    // Validate extracted values
    if (eventNumber < 1 || eventNumber > 65535) {
      throw new Error('Invalid event number');
    }

    if (timestamp < 1600000000 || timestamp > 2500000000) {
      throw new Error('Invalid timestamp');
    }

    // Reconstruct event ID
    return constructEventId(eventNumber, timestamp);
  } catch (error) {
    console.error('Shortlink decoding error:', error);
    throw new Error('Failed to decode short ID');
  }
}

/**
 * Validate that a short ID can be decoded and corresponds to a valid event
 *
 * @param {string} shortId - Short ID to validate
 * @returns {object} { valid: boolean, eventId?: string, error?: string }
 */
export function validateShortId(shortId) {
  try {
    const eventId = decodeShortId(shortId);
    return { valid: true, eventId };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
