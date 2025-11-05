# KINN Test Suite

This directory contains automated tests for the KINN API and utilities.

## Test Structure

```
tests/
├── middleware/       # Middleware tests (Phase 1)
├── integration/      # End-to-end API tests
├── utils/           # Utility function tests
└── README.md        # This file
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Framework

- **Framework:** Vitest (fast, ESM-native)
- **Environment:** Node.js (serverless functions)
- **Timeout:** 5 seconds per test
- **Coverage:** V8 provider

## Writing Tests

### Example Test Structure

```javascript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Best Practices

1. **Descriptive Names:** Test names should describe what they test
2. **AAA Pattern:** Arrange, Act, Assert
3. **One Assertion:** Test one thing per test (when possible)
4. **No External Dependencies:** Mock Redis, Resend, etc.
5. **Fast Tests:** Keep tests under 1 second

## Current Test Coverage

### Phase 0 (Preparation)
- ✅ Token utilities (`tests/utils/tokens.test.js`)
- ⏳ Middleware (will be added in Phase 1)
- ⏳ Integration tests (will be added after Phase 1.5)

### Mocking Strategy

For tests that require external services:

```javascript
import { vi } from 'vitest';

// Mock Redis
vi.mock('../../api/utils/redis.js', () => ({
  getRedisClient: vi.fn(),
  addSubscriber: vi.fn(),
  // ... other functions
}));
```

## CI/CD Integration

Tests should run:
- ✅ Before every commit (pre-commit hook)
- ✅ In PR checks (GitHub Actions)
- ✅ Before deployment to production

## Troubleshooting

### Common Issues

**Problem:** `Cannot find module`
**Solution:** Ensure file paths use relative imports with `.js` extension

**Problem:** `Environment variable not set`
**Solution:** Check `vitest.config.js` for test environment variables

**Problem:** `Test timeout`
**Solution:** Increase timeout in `vitest.config.js` or specific test:
```javascript
it('slow test', async () => {
  // ...
}, 10000); // 10 second timeout
```

## Phase 1 Testing Plan

When middleware is created, add tests for:

1. **CORS Middleware**
   - ✅ Set headers for whitelisted origin
   - ✅ No headers for unknown origin
   - ✅ Preflight cache headers
   - ✅ OPTIONS request handling

2. **Auth Middleware**
   - ✅ Valid admin password
   - ✅ Invalid password rejection
   - ✅ Timing-safe comparison
   - ✅ Missing auth header

3. **Rate Limit Middleware**
   - ✅ Allow within limit
   - ✅ Block after limit exceeded
   - ✅ Reset after window expires

4. **Error Handler Middleware**
   - ✅ Catch errors
   - ✅ Format error response
   - ✅ No sensitive data in logs
   - ✅ Development vs production mode

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure >80% code coverage
3. Run `npm run test:coverage` before commit
4. Update this README if adding new test categories
