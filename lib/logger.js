/**
 * Environment-aware logging utility
 * In production: Minimal logging (errors only)
 * In development: Full debug output
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  info: (...args) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  },

  warn: (...args) => {
    // Warnings in both dev and prod
    console.warn('[WARN]', ...args);
  },

  error: (...args) => {
    // Errors always logged
    console.error('[ERROR]', ...args);
  },

  // Special method for structured logging
  event: (action, details) => {
    if (isDevelopment) {
      console.log(`[EVENT] ${action}:`, details);
    }
  }
};

export default logger;