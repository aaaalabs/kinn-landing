# KINN MVP Security Review
**Date:** 2025-01-01
**Reviewer:** Security Audit (Automated + Manual Analysis)
**Scope:** All API endpoints, authentication, data handling

---

## Executive Summary

**Overall Risk Level:** 🟡 MEDIUM

**Critical Issues:** 1
**High Priority:** 3
**Medium Priority:** 4
**Low Priority:** 3

**Recommendation:** Address all Critical and High Priority issues before processing real user data.

---

## 🔴 CRITICAL ISSUES

### 1. Admin Password - Plaintext Comparison & Timing Attack
**File:** `api/admin/events.js:36`, `api/admin/subscribers.js`
**Severity:** CRITICAL

**Issue:**
```javascript
return token === adminPassword;
```

**Problems:**
1. **Timing Attack Vulnerability**: Standard string comparison leaks timing information
2. **No Password Hashing**: Admin password stored as plaintext in environment variable
3. **Weak Authentication**: Single password for all admin operations

**Impact:**
- Attacker can determine password length via timing analysis
- If environment variables leak, admin access is immediately compromised
- No audit trail of who performed admin actions

**Recommendation:**
```javascript
// Option A: Use crypto.timingSafeEqual (quick fix)
import crypto from 'crypto';

function isAuthenticated(req) {
  const authHeader = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || !authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  // Timing-safe comparison
  const tokenBuffer = Buffer.from(token);
  const passwordBuffer = Buffer.from(adminPassword);

  if (tokenBuffer.length !== passwordBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(tokenBuffer, passwordBuffer);
}

// Option B: Use bcrypt password hashing (better)
// Store hash in ADMIN_PASSWORD_HASH, compare with bcrypt.compare()
```

**Priority:** FIX IMMEDIATELY

---

## 🟠 HIGH PRIORITY ISSUES

### 2. CORS Configuration Too Permissive
**File:** Multiple API endpoints
**Severity:** HIGH

**Issue:**
```javascript
'Access-Control-Allow-Origin': '*'
```

**Impact:**
- Any website can call your APIs
- CSRF attacks possible
- No origin validation

**Recommendation:**
```javascript
const allowedOrigins = [
  'https://kinn.at',
  'https://www.kinn.at',
  process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : null
].filter(Boolean);

function getCorsHeaders(origin) {
  if (allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    };
  }
  return {};
}
```

**Priority:** HIGH

---

### 3. Profile Tokens Never Expire
**File:** `api/utils/tokens.js:54-64`
**Severity:** HIGH

**Issue:**
```javascript
// No expiresIn = never expires (long-lived token)
```

**Impact:**
- Stolen/leaked profile token = permanent account access
- No way to revoke compromised tokens
- User can't logout/invalidate sessions

**Recommendation:**
```javascript
export function generateProfileToken(email) {
  return jwt.sign(
    {
      email,
      type: 'profile',
      timestamp: Date.now(),
      // Add token ID for revocation
      jti: crypto.randomUUID()
    },
    SECRET,
    { expiresIn: '30d' } // 30 days, refresh on usage
  );
}

// Add token refresh endpoint
// Store revoked token IDs in Redis with TTL
```

**Priority:** HIGH

---

### 4. No Rate Limiting on Critical Endpoints
**File:** All API endpoints
**Severity:** HIGH

**Issue:**
- No rate limiting on `/api/signup` → Email bombing possible
- No rate limiting on `/api/admin/*` → Brute force possible
- No rate limiting on `/api/profile/update` → DoS possible

**Impact:**
- Attacker can:
  - Spam signups (thousands of emails)
  - Brute force admin password
  - Overwhelm server with profile updates
  - Exhaust Resend API quota

**Recommendation:**
```javascript
// Install: npm install @vercel/rate-limit

import rateLimit from '@vercel/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export default async function handler(req, res) {
  try {
    await limiter.check(res, 10, 'CACHE_TOKEN'); // 10 requests per minute
  } catch {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  // ... rest of handler
}
```

**Priority:** HIGH

---

## 🟡 MEDIUM PRIORITY ISSUES

### 5. Email Disclosure in Admin Notifications
**File:** `api/signup.js:129`
**Severity:** MEDIUM

**Issue:**
```javascript
<p><strong>Email:</strong> ${email}</p>
```

**Impact:**
- Admin notification emails contain user emails in plaintext
- If admin email is compromised, all user emails leaked
- Potential GDPR violation (email forwarding/archiving)

**Recommendation:**
```javascript
// Hash or truncate emails in notifications
const emailHash = crypto.createHash('sha256').update(email).digest('hex').substring(0, 8);
<p><strong>User:</strong> ${emailHash}***@${email.split('@')[1]}</p>
```

**Priority:** MEDIUM

---

### 6. No Input Length Validation
**File:** `api/profile/update-extended.js`, `api/admin/events.js`
**Severity:** MEDIUM

**Issue:**
- No max length on skills array → DoS possible
- No max length on profile fields → Database bloat
- No max length on event descriptions → Memory issues

**Impact:**
- Attacker can send 10MB JSON payload
- Redis storage exhaustion
- Vercel function memory limit reached

**Recommendation:**
```javascript
// Add validation
const MAX_SKILLS = 20;
const MAX_SKILL_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 2000;

if (supply?.skills) {
  if (supply.skills.length > MAX_SKILLS) {
    return res.status(400).json({
      error: 'Too many skills',
      message: `Maximum ${MAX_SKILLS} skills allowed`
    });
  }

  supply.skills = supply.skills
    .map(s => s.trim().substring(0, MAX_SKILL_LENGTH))
    .filter(s => s.length > 0);
}
```

**Priority:** MEDIUM

---

### 7. No CSRF Protection on State-Changing Operations
**File:** All POST/PUT/DELETE endpoints
**Severity:** MEDIUM

**Issue:**
- No CSRF tokens on admin operations
- No SameSite cookie protection
- No origin verification on state changes

**Impact:**
- Malicious site can trigger admin actions if admin is logged in
- Profile updates can be triggered from 3rd party sites

**Recommendation:**
```javascript
// Option A: Use SameSite cookies (if using session auth)
res.setHeader('Set-Cookie', 'session=...; SameSite=Strict; Secure; HttpOnly');

// Option B: Verify Origin header (current token-based setup)
function verifyOrigin(req) {
  const origin = req.headers.origin;
  const allowedOrigins = ['https://kinn.at', 'https://www.kinn.at'];
  return allowedOrigins.includes(origin);
}

// Add to state-changing operations
if (req.method === 'PUT' || req.method === 'POST' || req.method === 'DELETE') {
  if (!verifyOrigin(req)) {
    return res.status(403).json({ error: 'Invalid origin' });
  }
}
```

**Priority:** MEDIUM

---

### 8. JWT Secret Strength Not Validated
**File:** `api/utils/tokens.js:3-7`
**Severity:** MEDIUM

**Issue:**
```javascript
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

**Impact:**
- No check if secret is strong enough
- Developer might use "secret123" in production
- Weak secret = easy token forgery

**Recommendation:**
```javascript
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

if (SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

if (SECRET === 'secret' || SECRET === 'password' || SECRET.match(/^[a-z]+$/i)) {
  throw new Error('JWT_SECRET is too weak. Use a strong random string.');
}
```

**Priority:** MEDIUM

---

## 🟢 LOW PRIORITY ISSUES

### 9. Error Messages Leak Implementation Details
**File:** Multiple endpoints
**Severity:** LOW

**Issue:**
```javascript
message: error.message
```

**Impact:**
- Stack traces/error messages visible in production
- Helps attackers understand system internals
- May expose file paths, library versions

**Recommendation:**
```javascript
return res.status(500).json({
  error: 'Server error',
  message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
  // Only include details in development
  ...(process.env.NODE_ENV === 'development' && {
    details: error.message,
    stack: error.stack
  })
});
```

**Priority:** LOW

---

### 10. No Security Headers
**File:** All endpoints
**Severity:** LOW

**Issue:**
- No Content-Security-Policy
- No X-Frame-Options
- No X-Content-Type-Options
- No Strict-Transport-Security

**Recommendation:**
```javascript
// Add to vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com;"
        }
      ]
    }
  ]
}
```

**Priority:** LOW

---

### 11. No Logging of Security Events
**File:** All authentication endpoints
**Severity:** LOW

**Issue:**
- No logging of failed login attempts
- No logging of suspicious activity
- No audit trail for admin actions

**Recommendation:**
```javascript
// Add structured logging
function logSecurityEvent(event, data) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...data,
    // Never log sensitive data (passwords, tokens)
  }));
}

// Usage
logSecurityEvent('admin_login_failed', {
  ip: req.headers['x-forwarded-for'],
  userAgent: req.headers['user-agent']
});
```

**Priority:** LOW

---

## ✅ GOOD PRACTICES FOUND

1. ✅ JWT tokens include type field (prevents token confusion)
2. ✅ Email validation with regex
3. ✅ Input type checking (typeof, Array.isArray)
4. ✅ Sensitive data not logged (passwords, full tokens)
5. ✅ Environment variable validation on startup
6. ✅ Error handling with try/catch
7. ✅ HTTPS enforced (Vercel default)
8. ✅ Input sanitization (.trim(), .toLowerCase())
9. ✅ Token expiry for confirmation tokens (48h)
10. ✅ GDPR compliance (unsubscribe functionality)

---

## Immediate Action Items

### Week 1 (Critical)
- [ ] Fix admin password timing attack → Use crypto.timingSafeEqual
- [ ] Add rate limiting to all endpoints
- [ ] Fix CORS to allow specific origins only

### Week 2 (High)
- [ ] Add profile token expiration (30 days) + refresh mechanism
- [ ] Add input length validation
- [ ] Implement CSRF protection for state-changing operations

### Week 3 (Medium)
- [ ] Hash emails in admin notifications
- [ ] Validate JWT secret strength on startup
- [ ] Add security headers via vercel.json

### Week 4 (Low)
- [ ] Sanitize error messages in production
- [ ] Add security event logging
- [ ] Create security monitoring dashboard

---

## Security Testing Checklist

### Before Production:
- [ ] Run automated security scan (npm audit)
- [ ] Test rate limiting with ab/siege
- [ ] Verify CORS with browser dev tools
- [ ] Test token expiration manually
- [ ] Attempt SQL injection on all inputs (should fail)
- [ ] Attempt XSS on all inputs (should be escaped)
- [ ] Test admin brute force (should be rate limited)
- [ ] Verify HTTPS redirect works
- [ ] Check all secrets are in environment variables (not hardcoded)
- [ ] Verify no sensitive data in logs

### After Production:
- [ ] Monitor failed authentication attempts
- [ ] Set up alerts for unusual traffic patterns
- [ ] Regular dependency updates (npm audit fix)
- [ ] Quarterly security review
- [ ] Annual penetration testing

---

## Dependencies Security

Run regularly:
```bash
npm audit
npm audit fix
```

**Current Known Vulnerabilities:** (Check with npm audit)

---

## Contact

**Security Issues:** Report to thomas@kinn.at
**PGP Key:** [If available]
**Bug Bounty:** [If applicable]

---

**Last Updated:** 2025-01-01
**Next Review:** 2025-04-01
