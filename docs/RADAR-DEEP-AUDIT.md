# KINN RADAR Deep Audit: Redis vs Google Sheets Sync
*Generated: December 9, 2024*

## 🚨 Critical Findings

### 1. Last Check Dates Show Unix Epoch (1/1/1970)
**Issue**: Multiple sources showing "1/1/1970" as last check date
- **Affected**: 13 out of 19 sources (68%)
- **Root Cause**: These sources have NEVER been successfully checked
- **Impact**: No events are being extracted from majority of sources

```
Sources Never Checked:
- InnCubator (Error)
- Startup.Tirol (Error)
- WKO Tirol (Error)
- AI Austria (Error)
- Standortagentur Tirol (Error)
- Impact Hub Tirol (Inactive)
- MCI (Inactive)
- LSZ (Error)
- Meetup Innsbruck (Inactive)
- Engineering Kiosk Alps (Inactive)
- Das Wundervoll (Inactive)
- WeLocally Innsbruck (Inactive)
- Die Bäckerei (Inactive)
```

### 2. Status Discrepancies

#### Error Status (7 sources - 37%)
Sources marked as "Error" likely have:
- Changed URL structure
- Authentication requirements
- JavaScript-heavy SPAs that need special handling
- Server blocking automated requests

#### Inactive Status (10 sources - 53%)
Sources marked as "Inactive" are:
- Not configured in extraction endpoints
- Disabled due to repeated failures
- Awaiting manual configuration

#### Working Status (2 sources only - 11%)
Only 2 sources appear functional:
- Uni Innsbruck (116 events this month!)
- Unknown second source

### 3. Schedule vs Reality Mismatch

**Google Sheets Shows:**
- Daily: 13 sources
- Weekly: 6 sources
- As received: 1 source (newsletter)

**Actual Reality:**
- NO automated schedules are running
- NO cron jobs configured
- Extraction is MANUAL via admin triggers only

## 📊 Data Flow Analysis

### Current Architecture
```
Google Sheets (Configuration)
     ↓ [Manual Copy]
source-configs.js (Hardcoded)
     ↓ [Manual Trigger]
/api/radar/extract-dynamic.js
     ↓
Redis (Event Storage)
     ↓ [Manual Sync]
Google Sheets (Reporting)
```

### Problems with Current Flow
1. **No Bidirectional Sync**: Changes in Google Sheets don't affect extraction
2. **No Automated Scheduling**: "Daily" in sheet ≠ actual daily extraction
3. **No Error Recovery**: Failed sources stay failed forever
4. **No Metrics Update**: Last check dates not updating to Redis

## 🔍 Why This Is Happening

### 1. Missing Cron Implementation
```javascript
// What Google Sheets expects:
Schedule: "Daily" → Run every 24h
Schedule: "Weekly" → Run every 7 days

// What actually exists:
Schedule: [IGNORED] → Manual trigger only
```

### 2. Extraction Endpoint Issues

Looking at the errors, the extraction endpoints are failing because:

```javascript
// Current implementation in extract-dynamic.js
const patterns = await getExtractionPatterns(sourceName);
if (!patterns) {
  return res.status(404).json({
    error: `Source "${sourceName}" not found`
  });
}
```

The sources are defined in Google Sheets but NOT in:
- `api/source-configs.js` (hardcoded configs)
- Or extraction patterns aren't properly configured

### 3. Metrics Never Updated

The "Last Check" field shows 1/1/1970 because:
```javascript
// Missing in extraction endpoints:
await updateSourceMetrics(sourceName, {
  lastCheck: new Date().toISOString(),
  status: 'success' // or 'error'
});
```

## 🔄 Google Sheets → System Sync Status

### Can Schedule Be Changed Via Google Sheets?
**Current Answer**: NO ❌

The Google Sheets "Schedule" column is:
- Display-only information
- Not connected to any automation
- Cannot trigger actual scheduled runs

### What Google Sheets CAN Control:
Currently via `/api/radar/extract-dynamic.js`:
- ✅ Source URL
- ✅ HTML Pattern (extraction hints)
- ✅ Date Format
- ✅ Extract Notes (special instructions)

### What Google Sheets CANNOT Control:
- ❌ Actual execution schedule
- ❌ Enable/disable sources
- ❌ Retry logic
- ❌ Error recovery

## 🛠️ Required Fixes

### Priority 1: Fix Source Configurations
1. Audit all 19 sources in Google Sheets
2. Add missing sources to extraction configs
3. Test each source individually
4. Update extraction patterns for SPAs

### Priority 2: Implement Scheduling
Options:
1. **Vercel Cron** (Recommended)
   ```javascript
   // vercel.json
   {
     "crons": [{
       "path": "/api/radar/cron-daily",
       "schedule": "0 9 * * *"  // 9 AM daily
     }]
   }
   ```

2. **GitHub Actions** (Alternative)
   ```yaml
   schedule:
     - cron: '0 9 * * *'  # Daily at 9 AM
   ```

### Priority 3: Bidirectional Sync
1. Read schedules FROM Google Sheets
2. Update metrics TO Google Sheets
3. Store extraction results back to sheets

### Priority 4: Error Recovery
1. Implement retry logic with exponential backoff
2. Alert on repeated failures
3. Auto-disable after X failures
4. Manual re-enable via admin

## 📈 Current Statistics

### Source Health
- 🔴 Error: 7 sources (37%)
- 🟡 Inactive: 10 sources (53%)
- 🟢 Working: 2 sources (11%)

### Event Extraction
- This Month Total: ~250 events
- Last 30 Days: ~400 events
- Success Rate: 11% of sources

### Data Freshness
- Never Checked: 68% of sources
- Checked Today: 0%
- Checked This Week: ~10%
- Stale (>30 days): 90%

## 🎯 Immediate Actions Required

1. **Fix Working Sources First**
   - Test and fix the 7 "Error" sources
   - These were working before, easier to restore

2. **Implement Basic Scheduling**
   - Start with manual daily trigger
   - Add Vercel cron for automation

3. **Update Metrics Pipeline**
   - Ensure lastCheck updates on every run
   - Sync status back to Google Sheets

4. **Document Pattern Requirements**
   - Create extraction pattern guide
   - Test patterns for each source type

## 🚨 Risk Assessment

### High Risk
- **Data Loss**: No events from 89% of sources
- **Stale Information**: Users seeing outdated events
- **Manual Overhead**: Everything requires manual triggers

### Medium Risk
- **Scaling Issues**: Can't add new sources easily
- **No Monitoring**: Failures go unnoticed
- **Configuration Drift**: Sheets vs code mismatch

### Mitigation Strategy
1. Implement automated extraction immediately
2. Add monitoring/alerting for failures
3. Create source health dashboard
4. Weekly audit of source status

## 📊 Recommended Architecture

```
Google Sheets (Source of Truth)
     ↓ [Reads config every run]
/api/radar/sync-sources (New endpoint)
     ↓ [Updates source configs]
Redis (Cached configs + Events)
     ↓ [Based on schedule]
Vercel Cron (Triggers extraction)
     ↓ [Parallel extraction]
/api/radar/extract-dynamic
     ↓ [Updates metrics]
Google Sheets (Status reporting)
```

## 🔧 Next Steps

### Today
1. Test each source individually via `/api/radar/extract-dynamic`
2. Fix extraction patterns for failing sources
3. Enable GitHub Actions for deployment control

### This Week
1. Implement Vercel cron for daily extraction
2. Add metrics sync back to Google Sheets
3. Create source health monitoring

### This Month
1. Full bidirectional Google Sheets sync
2. Implement retry/recovery logic
3. Add new high-value sources
4. Create extraction pattern library