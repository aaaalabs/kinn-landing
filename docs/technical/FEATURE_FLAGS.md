# Feature Flags Guide

Feature flags allow us to deploy code without activating it, enabling gradual rollouts and instant rollbacks without code changes.

## Available Feature Flags

| Flag | Description | Phase | Default |
|------|-------------|-------|---------|
| `FEATURE_NEW_MIDDLEWARE` | Enable new middleware architecture (CORS, auth, rate limit) | Phase 1 | `false` |
| `FEATURE_NEW_CONFIG` | Enable centralized configuration system | Phase 2 | `false` |
| `FEATURE_SERVICE_LAYER` | Enable service layer abstraction (email, events, users) | Phase 4 | `false` |
| `FEATURE_DEV_MODE` | Development mode features (auto-enabled in dev) | N/A | `auto` |
| `FEATURE_ENHANCED_LOGGING` | More verbose logging for debugging | N/A | `false` |

## Setting Feature Flags

### In Vercel Dashboard

1. Go to **Project Settings** → **Environment Variables**
2. Add new variable:
   - **Name:** `FEATURE_NEW_MIDDLEWARE`
   - **Value:** `true` or `false`
   - **Environment:** Production / Preview / Development
3. Click **Save**
4. **Redeploy** (or wait for next deployment)

### Locally (Development)

```bash
# In .env.local
FEATURE_NEW_MIDDLEWARE=true
FEATURE_NEW_CONFIG=true
FEATURE_ENHANCED_LOGGING=true
```

### Via CLI

```bash
# Add feature flag
vercel env add FEATURE_NEW_MIDDLEWARE

# Enter value when prompted: true

# Remove feature flag
vercel env rm FEATURE_NEW_MIDDLEWARE
```

## Checking Feature Status

### In Code

```javascript
import { FEATURES, isFeatureEnabled } from './api/config/features.js';

// Check if feature is enabled
if (FEATURES.USE_NEW_MIDDLEWARE) {
  // Use new middleware
} else {
  // Use old code
}

// Or use helper function
if (isFeatureEnabled('USE_NEW_MIDDLEWARE')) {
  // ...
}
```

### In Logs

Feature flags are logged on startup (development only):

```
[FEATURES] Enabled: USE_NEW_MIDDLEWARE, ENHANCED_LOGGING
```

## Migration Strategy with Feature Flags

### Phase 1: Canary Deployment

1. **Deploy new code** with feature flag `FEATURE_NEW_MIDDLEWARE=false`
2. **Verify deployment** successful (code exists but not active)
3. **Enable for one endpoint** (canary):
   ```javascript
   // In api/events/upcoming.js
   if (FEATURES.USE_NEW_MIDDLEWARE) {
     // Use new middleware
     return withNewMiddleware(handler);
   } else {
     // Use old code (current implementation)
     return oldHandler();
   }
   ```
4. **Set flag to true** in Vercel dashboard
5. **Monitor for 24 hours**
6. **Rollback if needed:** Set flag to `false` (instant, no deployment)

### Phase 2: Gradual Rollout

After canary success:

1. **Enable for 25% of endpoints** (low-risk first)
2. **Monitor** → No issues → Continue
3. **Enable for 50%** (medium-risk)
4. **Monitor** → No issues → Continue
5. **Enable for 75%** (high-traffic, critical endpoints)
6. **Monitor 48h** → Success!
7. **Enable for 100%** (remaining endpoints)

### Phase 3: Cleanup

After 1-2 weeks of stability:

1. **Remove feature flag checks** from code
2. **Keep new implementation** as default
3. **Delete old code**
4. **Remove env variable** from Vercel

## Emergency Rollback Procedure

### Instant Rollback (< 5 minutes)

If production issues detected:

```bash
# Option 1: Via Vercel Dashboard
1. Go to Environment Variables
2. Set FEATURE_NEW_MIDDLEWARE=false
3. Redeploy (or wait for next request)

# Option 2: Via CLI
vercel env add FEATURE_NEW_MIDDLEWARE false --force
vercel --prod

# Option 3: Promote previous deployment
vercel promote <previous-deployment-url>
```

### Partial Rollback

Disable feature for specific endpoint only:

```javascript
// Force disable for one endpoint
if (FEATURES.USE_NEW_MIDDLEWARE && req.url !== '/api/signup') {
  // Use new middleware for all except signup
} else {
  // Use old code for signup (or all if flag disabled)
}
```

## Best Practices

### DO ✅
- Use feature flags for **risky changes**
- Test with feature **enabled AND disabled**
- Monitor logs after enabling feature
- Document what each flag controls
- Remove flags after migration complete
- Use descriptive flag names

### DON'T ❌
- Leave flags in code forever
- Use flags for minor changes
- Forget to test both code paths
- Enable in production without testing
- Create too many flags (< 5 active at once)

## Testing with Feature Flags

```javascript
// tests/example.test.js
import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature Flag Behavior', () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.FEATURE_NEW_MIDDLEWARE;
  });

  it('should use old code when flag disabled', () => {
    process.env.FEATURE_NEW_MIDDLEWARE = 'false';
    // Test old behavior
  });

  it('should use new code when flag enabled', () => {
    process.env.FEATURE_NEW_MIDDLEWARE = 'true';
    // Test new behavior
  });
});
```

## Monitoring Feature Flags

### Check Current Status

```bash
# List all environment variables
vercel env ls

# Filter feature flags
vercel env ls | grep FEATURE_
```

### Example Output
```
FEATURE_NEW_MIDDLEWARE    true     Production
FEATURE_NEW_CONFIG        false    Production
FEATURE_ENHANCED_LOGGING  true     Development
```

## Troubleshooting

### Flag not working?

1. **Check environment:**
   - Is flag set for correct environment (prod/preview/dev)?
   - Did you redeploy after setting flag?

2. **Check code:**
   - Is feature flag import correct?
   - Is condition checking the right flag name?

3. **Check logs:**
   ```
   [FEATURES] Enabled: ...
   ```
   Does your flag appear in enabled list?

### Flag enabled but old code running?

- **Cache issue:** Clear Vercel cache and redeploy
- **Code path:** Check if-else logic is correct
- **Default value:** Ensure default is what you expect

## Success Metrics

After enabling a feature flag:

- [ ] Zero errors in logs
- [ ] Response times unchanged (±10%)
- [ ] No increase in support tickets
- [ ] CORS headers working (if CORS-related)
- [ ] Auth still functioning (if auth-related)

## Cleanup Checklist

After feature is stable (2+ weeks):

1. [ ] Remove feature flag checks from code
2. [ ] Delete old code paths
3. [ ] Update tests (remove flag-specific tests)
4. [ ] Remove env variable from Vercel
5. [ ] Update this documentation
6. [ ] Commit with message: "cleanup: remove FEATURE_X flag"

---

**Questions?** Check [`docs/restructuring/RESTRUCTURING-SUMMARY.md`](../restructuring/RESTRUCTURING-SUMMARY.md) for overall migration strategy.
