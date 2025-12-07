# KINN-RADAR Extraction Methods Documentation

## Overview

KINN-RADAR uses multiple extraction methods to handle different types of websites, from simple static HTML to complex JavaScript-rendered SPAs. This document explains each method and when to use them.

## Extraction Methods Comparison

| Method | Endpoint | Best For | JavaScript Support | Cost | Speed |
|--------|----------|----------|-------------------|------|--------|
| **Dynamic** | `/api/radar/extract-dynamic` | Static HTML sites | ❌ No | Free | Fast (1-2s) |
| **Firecrawl** | `/api/radar/extract-firecrawl` | SPAs (Angular, React) | ✅ Yes | Paid API | Medium (3-5s) |
| **With Config** | `/api/radar/extract-with-config` | Known patterns | ❌ No | Free | Fast (1-2s) |

## Method 1: Dynamic Extraction (Default)

**Endpoint:** `/api/radar/extract-dynamic`

### How it Works
1. Fetches HTML from the target URL
2. Checks Google Sheets for extraction patterns (columns J, K, L)
3. Falls back to `source-configs.js` if not in Google Sheets
4. Uses Groq AI to extract events based on patterns

### Configuration Priority
1. **Google Sheets** (Primary) - Columns in Sources tab:
   - Column J: HTML Pattern/Selector
   - Column K: Date Format
   - Column L: Extract Notes
2. **source-configs.js** (Fallback) - Hardcoded patterns

### Best For
- Static websites
- Server-rendered pages
- Sites where events are in initial HTML

### Example Sources
- WKO Tirol (with ?bundesland=T parameter)
- Uni Innsbruck
- Congress Messe Innsbruck

## Method 2: Firecrawl Extraction (JavaScript Support)

**Endpoint:** `/api/radar/extract-firecrawl`

### How it Works
1. Uses Firecrawl API to render JavaScript
2. Waits for dynamic content to load
3. Extracts clean HTML/Markdown
4. Uses Groq AI to parse events

### Requirements
- `FIRECRAWL_API_KEY` environment variable
- Firecrawl account (https://firecrawl.dev)

### Best For
- Single Page Applications (SPAs)
- Angular, React, Vue sites
- Dynamic content loaded via JavaScript
- Sites with lazy loading

### Example Sources
- **InnCubator** (Angular SPA)
- **Impact Hub Tirol** (Dynamic filters)
- **Meetup Innsbruck** (React app)

### Firecrawl Features
```javascript
{
  formats: ['html', 'markdown'],
  waitFor: 3000,  // Wait 3s for JS
  onlyMainContent: false,
  includeTags: ['article', 'div', 'section'],
  removeSelectors: ['script', 'nav', 'footer']
}
```

## Method 3: Config-Based Extraction

**Endpoint:** `/api/radar/extract-with-config`

Uses patterns directly from `source-configs.js` without Google Sheets integration.

## Source Configuration Examples

### Static Site (WKO Tirol)
```javascript
'WKO Tirol': {
  url: 'https://www.wko.at/veranstaltungen/start?bundesland=T',
  active: true,
  extraction: {
    method: 'custom',
    htmlPattern: 'li.col-md-6.col-lg-4 div.card.card-eventbox',
    dateFormat: 'Weekday DD Month (e.g., Mi 10 Dez)',
    extractNotes: 'MUST use ?bundesland=T parameter'
  }
}
```

### SPA Site (InnCubator)
```javascript
'InnCubator': {
  url: 'https://www.inncubator.at/events',
  active: true,
  extraction: {
    method: 'dynamic-spa',
    requiresJS: true,
    htmlPattern: 'article.event-item',
    dateFormat: 'Weekday DD.MM in separate spans',
    extractNotes: 'Angular SPA - needs JS execution'
  }
}
```

## Event Extraction Patterns

### InnCubator (Verified)
- Container: `article.event-item`
- Weekday: `span.event-weekday`
- Date: `span.event-day` (DD.MM format)
- Year: `span.event-year`
- Title: `h2.event-title`
- Time: Table row with "Uhrzeit"
- Location: Table row with "Ort"
- Price: Table row with "Preis" (must be "kostenlos")

### WKO Tirol (Verified)
- Container: `li.col-md-6.col-lg-4 div.card.card-eventbox`
- Date: Three separate `dd` elements
- Title: `h4` element
- Location: After pin icon (bi-geo-alt-fill)
- Link: `a.stretched-link`

## AI Extraction Rules

All methods use these rules for Groq AI:

1. **FREE Events Only**
   - Include: "kostenlos", "gratis", no price mentioned
   - Exclude: "siehe Website", "€XX", ticket prices

2. **Date Conversion**
   - Convert to YYYY-MM-DD format
   - Handle German dates (Jänner, Februar, etc.)
   - Parse weekday abbreviations (Mi, Do, Fr)

3. **Time Format**
   - Use 24-hour format (HH:MM)
   - Default to 18:00 if not specified

4. **Location**
   - Default city to "Innsbruck" if in Tirol
   - Include online events

5. **Categories**
   - AI, Tech, Startup, Innovation
   - Business, Education, Workshop, Other

## Testing Endpoints

### Test Pages
1. **Dynamic Test**: `/test-dynamic-extraction.html`
2. **Firecrawl Test**: `/test-firecrawl.html`
3. **Config Test**: `/test-source-configs.html`

### Test Mode
All endpoints support `testMode: true` parameter for debugging:
```javascript
{
  sourceName: "InnCubator",
  testMode: true
}
```

## Troubleshooting

### Common Issues

#### "0 Events Found" for SPAs
- **Cause**: JavaScript not executed
- **Solution**: Use Firecrawl endpoint
- **Check**: View page source - if events missing, needs JS

#### "Source not found"
- **Cause**: Source not in Google Sheets or configs
- **Solution**: Add to `source-configs.js` or Google Sheets

#### "FIRECRAWL_API_KEY not configured"
- **Solution**: Add key to Vercel environment variables
- **Get key**: https://firecrawl.dev/dashboard

#### WKO Tirol Returns Nothing
- **Cause**: Missing Tirol filter
- **Solution**: Use `?bundesland=T` parameter

## Performance Optimization

### Caching Strategy
- Redis/KV storage for events
- Duplicate detection by event key
- Metrics tracking per source

### Rate Limiting
- Firecrawl: Follow API limits
- Groq: 3-5 requests per second
- Source sites: Respect robots.txt

## Environment Variables Required

```bash
# Upstash Redis (with KINNST_ prefix)
KINNST_KV_REST_API_URL=https://...upstash.io
KINNST_KV_REST_API_TOKEN=...

# AI Processing
RADAR_GROQ_API_KEY=gsk_...

# Admin Access
RADAR_ADMIN_TOKEN=...

# Google Sheets Integration
RADAR_GOOGLE_SHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_KEY={...}

# Firecrawl (for SPAs)
FIRECRAWL_API_KEY=fc_...
```

## Future Improvements

1. **Puppeteer/Playwright Integration**
   - Self-hosted JavaScript rendering
   - No API costs
   - Full control over wait conditions

2. **API Discovery**
   - Automatically find API endpoints
   - Direct API access (faster than scraping)

3. **Smart Scheduling**
   - Different frequencies per source
   - Respect update patterns

4. **ML Pattern Learning**
   - Learn extraction patterns from examples
   - Auto-adapt to site changes

## Summary

- **Static sites**: Use Dynamic extraction
- **SPAs/JS sites**: Use Firecrawl extraction
- **Known patterns**: Configure in source-configs.js
- **Collaborative**: Use Google Sheets for team pattern development
- **Always**: Extract only FREE events for KINN community!