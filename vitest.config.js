import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Environment for serverless functions
    environment: 'node',

    // Test file patterns
    include: ['tests/**/*.test.js'],

    // Exclude node_modules and build files
    exclude: ['node_modules', '.vercel', 'dist'],

    // Global test timeout (5 seconds)
    testTimeout: 5000,

    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['api/**/*.js'],
      exclude: [
        'api/admin/migrate-*.js', // Legacy migration scripts
        'api/utils/ai-reply.js',  // AI integration (external dependency)
      ],
    },

    // Mock environment variables for tests
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-key-minimum-32-characters-long',
      BASE_URL: 'http://localhost:3000',
    },
  },
});
