# KINN-RADAR Extraction Patterns

## Source Types & Challenges

### 🟢 Type 1: Full Event Lists (Best)
**Pattern**: All events with complete details on one page

| Source | Details Available | Status |
|--------|------------------|--------|
| InnCubator | Title, Date, Time, Location, Price | ✅ Works with Firecrawl |
| WKO Tirol | Title, Date, Location, Price | ✅ Works (needs ?bundesland=T) |
| Startup.Tirol | Full details | ✅ Works |

**Extraction**: Straightforward - one API call gets everything

---

### 🟡 Type 2: Partial Lists (Limited)
**Pattern**: Event list but missing key details

| Source | Issue | Workaround |
|--------|-------|------------|
| WeLocally | Only date/title on main page | Need to visit each event page |
| Some tourism sites | Missing times or prices | Guess or skip |

**Challenge**: Need "deep crawling" - follow each link for full details
**Cost**: N events = N+1 API calls (expensive!)

---

### 🔴 Type 3: Single Event Only (Poor)
**Pattern**: Shows only next upcoming event

| Source | What Shows | Value |
|--------|------------|-------|
| Engineering Kiosk Alps | Next meetup only | Low - just 1 event |

**Challenge**: Can't aggregate multiple events
**Value**: Limited for event discovery

---

### ⛔ Type 4: Authentication Required
**Pattern**: Need login to see events

| Source | Requirement | Feasibility |
|--------|------------|-------------|
| Meetup | Login required | Complex - need auth |
| Private groups | Membership | Not possible |

**Challenge**: Can't access without credentials

---

### ❌ Type 5: No Event Page
**Pattern**: Site exists but no dedicated events

| Source | Issue |
|--------|-------|
| Coworking Tirol | Domain doesn't exist |
| Werkstätte Wattens | No events section |

**Action**: Remove from sources

---

## Extraction Efficiency Matrix

| Type | Firecrawl Credits | Value | Recommendation |
|------|------------------|-------|----------------|
| **Full Lists** | 1 credit | High | ✅ Priority |
| **Partial Lists** | 10-50 credits | Medium | ⚠️ Consider |
| **Single Event** | 1 credit | Low | 🤔 Skip? |
| **Auth Required** | N/A | None | ❌ Skip |
| **No Events** | N/A | None | ❌ Remove |

---

## Optimal Sources for KINN-RADAR

### High Value (Focus Here)
1. **InnCubator** - 27 events, all details, 1 credit
2. **WKO Tirol** - Many events, filtered for Tirol
3. **Startup.Tirol** - WordPress API available
4. **Uni Innsbruck** - Academic events
5. **MCI** - Business/tech events

### Medium Value (If Credits Allow)
- **Innsbruck.info** - Tourism events (many paid)
- **Congress Messe** - Trade fairs (some free days)

### Low Value (Consider Skipping)
- **Engineering Kiosk Alps** - Only 1 event
- **WeLocally** - Needs deep crawl
- **Meetup** - Requires authentication

---

## Recommendations

### For MVP
1. Focus on **Type 1 sources** (full lists)
2. Use Firecrawl's single scrape (not crawl)
3. Skip sources needing authentication
4. Remove sources without event pages

### Future Improvements
1. Implement deep crawling for high-value partial lists
2. Find API endpoints where possible
3. Consider OAuth for Meetup integration
4. Monitor single-event sources manually

### Credit Optimization
```javascript
// Prioritize by value/credit ratio
const PRIORITY = {
  'InnCubator': 27,        // 27 events/credit
  'WKO Tirol': 15,         // 15 events/credit
  'Engineering Kiosk': 1,  // 1 event/credit
  'WeLocally': 0.2        // 10 events/50 credits
};
```

---

## Lessons Learned

1. **Always verify** event page exists
2. **Check what's visible** without clicking
3. **Calculate credit cost** vs value
4. **Prefer full lists** over partial
5. **Skip auth-required** sources
6. **One event ≠ event aggregator**