# KINN Rollback Playbook

**Purpose:** Step-by-step procedures for emergency rollbacks during restructuring

---

## 🚨 When to Rollback

Rollback immediately if:

- ✅ **5xx error rate > 5%** (significant production errors)
- ✅ **CORS errors blocking users** (can't load site)
- ✅ **Signup flow broken** (critical user journey)
- ✅ **Response times > 3x baseline** (severe performance degradation)
- ✅ **Data loss/corruption detected** (Redis issues)

Consider rollback if:

- ⚠️ **5xx error rate > 1%** (elevated errors)
- ⚠️ **Response times > 2x baseline** (performance issues)
- ⚠️ **Support tickets spike** (user complaints)
- ⚠️ **Feature not working as expected** (functionality issues)

---

## 📋 Rollback Decision Matrix

| Severity | Error Rate | Response Time | Action | Method |
|----------|-----------|---------------|--------|--------|
| 🟢 Low | <0.5% | Within baseline | Monitor | None |
| 🟡 Medium | 0.5-1% | 1.5-2x baseline | Investigate | Consider feature flag disable |
| 🟠 High | 1-5% | 2-3x baseline | **Rollback** | Feature flag or deployment |
| 🔴 Critical | >5% | >3x baseline | **Emergency Rollback** | Fastest method available |

---

## 🔄 Rollback Methods (Fastest to Slowest)

### Method 1: Feature Flag Toggle ⚡ (Fastest - <1 minute)

**When:** New feature causing issues, old code still deployed

**Speed:** Instant (next request uses old code)

**Risk:** Very Low

**Steps:**
```bash
# Option A: Use rollback script
./scripts/rollback.sh feature-flag

# Option B: Manual via Vercel CLI
vercel env add FEATURE_NEW_MIDDLEWARE false --force

# Option C: Manual via Vercel Dashboard
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Find FEATURE_NEW_MIDDLEWARE
3. Change value from 'true' to 'false'
4. Click Save
5. Done! (no deployment needed)
```

**Verification:**
```bash
# Check Vercel logs for feature flag status
vercel logs --since 1m | grep "\[FEATURES\]"

# Should see: "[FEATURES] Enabled: none" or similar
```

---

### Method 2: Promote Previous Deployment 🚀 (Fast - 2-3 minutes)

**When:** New deployment is broken, previous deployment was stable

**Speed:** 2-3 minutes (Vercel promotion + propagation)

**Risk:** Low

**Steps:**
```bash
# Option A: Use rollback script
./scripts/rollback.sh deployment

# Option B: Manual
# 1. List recent deployments
vercel ls --limit 10

# 2. Find previous stable deployment (before issues started)
#    Look for deployment BEFORE the problematic one

# 3. Promote it
vercel promote <deployment-url>

# Example:
vercel promote kinn-abc123.vercel.app
```

**Verification:**
```bash
# Check live site
curl -I https://kinn.at/api/events

# Verify Vercel deployment list
vercel ls | head -1
# Should show promoted deployment as "Production"
```

---

### Method 3: Git Tag Rollback 🏷️ (Medium - 5-10 minutes)

**When:** Need to rollback code to specific previous state

**Speed:** 5-10 minutes (checkout + build + deploy)

**Risk:** Medium (creates backup commit)

**Steps:**
```bash
# Option A: Use rollback script
./scripts/rollback.sh git

# Option B: Manual
# 1. Create backup of current state
git add -A
git commit -m "backup: before rollback to stable-YYYY-MM-DD"

# 2. View available stable tags
git tag -l "stable-*" --sort=-v:refname

# 3. Checkout target tag
git checkout stable-2025-11-04

# 4. Deploy
vercel --prod

# 5. Create new tag for this rollback
git tag -a rollback-$(date +%Y-%m-%d-%H%M) -m "Emergency rollback"
```

**Verification:**
```bash
# Check current git state
git describe --tags

# Check deployment
vercel ls | head -1
```

---

### Method 4: Manual File Revert 🔧 (Slow - 10-15 minutes)

**When:** Single file causing issues, rest of deployment is fine

**Speed:** 10-15 minutes (revert + commit + deploy)

**Risk:** Medium (surgical fix)

**Steps:**
```bash
# 1. Identify problematic file
# Example: api/signup.js

# 2. Revert to previous version
git log --oneline api/signup.js  # Find commit before bug
git checkout <commit-hash> -- api/signup.js

# 3. Commit
git add api/signup.js
git commit -m "rollback: revert api/signup.js to working version"

# 4. Deploy
vercel --prod
```

**Verification:**
```bash
# Check file content
head -20 api/signup.js

# Check deployment
vercel ls | head -1
```

---

## 📝 Rollback Procedure Checklist

### Pre-Rollback

- [ ] Confirm issue severity (use decision matrix)
- [ ] Screenshot/copy error logs
- [ ] Note time issue started
- [ ] Identify last known good state
- [ ] Choose rollback method

### During Rollback

- [ ] Execute rollback command
- [ ] Wait for completion (1-10 min depending on method)
- [ ] Verify rollback successful

### Post-Rollback

- [ ] Test critical user flows:
  - [ ] Landing page loads
  - [ ] Signup form works
  - [ ] Email confirmation works
  - [ ] Calendar ICS generates
  - [ ] Admin dashboard accessible

- [ ] Check metrics:
  - [ ] Error rate < 0.5%
  - [ ] Response times normal
  - [ ] CORS headers present

- [ ] Document incident:
  - [ ] What went wrong
  - [ ] When it started
  - [ ] Rollback method used
  - [ ] Time to resolution
  - [ ] Root cause (if known)

---

## 🔍 Monitoring After Rollback

### First 15 Minutes

Check every 5 minutes:

```bash
# Check Vercel logs
vercel logs --since 5m

# Look for errors
vercel logs --since 5m | grep ERROR

# Check specific endpoint
curl -I https://kinn.at/api/events
```

**Expected:** Zero errors, normal response times

### Next Hour

Check every 15 minutes:

- [ ] Vercel Analytics → Error rate
- [ ] Vercel Analytics → Response times
- [ ] User reports (email, social media)

### Next 24 Hours

Check every 6 hours:

- [ ] Overall system health
- [ ] No recurring issues
- [ ] Metrics stable

---

## 🧪 Testing After Rollback

**Manual Test Checklist:**

```bash
# 1. Landing page
curl -I https://kinn.at
# Expected: 200 OK

# 2. Signup (don't complete - just test API)
curl -X POST https://kinn.at/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@kinn.at"}'
# Expected: 200 OK with success message

# 3. Calendar ICS
curl -I https://kinn.at/api/calendar.ics
# Expected: 200 OK, Content-Type: text/calendar

# 4. Events listing
curl https://kinn.at/api/events | jq '.success'
# Expected: true

# 5. CORS headers
curl -I -H "Origin: https://kinn.at" https://kinn.at/api/events
# Expected: Access-Control-Allow-Origin: https://kinn.at
```

---

## 📞 Emergency Contacts

**If rollback fails or issues persist:**

1. **Check Vercel Status:**
   - https://www.vercel-status.com/

2. **Check Upstash Redis:**
   - https://status.upstash.com/

3. **Check Resend:**
   - https://resend.com/status

4. **Escalation:**
   - Contact Vercel support
   - Check community Slack/Discord
   - Review deployment logs

---

## 📚 Common Rollback Scenarios

### Scenario 1: CORS Errors After Middleware Update

**Symptoms:**
- Browser console: "CORS policy blocked"
- 0 requests succeeding from frontend

**Rollback:**
```bash
# Fastest: Disable middleware feature flag
vercel env add FEATURE_NEW_MIDDLEWARE false --force

# Verify
curl -I -H "Origin: https://kinn.at" https://kinn.at/api/events
# Should see Access-Control-Allow-Origin header
```

**Time to Fix:** <1 minute

---

### Scenario 2: 500 Errors After Config Update

**Symptoms:**
- 5xx error rate spike
- Logs show "Cannot read property 'jwtSecret'"

**Rollback:**
```bash
# Disable config feature flag
vercel env add FEATURE_NEW_CONFIG false --force

# Or promote previous deployment
vercel ls
vercel promote <previous-deployment-url>
```

**Time to Fix:** 1-3 minutes

---

### Scenario 3: Signup Broken After Service Layer

**Symptoms:**
- Signup returns 500
- Logs show "EmailService is not defined"

**Rollback:**
```bash
# Disable service layer
vercel env add FEATURE_SERVICE_LAYER false --force

# Verify signup works
curl -X POST https://kinn.at/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@kinn.at"}'
```

**Time to Fix:** <1 minute

---

### Scenario 4: Complete Deployment Failure

**Symptoms:**
- All endpoints returning 500
- Vercel shows deployment failed

**Rollback:**
```bash
# Promote previous successful deployment
vercel ls --limit 10
# Find last "Ready" deployment before current
vercel promote <that-deployment-url>
```

**Time to Fix:** 2-3 minutes

---

## 🎯 Success Criteria

Rollback is successful when:

- ✅ Error rate < 0.5%
- ✅ Response times within baseline (±10%)
- ✅ CORS headers present
- ✅ All critical flows working:
  - Signup → Confirm → Success
  - Calendar ICS generation
  - Events listing
  - Admin access
- ✅ No user complaints
- ✅ Metrics stable for 1 hour

---

## 📖 Lessons Learned Template

After each rollback, document:

```markdown
## Rollback Incident: YYYY-MM-DD

**Issue:** Brief description
**Severity:** 🟢🟡🟠🔴
**Duration:** X minutes/hours
**Users Affected:** N users (estimated)

**Root Cause:**
- What went wrong
- Why it wasn't caught in testing

**Rollback Method:**
- Method used (feature flag / deployment / git)
- Time to rollback: X minutes

**Prevention:**
- What would prevent this in future
- Additional tests needed
- Process improvements

**Action Items:**
- [ ] Update tests
- [ ] Improve monitoring
- [ ] Document edge case
```

---

**Remember:**
- 🏃 **Speed matters** - Use fastest safe method
- 📊 **Monitor closely** - Watch metrics for 24h after rollback
- 📝 **Document everything** - Learn from incidents
- 🧪 **Test before re-deploying** - Fix root cause first

**Rollback is not failure** - It's a safety mechanism for rapid iteration! 🚀
