/**
 * Feature Flags Configuration
 *
 * Allows gradual rollout and instant rollback of features
 * without code deployment.
 *
 * Usage:
 * - Set environment variables in Vercel dashboard
 * - Feature flags can be toggled instantly
 * - No code changes required for rollback
 *
 * [CP01] KISS - Simple boolean flags
 */

/**
 * Parse environment variable as boolean
 * Supports: 'true', '1', 'yes', 'on' = true
 *          'false', '0', 'no', 'off', undefined = false
 */
function parseBool(value) {
  if (!value) return false;
  const normalized = value.toString().toLowerCase().trim();
  return ['true', '1', 'yes', 'on'].includes(normalized);
}

/**
 * Feature Flags
 *
 * Set via environment variables:
 * - FEATURE_NEW_MIDDLEWARE=true
 * - FEATURE_NEW_CONFIG=true
 * - FEATURE_SERVICE_LAYER=true
 */
export const FEATURES = {
  /**
   * Phase 1: New middleware architecture
   * Enables CORS, auth, rate limit middleware
   */
  USE_NEW_MIDDLEWARE: parseBool(process.env.FEATURE_NEW_MIDDLEWARE),

  /**
   * Phase 2: Centralized configuration
   * Enables config/index.js instead of scattered env vars
   */
  USE_NEW_CONFIG: parseBool(process.env.FEATURE_NEW_CONFIG),

  /**
   * Phase 4: Service layer abstraction
   * Enables email/event/user services
   */
  USE_SERVICE_LAYER: parseBool(process.env.FEATURE_SERVICE_LAYER),

  /**
   * Development mode features
   * Auto-enabled in development, can be forced in production
   */
  DEV_MODE: process.env.NODE_ENV === 'development' || parseBool(process.env.FEATURE_DEV_MODE),

  /**
   * Enhanced logging
   * More verbose logging for debugging
   */
  ENHANCED_LOGGING: parseBool(process.env.FEATURE_ENHANCED_LOGGING),
};

/**
 * Check if a specific feature is enabled
 * @param {string} featureName - Name of the feature (e.g., 'USE_NEW_MIDDLEWARE')
 * @returns {boolean}
 */
export function isFeatureEnabled(featureName) {
  return FEATURES[featureName] === true;
}

/**
 * Get all enabled features (for logging/debugging)
 * @returns {string[]} Array of enabled feature names
 */
export function getEnabledFeatures() {
  return Object.keys(FEATURES).filter(key => FEATURES[key] === true);
}

/**
 * Log current feature flag status
 * Useful for debugging and deployment verification
 */
export function logFeatureStatus() {
  const enabled = getEnabledFeatures();
  const disabled = Object.keys(FEATURES).filter(key => !FEATURES[key]);

  console.log('[FEATURES] Enabled:', enabled.length > 0 ? enabled.join(', ') : 'none');

  if (FEATURES.ENHANCED_LOGGING) {
    console.log('[FEATURES] Disabled:', disabled.join(', '));
  }
}

// Log on import (only in development)
if (FEATURES.DEV_MODE) {
  logFeatureStatus();
}
