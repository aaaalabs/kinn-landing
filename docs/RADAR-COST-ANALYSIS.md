# KINN-RADAR Cost Analysis - Firecrawl Integration

## Firecrawl Pricing (as of Dec 2024)

### Pricing Tiers
- **Free Tier**: 500 credits/month
- **Hobby**: $19/month - 3,000 credits
- **Standard**: $99/month - 100,000 credits
- **Growth**: $499/month - 500,000 credits

**1 scrape = 1 credit** (regardless of page complexity)

## KINN-RADAR Source Inventory

### Active Sources (Currently Extracting)
| Source | Frequency | Monthly Scrapes |
|--------|-----------|-----------------|
| InnCubator | Daily | 30 |
| Startup.Tirol | Daily | 30 |
| WKO Tirol | Daily | 30 |
| AI Austria | Daily | 30 |
| Standortagentur Tirol | Daily | 30 |
| Uni Innsbruck | Daily | 30 |
| LSZ | Weekly | 4 |
| Innsbruck.info | Weekly | 4 |
| Congress Messe Innsbruck | Weekly | 4 |
| Die Bäckerei | Daily | 30 |

**Active Total: ~222 scrapes/month**

### Inactive Sources (Ready to activate)
| Source | Potential Frequency | Monthly Scrapes |
|--------|-------------------|-----------------|
| Impact Hub Tirol | Daily | 30 |
| MCI | Daily | 30 |
| FH Kufstein | Weekly | 4 |
| Werkstätte Wattens | Weekly | 4 |
| Coworking Tirol | Weekly | 4 |
| Meetup Innsbruck | Daily | 30 |
| Engineering Kiosk Alps | Weekly | 4 |
| Das Wundervoll | Weekly | 4 |
| WeLocally Innsbruck | Daily | 30 |
| DIH West | Weekly | 4 |

**Inactive Total: ~144 scrapes/month**

## Cost Scenarios

### Scenario 1: Current Active Sources Only
- **Monthly scrapes**: 222
- **Cost**: **FREE** (under 500 credit free tier) ✅

### Scenario 2: All Sources Active
- **Monthly scrapes**: 366 (222 + 144)
- **Cost**: **FREE** (still under 500 credit free tier) ✅

### Scenario 3: Increased Frequency (2x daily for critical sources)
- High-priority sources 2x daily: 10 sources × 60 = 600
- Others weekly: 10 sources × 4 = 40
- **Total**: 640 scrapes/month
- **Cost**: $19/month (Hobby tier needed)

### Scenario 4: Add Monitoring + Retries
- All sources with retries (1.5x factor): 366 × 1.5 = 549
- **Cost**: $19/month (Hobby tier for buffer)

## Cost Comparison

| Method | Setup Cost | Monthly Cost | Reliability | JS Support |
|--------|------------|--------------|-------------|------------|
| **Firecrawl (Current)** | $0 | $0-19 | High | ✅ Yes |
| **Puppeteer (Self-hosted)** | ~$20 VPS | $20-40 | Medium | ✅ Yes |
| **Simple Fetch (Previous)** | $0 | $0 | Low | ❌ No |
| **ScrapingBee Alternative** | $0 | $49+ | High | ✅ Yes |
| **Browserless Alternative** | $0 | $50+ | High | ✅ Yes |

## Optimization Strategies

### 1. Smart Scheduling
```javascript
const SCHEDULE = {
  'HIGH_PRIORITY': 'daily',      // 30/month
  'MEDIUM_PRIORITY': '3x/week',   // 12/month
  'LOW_PRIORITY': 'weekly',       // 4/month
  'INACTIVE': 'monthly'           // 1/month
};
```

### 2. Conditional Extraction
- Skip extraction if source hasn't updated (check last-modified header)
- Cache results for 6-12 hours minimum
- Bulk extract during off-peak (better for sources)

### 3. Hybrid Approach
```javascript
// Use Firecrawl only for JavaScript sites
const NEEDS_FIRECRAWL = [
  'InnCubator',      // Angular SPA
  'Impact Hub',      // Dynamic filters
  'Meetup',          // React app
];

// Use simple fetch for static sites (save credits)
const STATIC_SITES = [
  'WKO Tirol',       // Static with params
  'Uni Innsbruck',   // Server-rendered
  'Congress Messe',  // Static HTML
];
```

### 4. Credit Usage Monitoring
```javascript
// Track credit usage
const tracking = {
  daily_budget: 16,  // 500/30 days
  used_today: 0,
  remaining: 500,
  alert_threshold: 400
};
```

## ROI Analysis

### Value Generated
- **Manual extraction time**: 2 min/source × 20 sources = 40 min/day
- **Human cost**: 40 min × 30 days = 20 hours/month
- **Value**: 20 hours × €50/hour = **€1,000/month saved**

### Firecrawl Cost
- **Current**: €0/month (free tier)
- **Maximum**: €17/month ($19 Hobby tier)

### ROI
- **Return**: €1,000 saved
- **Cost**: €0-17
- **ROI**: **5,882% to ∞**

## Recommendations

### Immediate (Now)
1. ✅ **Stay on FREE tier** - Current usage fits comfortably
2. ✅ **Activate high-value sources** first (Impact Hub, Meetup)
3. ✅ **Monitor credit usage** via Firecrawl dashboard

### Short-term (1-3 months)
1. **Implement smart scheduling** based on source update patterns
2. **Add caching layer** to reduce redundant scrapes
3. **Track event yield** per source (optimize low-performers)

### Long-term (3-6 months)
1. **Consider hybrid approach** if approaching limits
2. **Negotiate enterprise pricing** if scaling beyond hobby
3. **Build fallback system** (own Puppeteer instance)

## Cost Summary

| Period | Sources | Scrapes | Tier | Cost |
|--------|---------|---------|------|------|
| **Now** | 10 active | ~222/mo | Free | **€0** ✅ |
| **+3 months** | 20 active | ~366/mo | Free | **€0** ✅ |
| **+6 months** | All + 2x | ~640/mo | Hobby | **€17/mo** |
| **Scale** | 50+ sources | 2000+/mo | Standard | **€89/mo** |

## Conclusion

**Current situation: ZERO COST** ✅
- 222 scrapes/month = well under 500 free credits
- Can activate ALL sources and stay free
- Even with retries, still under free tier

**Break-even point**:
- At 500+ scrapes/month → $19/month
- Still 52x cheaper than manual work
- Massive ROI even at paid tiers

**Recommendation**:
Use Firecrawl for everything now (it's FREE), optimize later if needed!