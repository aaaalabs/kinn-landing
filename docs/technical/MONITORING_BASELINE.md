# KINN Monitoring Baseline

**Date:** 2025-11-05
**Purpose:** Establish baseline metrics before restructuring to measure impact

---

## Baseline Metrics (Pre-Restructuring)

### System Overview

**Deployment:**
- **Platform:** Vercel
- **Region:** Frankfurt (eu-central-1)
- **Runtime:** Node.js 20
- **Type:** Serverless Functions

**Codebase:**
- **Total API Lines:** ~5,647 lines
- **Endpoints:** 23 total
  - Public: 11 endpoints
  - Admin: 12 endpoints
- **Duplicate Code:** ~1,200 lines (CORS, auth, validation)

---

## Expected Performance Metrics

### Response Times (Target)

| Endpoint | p50 | p95 | p99 | Notes |
|----------|-----|-----|-----|-------|
| `/api/signup` | <200ms | <500ms | <1000ms | Email send can be slow |
| `/api/confirm` | <100ms | <300ms | <500ms | Simple token verification |
| `/api/calendar.ics` | <200ms | <500ms | <800ms | Redis fetch + generation |
| `/api/events` | <100ms | <200ms | <400ms | Simple Redis query |
| `/api/profile` | <150ms | <300ms | <500ms | Redis fetch + matching |
| `/api/admin/events` | <100ms | <250ms | <400ms | Admin endpoint |

**Average Response Time:** 200-300ms (p95)

---

## Error Rate Targets

### Baseline Error Rates

| Metric | Current Target | After Restructuring | Notes |
|--------|---------------|---------------------|-------|
| **4xx Errors** | <5% | <5% | User errors (invalid input) |
| **5xx Errors** | <0.5% | <0.1% | Server errors (should decrease) |
| **CORS Errors** | Unknown | 0% | Should be eliminated |
| **Rate Limit** | <2% | <2% | Legitimate rate limiting |

**Goal:** Reduce 5xx errors from 0.5% to <0.1% with better error handling

---

## Traffic Patterns

### Expected Usage

**Current Users:**
- Confirmed subscribers: ~50-100 (estimated)
- Monthly signups: ~10-20
- Admin operations: ~5-10/month

**Traffic Distribution:**
| Endpoint | % of Traffic | Requests/Day |
|----------|-------------|--------------|
| `/api/calendar.ics` | 40% | ~20-40 |
| `/api/signup` | 30% | ~2-5 |
| `/api/events` | 15% | ~10-15 |
| `/api/profile` | 10% | ~5-10 |
| Admin endpoints | 5% | ~1-2 |

**Peak Times:**
- Event announcements: 2-3x normal traffic
- After newsletter sends: 5-10x normal traffic

---

## Monitoring Tools

### Available Metrics

**Vercel Analytics:**
- ✅ Response times (p50, p75, p95, p99)
- ✅ Error rates (4xx, 5xx)
- ✅ Request counts
- ✅ Bandwidth usage

**Vercel Logs:**
- ✅ Function logs (`console.log`, `console.error`)
- ✅ Request/response details
- ✅ Cold start metrics

**Redis (Upstash):**
- ✅ Command count
- ✅ Storage usage
- ✅ Hit/miss rates

**Email (Resend):**
- ✅ Delivery rates
- ✅ Bounce rates
- ✅ Spam complaints

---

## Key Performance Indicators (KPIs)

### Success Criteria After Restructuring

**Performance:**
- [ ] Response times ≤ baseline (±10%)
- [ ] Cold start times < 500ms
- [ ] No increase in p95/p99 latency

**Reliability:**
- [ ] 5xx error rate < 0.1% (improvement from 0.5%)
- [ ] CORS errors = 0
- [ ] Rate limiting functional (2% of requests blocked)

**Code Quality:**
- [ ] Lines of code reduced by 22% (1,200 lines saved)
- [ ] Duplicate code eliminated (6 → 1 file for CORS)
- [ ] Test coverage > 80%

**User Experience:**
- [ ] No increase in support tickets
- [ ] Signup conversion rate unchanged
- [ ] RSVP functionality 100% operational

---

## Baseline Measurement Checklist

**Before Phase 1 Implementation:**

1. **Vercel Metrics (Last 7 Days):**
   - [ ] Capture response time graph (p50, p95, p99)
   - [ ] Capture error rate graph (4xx, 5xx)
   - [ ] Capture request volume

2. **Function-Specific Metrics:**
   - [ ] `/api/signup` - response time, error rate
   - [ ] `/api/confirm` - response time, error rate
   - [ ] `/api/calendar.ics` - response time, error rate
   - [ ] `/api/events` - response time, error rate

3. **User Feedback:**
   - [ ] Support tickets (last 30 days): 0
   - [ ] Known issues: None
   - [ ] CORS complaints: None

4. **Database Metrics:**
   - [ ] Redis command count (daily avg)
   - [ ] Storage usage: ~10MB
   - [ ] Average response time: < 10ms

5. **Email Metrics:**
   - [ ] Delivery rate: >95%
   - [ ] Bounce rate: <2%
   - [ ] Spam complaints: <0.1%

---

## Monitoring During Migration

### Phase 1.5 (Canary - Single Endpoint)

**Monitor:** `/api/events/upcoming.js`

**Check Every 6 Hours:**
- [ ] Response time vs baseline
- [ ] Error count (should be 0)
- [ ] CORS headers present
- [ ] Rate limiting works

**Alert Thresholds:**
- 🟡 Warning: Response time >2x baseline
- 🔴 Critical: Any 5xx errors
- 🔴 Critical: CORS errors

### Phase 3 (Full Rollout)

**Monitor All Endpoints:**

**Check Daily:**
- [ ] Overall error rate < 0.1%
- [ ] Response times within baseline ±10%
- [ ] No CORS errors
- [ ] Signup flow functional (test manually)

**Alert Thresholds:**
- 🟡 Warning: 5xx error rate > 0.5%
- 🔴 Critical: 5xx error rate > 1%
- 🔴 Critical: CORS errors detected
- 🔴 Critical: Signup broken

---

## Baseline Snapshots

### Pre-Restructuring State

**Captured On:** 2025-11-05

**Code Statistics:**
```bash
# Total lines in /api
find api -name "*.js" -exec wc -l {} \; | awk '{sum+=$1} END {print "Total:", sum, "lines"}'
# Result: 5,647 lines

# Endpoints
find api -name "*.js" -type f | wc -l
# Result: 23 files

# Duplicate CORS code
grep -r "ALLOWED_ORIGINS" api | wc -l
# Result: 6 files
```

**Environment:**
- Node.js: 20.x
- Dependencies: 7 production, 3 dev
- Serverless Functions: 23
- Edge Functions: 0

**Database:**
- Subscribers: ~50-100 (estimated)
- Events: ~5 active
- Profiles: ~20 (with supply/demand)

---

## Comparison Template (After Migration)

Use this template after each phase:

```markdown
### Phase X Migration Results

**Date:** YYYY-MM-DD
**Endpoints Migrated:** N endpoints
**Duration:** N hours of active work + N hours monitoring

**Metrics:**
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Response Time (p95) | Xms | Yms | +/-Z% |
| Error Rate (5xx) | X% | Y% | +/-Z% |
| CORS Errors | X | Y | - |
| Lines of Code | X | Y | -Z% |

**Issues Encountered:**
- None / List issues

**Rollbacks Required:**
- None / Describe rollback

**Lessons Learned:**
- ...
```

---

## Monitoring Dashboard Access

### Vercel Analytics

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select KINN project
3. Click **Analytics** tab
4. Filter by:
   - Time period (Last 7 days recommended)
   - Endpoint (e.g., `/api/signup`)
   - Status code (2xx, 4xx, 5xx)

### Upstash Redis

1. Go to [console.upstash.com](https://console.upstash.com)
2. Select KINN database
3. View **Metrics** tab
4. Check:
   - Commands/second
   - Storage usage
   - Hit rate

### Resend Email

1. Go to [resend.com/dashboard](https://resend.com/dashboard)
2. View **Analytics**
3. Check:
   - Emails sent
   - Delivery rate
   - Bounce rate

---

## Emergency Contact Points

**If metrics degrade significantly:**

1. **Check Vercel Logs:**
   ```bash
   vercel logs --since 1h
   ```

2. **Check Redis Health:**
   - Upstash Console → Database Status

3. **Rollback if needed:**
   - See `scripts/rollback.sh`
   - Or disable feature flags

4. **Notify:**
   - Team via Slack/Email
   - Document in incident log

---

## Success Checklist

After full migration (all phases complete):

- [ ] Response times improved or unchanged (±10%)
- [ ] 5xx error rate reduced to <0.1%
- [ ] CORS errors eliminated (0%)
- [ ] Lines of code reduced by ~22%
- [ ] Duplicate code eliminated
- [ ] Test coverage >80%
- [ ] No increase in support tickets
- [ ] All API contracts still valid
- [ ] Feature flags removed (code cleanup)
- [ ] Documentation updated

---

**Next Steps:**
1. Capture baseline metrics from Vercel dashboard
2. Save screenshots to `docs/restructuring/baseline/`
3. Proceed with Phase 1 implementation
4. Compare metrics after each phase

**Baseline Documentation Status:** ✅ Complete - Ready for Phase 1
