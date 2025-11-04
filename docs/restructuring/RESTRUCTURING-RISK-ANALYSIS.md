# KINN Restructuring - Detailed Risk Analysis & Improved Plan

**Version:** 2.0 (Ultra-Safe Edition)
**Date:** 2025-11-04
**Focus:** Minimal Risk, Maximum Safety, Incremental Rollout

---

## 🚨 Critical Risks Identified in Original Plan

### ❌ RISK 1: Big Bang Migration (CRITICAL)
**Original Plan:** Migrate all 23 endpoints at once to new middleware
**Problem:** If middleware has a bug, ALL endpoints break simultaneously
**Blast Radius:** 100% of API functionality

**Fix:** ✅ Canary Migration Pattern (see Phase 0-1 below)

---

### ❌ RISK 2: No Rollback Strategy
**Original Plan:** No documented rollback procedure
**Problem:** If production breaks, how do we revert?
**Impact:** Potential hours of downtime

**Fix:** ✅ Feature flags + Git tags + documented rollback (see Section 5)

---

### ❌ RISK 3: Config Import Error Risk
**Original Plan:** Throw error on import if env vars missing
**Problem:** Breaks Vercel build process if any env var missing
**Example:**
```javascript
// ❌ DANGEROUS
const requiredEnvVars = ['JWT_SECRET', ...];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing: ${varName}`); // Breaks on import!
  }
}
```

**Fix:** ✅ Lazy validation with getters (see Phase 2 improvements)

---

### ❌ RISK 4: Middleware Execution Order Undefined
**Original Plan:** Middleware functions, but no defined order
**Problem:** What if rate limit runs before CORS? Or auth before rate limit?
**Impact:** Security issues, CORS errors, performance problems

**Fix:** ✅ Explicit middleware chain (see Phase 1 improvements)

---

### ❌ RISK 5: No Error Handler Wrapper
**Original Plan:** Middleware can throw errors
**Problem:** Uncaught errors crash the serverless function
**Impact:** 500 errors, stack traces leak in production

**Fix:** ✅ Global error handler middleware (see Phase 1)

---

### ❌ RISK 6: Missing Testing Infrastructure
**Original Plan:** "Test after implementation"
**Problem:** No automated tests = manual testing only
**Impact:** Bugs slip through to production

**Fix:** ✅ Test-first approach (see Phase 0)

---

### ❌ RISK 7: CORS Preflight Cache Headers Missing
**Original Plan:** Basic CORS headers
**Problem:** Missing `Access-Control-Max-Age` causes excessive preflight requests
**Impact:** Performance degradation, unnecessary load

**Fix:** ✅ Improved CORS implementation (see Phase 1)

---

### ❌ RISK 8: No Backward Compatibility During Migration
**Original Plan:** Replace old code with new code
**Problem:** Can't AB test or gradual rollout
**Impact:** All-or-nothing deployment

**Fix:** ✅ Strangler Fig Pattern - run old and new in parallel (see Phase 0-1)

---

## ✅ Improved Migration Strategy: "Zero-Downtime Canary Rollout"

### **Phase 0: Preparation (NEW!)**
**Duration:** 2-3 hours
**Risk:** 🟢 Zero (no production changes)
**Blast Radius:** 0%

#### Actions:
1. **Create Testing Infrastructure**
   ```bash
   # Install testing dependencies
   npm install --save-dev vitest @testing-library/node

   # Create test files
   mkdir -p tests/middleware tests/integration
   ```

2. **Add Feature Flags**
   ```javascript
   // config/features.js
   export const FEATURES = {
     USE_NEW_MIDDLEWARE: process.env.FEATURE_NEW_MIDDLEWARE === 'true',
     USE_NEW_CONFIG: process.env.FEATURE_NEW_CONFIG === 'true'
   };
   ```

3. **Document Current API Contracts**
   - Response formats for each endpoint
   - CORS header requirements
   - Auth token formats
   - Error response structures

4. **Setup Monitoring**
   - Vercel Analytics already active
   - Document baseline metrics (error rates, response times)
   - Setup Slack/email alerts for error spikes

5. **Create Rollback Script**
   ```bash
   # scripts/rollback.sh
   #!/bin/bash
   # Quick rollback procedure
   git checkout <PREVIOUS_TAG>
   vercel --prod
   ```

**Success Criteria:**
- [ ] Tests run successfully (even if empty)
- [ ] Feature flags work
- [ ] Baseline metrics documented
- [ ] Rollback procedure tested in staging

---

### **Phase 1: Create Middleware (No Migration Yet)**
**Duration:** 2-3 hours
**Risk:** 🟢 Zero (new files only, no changes to existing)
**Blast Radius:** 0%

#### 1.1 Create Error Handler Middleware (NEW!)

```javascript
// api/middleware/errorHandler.js
/**
 * Global error handler wrapper
 * [EH01] Contextual logging
 * [SC01] No sensitive data in logs
 */

export function withErrorHandler(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      // Log error with context (no sensitive data)
      console.error('[ERROR]', {
        endpoint: req.url,
        method: req.method,
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });

      // User-friendly error response
      const message = process.env.NODE_ENV === 'development'
        ? error.message
        : 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.';

      // Check if response already sent
      if (res.headersSent) {
        console.error('[ERROR] Response already sent, cannot send error response');
        return;
      }

      return res.status(500).json({
        error: 'Server error',
        message,
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  };
}
```

#### 1.2 Create Improved CORS Middleware

```javascript
// api/middleware/cors.js
/**
 * Centralized CORS configuration
 * [SC02] Security - Only whitelisted origins
 */

export const ALLOWED_ORIGINS = [
  'https://kinn.at',
  'https://www.kinn.at',
  ...(process.env.NODE_ENV === 'development'
    ? ['http://localhost:8000', 'http://localhost:3000']
    : []
  )
];

/**
 * Apply CORS headers with preflight caching
 * @param {Array<string>} allowedMethods - HTTP methods to allow
 */
export function applyCors(req, res, allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
  const origin = req.headers.origin;

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // ✅ NEW: Cache preflight requests for 24 hours
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

/**
 * Handle OPTIONS preflight requests
 * Returns true if preflight handled (early exit), false otherwise
 */
export function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}
```

#### 1.3 Create Auth Middleware (Unchanged from original)

```javascript
// api/middleware/auth.js
import crypto from 'crypto';

export function isAdminAuthenticated(req) {
  const authHeader = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('[AUTH] ADMIN_PASSWORD not set');
    return false;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  try {
    const tokenBuffer = Buffer.from(token);
    const passwordBuffer = Buffer.from(adminPassword);

    if (tokenBuffer.length !== passwordBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(tokenBuffer, passwordBuffer);
  } catch (error) {
    console.error('[AUTH] Authentication error:', error.message);
    return false;
  }
}

export function requireAdmin(req, res) {
  if (!isAdminAuthenticated(req)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing admin password'
    });
    return false;
  }
  return true;
}
```

#### 1.4 Create Rate Limit Middleware

```javascript
// api/middleware/rateLimit.js
import { enforceRateLimit } from '../utils/rate-limiter.js';

export const RATE_LIMITS = {
  PUBLIC: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    keyPrefix: 'ratelimit:public'
  },

  ADMIN: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    keyPrefix: 'ratelimit:admin'
  },

  SIGNUP: {
    maxRequests: 3,
    windowMs: 60 * 1000,
    keyPrefix: 'ratelimit:signup'
  }
};

export async function applyRateLimit(req, res, preset = 'PUBLIC') {
  const config = RATE_LIMITS[preset] || RATE_LIMITS.PUBLIC;
  return await enforceRateLimit(req, res, config);
}
```

#### 1.5 Create Middleware Composer (NEW!)

```javascript
// api/middleware/index.js
/**
 * Middleware composition helpers
 * Ensures correct execution order
 */

import { applyCors, handlePreflight } from './cors.js';
import { applyRateLimit } from './rateLimit.js';
import { requireAdmin } from './auth.js';
import { withErrorHandler } from './errorHandler.js';

/**
 * Standard middleware chain for public endpoints
 * Order: CORS → Preflight → RateLimit
 */
export async function applyPublicMiddleware(req, res, rateLimitPreset = 'PUBLIC') {
  applyCors(req, res);
  if (handlePreflight(req, res)) return false; // false = early exit
  if (!await applyRateLimit(req, res, rateLimitPreset)) return false;
  return true; // true = continue to handler
}

/**
 * Standard middleware chain for admin endpoints
 * Order: CORS → Preflight → RateLimit → Auth
 */
export async function applyAdminMiddleware(req, res) {
  applyCors(req, res);
  if (handlePreflight(req, res)) return false;
  if (!await applyRateLimit(req, res, 'ADMIN')) return false;
  if (!requireAdmin(req, res)) return false;
  return true;
}

// Re-export for direct use
export { applyCors, handlePreflight, applyRateLimit, requireAdmin, withErrorHandler };
```

**Testing Phase 1:**
```javascript
// tests/middleware/cors.test.js
import { describe, it, expect } from 'vitest';
import { applyCors, handlePreflight, ALLOWED_ORIGINS } from '../../api/middleware/cors.js';

describe('CORS Middleware', () => {
  it('should set CORS headers for whitelisted origin', () => {
    const req = { headers: { origin: 'https://kinn.at' } };
    const res = {
      headers: {},
      setHeader(key, value) {
        this.headers[key] = value;
      }
    };

    applyCors(req, res);

    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://kinn.at');
    expect(res.headers['Access-Control-Max-Age']).toBe('86400');
  });

  it('should NOT set CORS headers for unknown origin', () => {
    const req = { headers: { origin: 'https://evil.com' } };
    const res = {
      headers: {},
      setHeader(key, value) {
        this.headers[key] = value;
      }
    };

    applyCors(req, res);

    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });
});
```

**Success Criteria:**
- [ ] All middleware files created
- [ ] Unit tests pass
- [ ] No production code changed
- [ ] Feature flag ready for activation

---

### **Phase 1.5: Canary Migration (SINGLE Endpoint)** ⭐ NEW CRITICAL STEP
**Duration:** 1-2 hours + 24h monitoring
**Risk:** 🟢 Very Low (only 1 endpoint affected)
**Blast Radius:** 4% (1 of 23 endpoints)

#### Target: `/api/events/upcoming.js`

**Why this endpoint?**
- ✅ Public endpoint (no auth)
- ✅ No CORS currently (can only improve)
- ✅ No rate limiting (can only improve)
- ✅ Simple GET request
- ✅ Low traffic
- ✅ Non-critical (used by dashboard, not main signup flow)

**Migration:**

```javascript
// api/events/upcoming.js - BEFORE (50 lines, no middleware)
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = await getEventsConfig();
    // ... business logic
  } catch (error) {
    // ... error handling
  }
}
```

```javascript
// api/events/upcoming.js - AFTER (30 lines, with middleware)
import { applyPublicMiddleware, withErrorHandler } from './middleware/index.js';
import { getEventsConfig } from './utils/redis.js';

async function upcomingEventsHandler(req, res) {
  // Apply middleware chain
  if (!await applyPublicMiddleware(req, res, 'PUBLIC')) return;

  // Method check
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are accepted'
    });
  }

  // Business logic (unchanged)
  const config = await getEventsConfig();
  const allEvents = config.events || [];

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcomingEvents = allEvents
    .filter(event => new Date(event.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 10);

  return res.status(200).json({
    success: true,
    events: upcomingEvents,
    total: upcomingEvents.length
  });
}

// Wrap with error handler
export default withErrorHandler(upcomingEventsHandler);
```

**Testing Checklist:**
- [ ] Endpoint returns 200 OK
- [ ] CORS headers present (check with browser DevTools)
- [ ] Rate limiting works (make 11 requests in 1 minute → 429 on 11th)
- [ ] OPTIONS preflight returns 200
- [ ] Error handling works (simulate Redis error)

**Monitoring (24-48 hours):**
- [ ] Zero 500 errors
- [ ] Response time < 500ms (p95)
- [ ] CORS errors in browser = 0
- [ ] Rate limit triggers correctly

**Rollback Procedure:**
```bash
# If issues detected:
git revert <commit-hash>
vercel --prod

# Or: Disable feature flag
vercel env add FEATURE_NEW_MIDDLEWARE false --prod
```

**Success Criteria:**
- [ ] 24h monitoring shows no errors
- [ ] Performance same or better
- [ ] CORS works for all whitelisted origins
- [ ] Rate limiting triggers correctly

---

### **Phase 2: Centralize Configuration (Improved)**
**Duration:** 1-2 hours
**Risk:** 🟢 Low (backward compatible)
**Blast Radius:** 10% (config only, not breaking)

#### Problems with Original Plan:
❌ Validation on import → breaks builds
❌ No backward compatibility
❌ Circular dependency risk

#### Improved Implementation:

```javascript
// api/config/index.js
/**
 * Centralized configuration with lazy validation
 * [CP01] KISS - Single source of truth
 * [SC02] Validation - But safe for builds
 */

// ✅ IMPROVEMENT: Lazy validation, not on import
let _validated = false;

const requiredEnvVars = {
  production: [
    'JWT_SECRET',
    'KINNST_KV_REST_API_URL',
    'KINNST_KV_REST_API_TOKEN',
    'RESEND_API_KEY',
    'ADMIN_PASSWORD'
  ],
  development: [
    'JWT_SECRET', // Only JWT required in dev
  ]
};

function validateConfig() {
  if (_validated) return;

  const env = process.env.NODE_ENV || 'development';
  const required = requiredEnvVars[env === 'production' ? 'production' : 'development'];
  const missing = required.filter(v => !process.env[v]);

  if (missing.length > 0) {
    if (env === 'production') {
      // ✅ Only throw in production
      throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    } else {
      // ✅ Just warn in development
      console.warn('[CONFIG] Missing optional env vars:', missing);
    }
  }

  _validated = true;
}

// ✅ IMPROVEMENT: Use getters for lazy evaluation
export const config = {
  // Environment
  get env() {
    return process.env.NODE_ENV || 'development';
  },

  get isDev() {
    return this.env === 'development';
  },

  get baseUrl() {
    return process.env.BASE_URL || 'https://kinn.at';
  },

  // Security (validates on first access)
  get jwtSecret() {
    validateConfig();
    return process.env.JWT_SECRET;
  },

  get adminPassword() {
    validateConfig();
    return process.env.ADMIN_PASSWORD;
  },

  // Database
  get redis() {
    return {
      url: process.env.KINNST_KV_REST_API_URL?.trim(),
      token: process.env.KINNST_KV_REST_API_TOKEN?.trim()
    };
  },

  // Email
  get email() {
    return {
      apiKey: process.env.RESEND_API_KEY,
      sender: process.env.SENDER_EMAIL || 'Thomas @ KINN <thomas@kinn.at>',
      recipient: process.env.RECIPIENT_EMAIL || 'treff@in.kinn.at'
    };
  },

  // CORS (backward compatible with middleware/cors.js)
  get allowedOrigins() {
    return [
      'https://kinn.at',
      'https://www.kinn.at',
      ...(this.isDev ? ['http://localhost:8000', 'http://localhost:3000'] : [])
    ];
  }
};

// ✅ IMPROVEMENT: Backward compatibility exports
// Allows gradual migration: import { config } OR direct process.env access
export const JWT_SECRET = config.jwtSecret;
export const ADMIN_PASSWORD = config.adminPassword;
```

**Migration Strategy:**
1. Create config/index.js (no breaking changes)
2. Update middleware to use config (already done in Phase 1)
3. Gradually update other files (one per deploy)
4. Keep backward compat for 1-2 weeks
5. Remove direct env access after full migration

**Success Criteria:**
- [ ] Config validates correctly in production
- [ ] Dev environment works without all env vars
- [ ] No build errors
- [ ] Backward compatible imports work

---

### **Phase 3: Rollout to Remaining Endpoints**
**Duration:** 3-5 hours (spread over 2-3 days)
**Risk:** 🟡 Medium (multiple endpoints)
**Blast Radius:** Incremental (25% → 50% → 75% → 100%)

#### Strategy: Batch Migration by Risk Level

**Batch 1: Low-Risk Public Endpoints (25%)**
- `/api/events.js` (public event listing)
- `/api/profile/extended.js` (profile fetch)
- `/api/rsvp.js` (RSVP updates)

**Deploy, monitor 24h**

**Batch 2: Medium-Risk Auth Endpoints (50%)**
- `/api/confirm.js` (email confirmation)
- `/api/profile/update.js` (profile updates)
- `/api/profile/update-extended.js`

**Deploy, monitor 24h**

**Batch 3: High-Traffic Critical (75%)**
- `/api/signup.js` (CRITICAL - main signup flow)
- `/api/calendar.ics.js` (iCal feed)

**Deploy, monitor 48h** ⚠️ Extra monitoring for signup!

**Batch 4: Admin Endpoints (100%)**
- All `/api/admin/*` endpoints

**Success Criteria per Batch:**
- [ ] Zero errors in monitoring period
- [ ] Response times same or better
- [ ] CORS headers working
- [ ] Rate limiting effective

---

### **Phase 4: Email Templates Extraction**
**Duration:** 1-2 hours
**Risk:** 🟢 Low (pure refactor)
**Blast Radius:** 5% (only signup.js affected)

#### Implementation:

```javascript
// api/templates/emails/opt-in.html.js
export function generateOptInEmail(confirmUrl) {
  // ... exact HTML from signup.js (no changes!)
}

export function generateOptInEmailPlainText(confirmUrl) {
  // ... exact text from signup.js
}
```

**Testing:**
1. Extract template to file
2. Run diff between old and new output
3. Ensure byte-for-byte identical
4. Deploy
5. Send test email, verify formatting

**Success Criteria:**
- [ ] Email HTML identical to before
- [ ] Test emails render correctly
- [ ] Gmail/Outlook/Apple Mail all display correctly

---

### **Phase 5: Service Layer (Optional)**
**Duration:** 3-4 hours
**Risk:** 🟡 Medium
**Blast Radius:** 15%

**DECISION POINT:** Only implement if benefits outweigh complexity

**Benefits:**
- Reusable email logic
- Testable business logic
- Cleaner endpoint handlers

**Drawbacks:**
- More abstraction layers
- Potentially over-engineered for MVP

**Recommendation:** SKIP for now, revisit when:
- Team grows beyond 1-2 developers
- Need to reuse logic in multiple places
- Adding non-HTTP interfaces (CLI, cron jobs, etc.)

---

### **Phase 6: Validation Layer**
**Duration:** 2-3 hours
**Risk:** 🟡 Medium (changes error responses)
**Blast Radius:** 20%

**Critical:** Ensure error response format stays consistent!

```javascript
// Before
if (!emailRegex.test(email)) {
  return res.status(400).json({
    error: 'Invalid email',
    message: 'Please provide a valid email address'
  });
}

// After (MUST have identical response!)
const validation = validators.email(email);
if (!validation.valid) {
  return res.status(400).json({
    error: 'Invalid email',
    message: validation.error  // MUST match old message!
  });
}
```

---

### **Phase 7: Cleanup**
**Duration:** 1-2 hours
**Risk:** 🟢 Zero (archival only)

```bash
# Move to archive
mkdir -p archive/backups archive/migrations
mv index-backup-*.html archive/backups/
mv api/admin/migrate-redis-v2*.js archive/migrations/
mv scripts/migrate-redis-v2*.js archive/migrations/

# Git commit preserves history
git add .
git commit -m "archive: move legacy files to archive/"
```

---

## 📊 Revised Phase Overview Table

| Phase | Duration | Risk | Blast Radius | Lines Saved | Deploy Strategy | Monitoring |
|-------|----------|------|--------------|-------------|-----------------|------------|
| **0** | 2-3h | 🟢 Zero | 0% | 0 | No deploy | N/A |
| **1** | 2-3h | 🟢 Zero | 0% | 0 | Deploy (new files only) | N/A |
| **1.5** | 1h + 24h | 🟢 Very Low | 4% (1 endpoint) | 20 | Deploy → Monitor 24h | ⚠️ Critical |
| **2** | 1-2h | 🟢 Low | 10% | 100 | Deploy → Monitor 12h | Low |
| **3.1** | 2h + 24h | 🟡 Medium | 25% (6 endpoints) | 120 | Deploy → Monitor 24h | ⚠️ Medium |
| **3.2** | 2h + 24h | 🟡 Medium | 50% (12 endpoints) | 120 | Deploy → Monitor 24h | ⚠️ Medium |
| **3.3** | 2h + 48h | 🔴 High | 75% (signup!) | 150 | Deploy → Monitor 48h | 🚨 Critical |
| **3.4** | 2h + 24h | 🟢 Low | 100% (admin) | 90 | Deploy → Monitor 24h | Low |
| **4** | 1-2h | 🟢 Low | 5% | 150 | Deploy → Test email | Low |
| **5** | SKIP | - | - | 0 | - | - |
| **6** | 2-3h | 🟡 Medium | 20% | 50 | Deploy → Monitor 24h | Medium |
| **7** | 1-2h | 🟢 Zero | 0% | 300 | Deploy | N/A |

**Total Timeline:** 2-3 weeks (with monitoring periods)
**Total Active Work:** 18-24 hours
**Total Lines Saved:** ~1,100 lines

---

## 🔄 Rollback Procedures

### Quick Rollback (Emergency)
```bash
# 1. Identify last stable tag
git tag -l "stable-*" --sort=-v:refname | head -1

# 2. Rollback
git checkout <stable-tag>
vercel --prod

# 3. Notify team
echo "⚠️ Rolled back to <stable-tag> due to: <reason>"
```

### Feature Flag Rollback
```bash
# Disable new middleware
vercel env rm FEATURE_NEW_MIDDLEWARE
vercel env add FEATURE_NEW_MIDDLEWARE false

# Redeploy
vercel --prod
```

### Partial Rollback (Single Endpoint)
```bash
# Revert just one file
git checkout HEAD~1 -- api/signup.js
git commit -m "rollback: revert signup.js to previous version"
vercel --prod
```

---

## ✅ Success Metrics per Phase

### Phase 1.5 (Canary)
- [ ] Error rate < 0.1%
- [ ] Response time p95 < 500ms
- [ ] CORS success rate = 100%
- [ ] Rate limit triggers correctly

### Phase 3 (Rollout)
- [ ] Overall error rate < 0.5%
- [ ] No increase in support tickets
- [ ] CORS errors = 0
- [ ] Signup conversion rate unchanged

### Phase 4 (Email Templates)
- [ ] Email deliverability rate unchanged
- [ ] Spam score unchanged
- [ ] Visual rendering identical

---

## 🎯 Decision Matrix

**When to proceed to next phase:**
- ✅ All success criteria met
- ✅ Monitoring period complete with no issues
- ✅ Zero critical errors
- ✅ Performance metrics stable or improved

**When to pause/rollback:**
- ❌ Error rate increases > 1%
- ❌ Any critical endpoint failing
- ❌ CORS issues blocking users
- ❌ Support tickets spike

---

## 📝 Testing Checklist (Per Phase)

### Unit Tests
- [ ] Middleware functions work independently
- [ ] Validators return correct errors
- [ ] CORS headers set correctly
- [ ] Auth checks timing-safe

### Integration Tests
- [ ] Full signup flow (email → confirm → login)
- [ ] Admin login and event creation
- [ ] RSVP flow
- [ ] Calendar ICS generation
- [ ] Profile updates

### Smoke Tests (Production)
- [ ] All endpoints return expected status codes
- [ ] CORS headers present
- [ ] Rate limiting active
- [ ] Error responses formatted correctly

### Manual Testing
- [ ] Test in Chrome, Safari, Firefox
- [ ] Test from kinn.at domain
- [ ] Test CORS from localhost (dev)
- [ ] Test admin dashboard
- [ ] Send test emails

---

## 🚀 Recommended Timeline

### Week 1: Foundation
- **Mon:** Phase 0 (preparation)
- **Tue:** Phase 1 (create middleware)
- **Wed:** Phase 1.5 (canary migration) → Deploy
- **Thu-Fri:** Monitor canary

### Week 2: Config + Batch 1
- **Mon:** Phase 2 (config) → Deploy + monitor
- **Tue:** Phase 3.1 (batch 1) → Deploy
- **Wed-Thu:** Monitor batch 1
- **Fri:** Phase 3.2 (batch 2) if stable

### Week 3: Critical Rollout
- **Mon-Tue:** Phase 3.3 (signup endpoint) → Deploy + 48h monitor
- **Wed:** Phase 3.4 (admin endpoints)
- **Thu:** Phase 4 (email templates)
- **Fri:** Phase 7 (cleanup)

**Total:** 3 weeks with conservative monitoring periods

---

## 🎓 Lessons Learned (To Document)

After completion, document:
1. What went wrong (if anything)
2. What took longer than expected
3. Unexpected issues encountered
4. What would be done differently next time
5. Monitoring insights gained

---

## ❓ Open Questions to Resolve Before Starting

1. **Staging Environment:**
   - Do we have a Vercel preview environment?
   - Can we test there first before production?

2. **Rollback Authority:**
   - Who has authority to trigger rollback?
   - What's the decision threshold?

3. **Monitoring Setup:**
   - Is Vercel Analytics sufficient?
   - Do we need additional error tracking (Sentry)?

4. **Communication:**
   - Who needs to be notified of deployments?
   - What's the communication channel for issues?

---

## 📚 Additional Documentation Needed

Create after Phase 0:
- [ ] `docs/api-contracts.md` - Document all current API response formats
- [ ] `docs/rollback-playbook.md` - Step-by-step rollback procedures
- [ ] `docs/monitoring-dashboard.md` - How to check health metrics
- [ ] `docs/middleware-guide.md` - How to use new middleware

---

**Next Step:** Review this analysis and approve Phase 0 to begin preparation.

**Questions?** Let me know which parts need more detail or clarification.
