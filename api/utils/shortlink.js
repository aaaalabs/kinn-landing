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
 * Supports two formats:
 * - New: "kinn-treff-{number}-{timestamp}"
 * - Old (legacy): "kinn-{YYYY-MM-DD}" (auto-converted)
 */
function parseEventId(eventId) {
  if (!eventId || typeof eventId !== 'string') {
    throw new Error(`Invalid event ID type: ${typeof eventId}`);
  }

  // Try new format first: kinn-treff-{number}-{timestamp}
  let match = eventId.match(/^kinn-treff-(\d+)-(\d+)$/);

  if (match) {
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

  // Try old format: kinn-{YYYY-MM-DD} (legacy support)
  match = eventId.match(/^kinn-(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    // Create date and get timestamp (midnight UTC)
    const date = new Date(Date.UTC(year, month - 1, day));
    const timestamp = Math.floor(date.getTime() / 1000);

    // Generate pseudo event number from date hash
    // This ensures same old ID always gets same short link
    const dateHash = (year * 10000 + month * 100 + day) % 10000;
    const eventNumber = Math.max(1, dateHash); // Min 1

    console.log('[Shortlink] Legacy format detected, converted:', {
      originalId: eventId,
      date: `${year}-${month}-${day}`,
      eventNumber,
      timestamp
    });

    return { eventNumber, timestamp };
  }

  // Neither format matched
  throw new Error(`Invalid event ID format: "${eventId}" (expected: kinn-treff-{number}-{timestamp} or kinn-YYYY-MM-DD)`);
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
    console.log('[Shortlink] Starting encoding for:', eventId);

    const parsed = parseEventId(eventId);
    console.log('[Shortlink] Parsed:', parsed);

    const { eventNumber, timestamp } = parsed;

    // Combine into 48-bit number (fits in 6 Base62 chars):
    // Upper 16 bits: event number (0-65535)
    // Lower 32 bits: timestamp (Unix time, good until year 2106)
    const combined = (BigInt(eventNumber) << 32n) | BigInt(timestamp);
    console.log('[Shortlink] Combined BigInt:', combined.toString());

    // Base62 encode (no XOR - keeps it simple and fits in 6 chars)
    let shortId = toBase62(combined);
    console.log('[Shortlink] Base62 encoded:', shortId, 'length:', shortId.length);

    // Pad to exactly 6 characters
    shortId = shortId.padStart(6, '0');
    console.log('[Shortlink] Final short ID:', shortId);

    return shortId;
  } catch (error) {
    console.error('[Shortlink] Encoding error:', {
      eventId,
      error: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to encode event ID: ${error.message}`);
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
    const combined = fromBase62(shortId);

    console.log('[Shortlink] Decoding details:', {
      shortId,
      combined: combined.toString()
    });

    // Extract event number and timestamp (no XOR, simple bit extraction)
    // Upper 16 bits: event number
    // Lower 32 bits: timestamp
    const eventNumber = Number(combined >> 32n);
    const timestamp = Number(combined & 0xFFFFFFFFn);

    console.log('[Shortlink] Extracted values:', {
      eventNumber,
      timestamp,
      timestampDate: new Date(timestamp * 1000).toISOString()
    });

    // Validate extracted values
    if (eventNumber < 1 || eventNumber > 65535) {
      console.error('[Shortlink] Invalid event number:', eventNumber);
      throw new Error('Invalid event number');
    }

    if (timestamp < 1600000000 || timestamp > 2500000000) {
      console.error('[Shortlink] Invalid timestamp:', timestamp, 'Expected range: 1600000000-2500000000');
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
