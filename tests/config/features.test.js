import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature Flags', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    // Clear module cache to re-import with new env vars
    delete require.cache[require.resolve('../../api/config/features.js')];
  });

  describe('Boolean Parsing', () => {
    it('should parse "true" as true', async () => {
      process.env.FEATURE_NEW_MIDDLEWARE = 'true';
      const { FEATURES } = await import('../../api/config/features.js');
      expect(FEATURES.USE_NEW_MIDDLEWARE).toBe(true);
    });

    it('should parse "false" as false', async () => {
      process.env.FEATURE_NEW_MIDDLEWARE = 'false';
      const { FEATURES } = await import('../../api/config/features.js');
      expect(FEATURES.USE_NEW_MIDDLEWARE).toBe(false);
    });

    it('should parse "1" as true', async () => {
      process.env.FEATURE_NEW_MIDDLEWARE = '1';
      const { FEATURES } = await import('../../api/config/features.js');
      expect(FEATURES.USE_NEW_MIDDLEWARE).toBe(true);
    });

    it('should parse "0" as false', async () => {
      process.env.FEATURE_NEW_MIDDLEWARE = '0';
      const { FEATURES } = await import('../../api/config/features.js');
      expect(FEATURES.USE_NEW_MIDDLEWARE).toBe(false);
    });

    it('should parse undefined as false', async () => {
      delete process.env.FEATURE_NEW_MIDDLEWARE;
      const { FEATURES } = await import('../../api/config/features.js');
      expect(FEATURES.USE_NEW_MIDDLEWARE).toBe(false);
    });

    it('should be case-insensitive', async () => {
      process.env.FEATURE_NEW_MIDDLEWARE = 'TRUE';
      const { FEATURES } = await import('../../api/config/features.js');
      expect(FEATURES.USE_NEW_MIDDLEWARE).toBe(true);
    });

    it('should handle whitespace', async () => {
      process.env.FEATURE_NEW_MIDDLEWARE = '  true  ';
      const { FEATURES } = await import('../../api/config/features.js');
      expect(FEATURES.USE_NEW_MIDDLEWARE).toBe(true);
    });
  });

  describe('Feature Detection', () => {
    it('should detect enabled features', async () => {
      process.env.FEATURE_NEW_MIDDLEWARE = 'true';
      process.env.FEATURE_NEW_CONFIG = 'true';

      const { isFeatureEnabled } = await import('../../api/config/features.js');

      expect(isFeatureEnabled('USE_NEW_MIDDLEWARE')).toBe(true);
      expect(isFeatureEnabled('USE_NEW_CONFIG')).toBe(true);
      expect(isFeatureEnabled('USE_SERVICE_LAYER')).toBe(false);
    });

    it('should list all enabled features', async () => {
      process.env.FEATURE_NEW_MIDDLEWARE = 'true';
      process.env.FEATURE_NEW_CONFIG = 'true';

      const { getEnabledFeatures } = await import('../../api/config/features.js');
      const enabled = getEnabledFeatures();

      expect(enabled).toContain('USE_NEW_MIDDLEWARE');
      expect(enabled).toContain('USE_NEW_CONFIG');
    });
  });

  describe('Development Mode', () => {
    it('should auto-enable DEV_MODE in development', async () => {
      process.env.NODE_ENV = 'development';

      const { FEATURES } = await import('../../api/config/features.js');
      expect(FEATURES.DEV_MODE).toBe(true);
    });

    it('should disable DEV_MODE in production by default', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.FEATURE_DEV_MODE;

      const { FEATURES } = await import('../../api/config/features.js');
      expect(FEATURES.DEV_MODE).toBe(false);
    });

    it('should allow forcing DEV_MODE in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.FEATURE_DEV_MODE = 'true';

      const { FEATURES } = await import('../../api/config/features.js');
      expect(FEATURES.DEV_MODE).toBe(true);
    });
  });
});
