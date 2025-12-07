# KINN-RADAR Deployment Preparation Checklist

## 🚀 Pre-Deployment Requirements

### ✅ Phase 1: Infrastructure Setup (Day 1)

#### 1.1 Email Infrastructure
```bash
# REQUIRED ACTIONS:
□ Create radar@in.kinn.at email in Resend Dashboard
□ Configure Inbound Parse webhook for radar@in.kinn.at
□ Set forwarding rule: Opt-in confirmations → thomas@kinn.at
□ Test email delivery with test@radar.in.kinn.at
```

**Resend Configuration:**
```javascript
// Resend Dashboard Settings
Domain: in.kinn.at
Email: radar@in.kinn.at
Inbound Webhook: https://kinn.at/api/radar/inbound
Webhook Secret: [Generate in Resend]
```

#### 1.2 Environment Variables
```bash
# Add to Vercel Dashboard (kinn.at project)

# REQUIRED - Core Services
RADAR_GROQ_API_KEY=[REDACTED - Already set in Vercel]
RESEND_WEBHOOK_SECRET=[from Resend dashboard]
RADAR_ADMIN_PASSKEY=[generate secure key]

# REQUIRED - Redis (existing KINN Redis)
UPSTASH_REDIS_REST_URL=[existing from KINN]
UPSTASH_REDIS_REST_TOKEN=[existing from KINN]

# REQUIRED - Google Sheets (for SLC)
RADAR_GOOGLE_SHEET_ID=[create sheet first]
GOOGLE_SERVICE_ACCOUNT_KEY=[JSON from Google Cloud]

# OPTIONAL - Future Features
ADMIN_SYNC_TOKEN=[for manual sync trigger]
BASE_URL=https://kinn.at
```

#### 1.3 Redis Schema Setup
```javascript
// Redis Key Structure for RADAR
radar:events                     // SET - All event IDs
radar:event:{id}                 // HASH - Event details
radar:events:by-date:{YYYY-MM-DD} // SET - Event IDs by date
radar:events:by-source:{source}  // SET - Event IDs by source
radar:duplicates                 // HASH - Duplicate mappings
radar:sources                    // SET - Active sources
radar:source:{name}              // HASH - Source config
radar:metrics:events:total       // STRING - Counter
radar:metrics:events:by-source   // HASH - Counters per source
radar:sheets:last-sync          // STRING - Timestamp
radar:newsletter:processed       // SET - Processed email IDs
radar:newsletter:queue           // LIST - Pending processing
```

### ✅ Phase 2: Google Sheets Setup (Day 1)

#### 2.1 Create Master Spreadsheet
```bash
□ Create new Google Sheet: "KINN-RADAR Events Tirol"
□ Set up 4 tabs: Active Events, Archive, Sources, Statistics
□ Share with: thomas@kinn.at (Editor)
□ Share with: Service Account (Editor)
□ Get Sheet ID from URL
□ Add RADAR_GOOGLE_SHEET_ID to Vercel env
```

#### 2.2 Service Account Setup
```bash
□ Go to console.cloud.google.com
□ Create project: "kinn-radar"
□ Enable: Google Sheets API, Google Drive API
□ Create Service Account: "kinn-radar-sync"
□ Download JSON key
□ Add to Vercel as GOOGLE_SERVICE_ACCOUNT_KEY
```

### ✅ Phase 3: Newsletter Subscriptions (Day 2)

#### 3.1 Priority Newsletter List
```yaml
MUST HAVE (Subscribe Immediately):
  DIH West:
    URL: https://dih-west.at/newsletter
    Email: newsletter@dih-west.at
    Frequency: Weekly
    Events Expected: 3-5/month

  WKO Tirol:
    URL: https://wko.at/tirol/newsletter
    Contact: tirol@wko.at
    Frequency: Bi-weekly
    Events Expected: 2-3/month

  Startup.Tirol:
    URL: https://startup.tirol/newsletter
    Email: office@startup.tirol
    Frequency: Weekly
    Events Expected: 4-6/month

  AI Austria:
    URL: https://aiaustria.com/newsletter
    Email: office@aiaustria.com
    Frequency: Monthly
    Events Expected: 1-2 Tirol events/month

NICE TO HAVE (Week 2):
  MCI:
    URL: https://mci.edu/newsletter
    Frequency: Monthly
    Events Expected: 2-3/month

  Universität Innsbruck:
    URL: https://uibk.ac.at/informatik/newsletter
    Frequency: Monthly
    Events Expected: 3-4/month

  FH Kufstein:
    URL: https://fh-kufstein.ac.at/newsletter
    Frequency: Monthly
    Events Expected: 1-2/month

  Standortagentur Tirol:
    URL: https://standort-tirol.at/newsletter
    Frequency: Quarterly
    Events Expected: 1-2/quarter
```

#### 3.2 Subscription Process
```bash
For each newsletter:
1. Go to subscription URL
2. Enter: radar@in.kinn.at
3. Confirm opt-in (forwards to thomas@kinn.at)
4. Thomas clicks confirmation link
5. Add source to Redis: radar:sources
```

### ✅ Phase 4: API Endpoints (Day 2)

#### 4.1 Required Endpoints
```javascript
// Must implement before launch
POST /api/radar/inbound         // Resend webhook
GET  /api/radar/calendar.ics    // Public ICS feed
GET  /api/radar/sheets-sync     // Cron job for Google Sheets
GET  /api/radar/events          // JSON API for events
GET  /api/radar/health          // System health check

// Optional for MVP
GET  /api/radar/overview        // HTML event table
POST /api/radar/sync-now        // Manual sync trigger
GET  /api/radar/stats           // Statistics dashboard
```

#### 4.2 File Structure
```bash
/mvp/api/radar/
├── inbound.js          # Newsletter processing ✅ Priority
├── calendar.ics.js     # ICS generation ✅ Priority
├── sheets-sync.js      # Google Sheets sync ✅ Priority
├── events.js           # JSON API
├── health.js           # Health check
├── overview.js         # HTML view (optional)
└── utils/
    ├── groq-extractor.js    # Event extraction
    ├── event-validator.js   # FREE+TYROL filter
    ├── deduplicator.js      # Duplicate detection
    └── redis-radar.js       # Redis operations
```

### ✅ Phase 5: Testing Strategy (Day 3)

#### 5.1 Unit Tests
```javascript
// Test each component individually
describe('Event Validator', () => {
  test('Accepts free events in Innsbruck');
  test('Rejects paid events');
  test('Rejects Vienna events');
  test('Accepts bilingual AI workshops');
});

describe('Groq Extractor', () => {
  test('Extracts German date formats');
  test('Handles recurring events');
  test('Returns empty array for non-events');
});

describe('Deduplicator', () => {
  test('Detects exact title+date match');
  test('Detects fuzzy title match (85%+)');
  test('Enriches existing events');
});
```

#### 5.2 Integration Tests
```bash
# Test newsletter flow
1. Send test newsletter to radar@in.kinn.at
2. Verify webhook receives it
3. Check Groq extraction
4. Verify Redis storage
5. Confirm Google Sheets update
6. Test ICS generation
```

#### 5.3 Load Testing
```javascript
// Simulate newsletter volume
- 10 newsletters in 1 minute
- 50 events extracted
- Verify deduplication
- Check Groq rate limits
- Monitor Redis performance
```

### ✅ Phase 6: Deployment Steps (Day 4)

#### 6.1 Deployment Sequence
```bash
# CRITICAL ORDER - Do not skip steps!

1. Environment Setup
   □ Add all env variables to Vercel
   □ Verify Redis connection
   □ Test Groq API key

2. Deploy Core Endpoints
   □ Deploy /api/radar/inbound
   □ Deploy /api/radar/calendar.ics
   □ Deploy /api/radar/sheets-sync

3. Configure Resend
   □ Set webhook URL
   □ Test with curl
   □ Verify signature validation

4. Initialize Google Sheets
   □ Run first manual sync
   □ Verify data appears
   □ Share with Thomas

5. Subscribe to First Newsletter
   □ Start with Startup.Tirol (most reliable)
   □ Confirm subscription
   □ Wait for first newsletter
   □ Verify processing

6. Enable Cron Jobs
   □ Add to vercel.json
   □ Deploy cron configuration
   □ Monitor first automated sync

7. Go Live
   □ Subscribe to remaining newsletters
   □ Share ICS link: kinn.at/api/radar/calendar.ics
   □ Monitor for 24 hours
```

### ✅ Phase 7: Monitoring & Alerts (Day 5)

#### 7.1 Health Checks
```javascript
// /api/radar/health endpoint
{
  "status": "healthy",
  "newsletters_processed_today": 12,
  "events_added_today": 8,
  "last_sync": "2024-01-15T08:30:00Z",
  "groq_credits_remaining": 298000,
  "redis_connection": "ok",
  "sheets_accessible": true
}
```

#### 7.2 Alert Conditions
```yaml
Critical Alerts (Email Thomas immediately):
  - Resend webhook down >1 hour
  - Groq API errors >3 in row
  - Redis connection lost
  - Google Sheets sync failed >3 times

Warning Alerts (Daily summary):
  - No events found in newsletter
  - Duplicate rate >30%
  - Groq credits <10000
  - Newsletter source inactive >7 days
```

#### 7.3 Monitoring Dashboard
```bash
# Simple monitoring URLs
https://kinn.at/api/radar/health      # JSON health status
https://kinn.at/api/radar/stats       # Statistics
https://kinn.at/api/radar/overview    # Event list
[Google Sheet URL]                     # Full event management
```

### ✅ Phase 8: Legal & Compliance (Before Launch)

#### 8.1 GDPR Compliance
```markdown
□ Add to Privacy Policy:
  - "We aggregate public event information"
  - "No personal data collected"
  - "Events sourced from public newsletters"

□ Newsletter subscriptions:
  - Only subscribe to public newsletters
  - Use dedicated radar@ email
  - Honor unsubscribe requests
```

#### 8.2 Content Rights
```markdown
□ Event data usage:
  - Only extract factual information
  - Link back to original sources
  - No copying of full descriptions
  - Respect robots.txt (even for newsletters)
```

### ✅ Phase 9: Launch Communication

#### 9.1 Soft Launch (Week 1)
```markdown
Internal Testing:
- Thomas subscribes to ICS
- Monitor for 3 days
- Fix any issues
- Refine filter criteria
```

#### 9.2 Beta Launch (Week 2)
```markdown
Announce to KINN Core (5-10 people):
"KINN-RADAR Beta: Every FREE AI Event in Tirol"
- Share ICS link
- Collect feedback
- Iterate on quality
```

#### 9.3 Public Launch (Week 3)
```markdown
Announce at KINN Thursday Breakfast:
- Live demo
- QR code for ICS subscription
- Show Google Sheets overview
- Explain FREE + TYROL focus
```

## 🚨 Critical Success Factors

### MUST Have Before Launch:
1. ✅ radar@in.kinn.at receiving emails
2. ✅ At least 3 newsletter subscriptions confirmed
3. ✅ ICS endpoint returning valid calendar
4. ✅ Google Sheets updating automatically
5. ✅ FREE + TYROL filter working correctly

### MUST Monitor in First Week:
1. 📊 Newsletter processing success rate (target: >95%)
2. 📊 Event extraction accuracy (target: >90%)
3. 📊 Duplicate detection rate (target: <5% false positives)
4. 📊 ICS subscription count (target: 10+ in week 1)
5. 📊 User feedback (target: "This is exactly what we needed!")

## 🎯 Definition of MVP Success

### Week 1 Success Metrics:
```yaml
Technical:
  - 5+ newsletters processed: ✓
  - 20+ events extracted: ✓
  - 0 paid events included: ✓
  - 0 non-Tyrol events: ✓
  - ICS feed working: ✓

Adoption:
  - Thomas using daily: ✓
  - 5+ beta users: ✓
  - Positive feedback: ✓
```

### Month 1 Goals:
```yaml
Scale:
  - 10+ newsletter sources
  - 50+ events/month
  - 50+ ICS subscribers
  - Google Sheets as primary management tool

Quality:
  - <5% missed events
  - <5% false positives
  - 100% FREE events only
  - 100% Tyrol-located only
```

## 📝 Quick Start Commands

```bash
# 1. Test newsletter webhook locally
curl -X POST http://localhost:3000/api/radar/inbound \
  -H "Content-Type: application/json" \
  -H "svix-signature: test" \
  -d '{"from":"test@startup.tirol","subject":"Newsletter","html":"<p>AI Workshop...</p>"}'

# 2. Trigger manual Google Sheets sync
curl -X GET https://kinn.at/api/radar/sheets-sync \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 3. Test ICS generation
curl https://kinn.at/api/radar/calendar.ics

# 4. Check system health
curl https://kinn.at/api/radar/health
```

## ⚡ Emergency Procedures

### If Newsletter Processing Fails:
```bash
1. Check Groq API credits
2. Verify Resend webhook secret
3. Check Redis connection
4. Review /api/radar/inbound logs
5. Process manually via test endpoint
```

### If Google Sheets Stops Syncing:
```bash
1. Check service account permissions
2. Verify sheet still exists/shared
3. Test manual sync endpoint
4. Check cron job logs in Vercel
5. Re-authenticate if needed
```

### If ICS Feed Breaks:
```bash
1. Verify Redis has events
2. Check date formatting
3. Validate ICS syntax
4. Test with single event
5. Rollback if needed
```

## 🎉 Launch Day Checklist

```markdown
□ Morning (9:00)
  - Final health check
  - Test all endpoints
  - Clear test data

□ Launch (10:00)
  - Subscribe to first real newsletter
  - Share ICS with Thomas
  - Monitor first sync

□ Afternoon (14:00)
  - Check Google Sheets
  - Verify events appearing
  - Test ICS in calendar app

□ Evening (18:00)
  - Review day 1 metrics
  - Fix any issues
  - Plan day 2 improvements
```

## 🚀 Go/No-Go Decision Criteria

### GO if:
- ✅ All 5 critical success factors met
- ✅ Test newsletter processed successfully
- ✅ Thomas approved Google Sheets format
- ✅ ICS validates in 3+ calendar apps

### NO-GO if:
- ❌ Groq API not extracting events
- ❌ Redis connection unstable
- ❌ Google Sheets sync failing
- ❌ Paid events slipping through filter

---

**REMEMBER**: The goal is a SIMPLE, RELIABLE system that delivers **"Every FREE AI Event in Tyrol"** via a single ICS subscription. Everything else is secondary.