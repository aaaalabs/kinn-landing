# 🧠 KINN-RADAR Extraction Strategy: First Principles Approach

## Executive Summary
Moving from "hope it works" to "guaranteed extraction" through systematic pattern analysis and testing.

## 🎯 The Core Problem

**We're trying to extract structured data from unstructured sources.**

### What Makes This Hard:
1. **No standard format** - Every site is different
2. **Dynamic content** - JavaScript renders after page load
3. **Language mixing** - German/English terms for same concepts
4. **Price ambiguity** - "Free" expressed many ways

### What Makes This Possible:
1. **Events have patterns** - Date, title, location always present
2. **HTML has structure** - Even chaos has containers
3. **AI understands context** - Can interpret human-readable content
4. **We control extraction** - Can adapt to each source

## 📊 Current State Analysis

### Working Well (High Confidence)
- **InnCubator**: Clear Angular structure, consistent patterns
- **WKO Tirol**: Good HTML structure (with ?bundesland=T)
- **Startup.Tirol**: Has WordPress API endpoint

### Needs Investigation
- **AI Austria**: Unknown structure
- **Standortagentur Tirol**: Unknown structure
- **Impact Hub Tirol**: Dynamic JS filtering
- **University sites**: Likely have patterns but untested

### Known Challenges
- **Meetup**: Authentication required
- **Engineering Kiosk**: Only shows single next event
- **WeLocally**: Surface data only, needs deep crawl

## 🔬 The Pattern Discovery Framework

### Step 1: Human Extraction (Ground Truth)
For each source, manually identify:
```markdown
1. Go to URL
2. Find 3-5 events
3. Document:
   - Event Title (exact text)
   - Date (exact format shown)
   - Time (if visible)
   - Location (if visible)
   - Price indicator (what makes it free?)
```

### Step 2: HTML Pattern Analysis
```javascript
// For each event found by human:
1. Right-click → Inspect Element
2. Find the container that holds ALL event data
3. Document the hierarchy:
   - Container selector (e.g., article.event-item)
   - Title selector within container
   - Date selector(s) within container
   - Price/free indicator location
```

### Step 3: Pattern Validation
```javascript
// Test pattern extraction:
1. Use browser console:
   document.querySelectorAll('YOUR_CONTAINER_SELECTOR').length
   // Should match number of events you see

2. Extract first event:
   const event = document.querySelector('YOUR_CONTAINER_SELECTOR');
   const title = event.querySelector('YOUR_TITLE_SELECTOR')?.textContent;
   const date = event.querySelector('YOUR_DATE_SELECTOR')?.textContent;
   console.log({title, date});
```

## 🛠️ The Solution Architecture

### Three-Layer Extraction System

#### Layer 1: Pattern-Based (Fast, Specific)
```javascript
// For sources with consistent HTML
{
  container: 'article.event-item',
  selectors: {
    title: 'h2.event-title',
    date: 'span.event-date',
    location: 'div.venue'
  }
}
```

#### Layer 2: AI-Guided (Flexible, Adaptive)
```javascript
// For sources with variable structure
{
  instructions: `
    Look for event blocks containing:
    - A title (usually larger text)
    - A date (German or English format)
    - Optional: time, location, description
    - Extract if FREE or no price mentioned
  `
}
```

#### Layer 3: Hybrid (Best of Both)
```javascript
// Use patterns to find containers, AI to extract
{
  container: 'div.event', // Find all event blocks
  useAI: true,  // Let AI extract from each block
  context: 'University event listing'
}
```

## 📈 The Implementation Plan

### Phase 1: Discovery Sprint (2 hours)
```markdown
For each of 15 sources:
1. [ ] Open URL in browser
2. [ ] Find 2-3 example events
3. [ ] Inspect HTML structure
4. [ ] Document patterns found
5. [ ] Test with browser console
6. [ ] Rate complexity (1-5)
```

### Phase 2: Pattern Library (1 hour)
```javascript
// Build reusable patterns
const PATTERNS = {
  // Date patterns
  germanDate: /(\d{1,2})\.\s*(\w+)\s*(\d{4})?/,
  englishDate: /(\w+)\s+(\d{1,2}),?\s*(\d{4})?/,

  // Free indicators
  freeTerms: ['kostenlos', 'gratis', 'free', 'frei', 'keine kosten'],

  // Event types to include
  includedTypes: ['workshop', 'vortrag', 'seminar', 'meetup', 'stammtisch'],

  // Common containers
  containers: {
    wordpress: '.tribe-events-list-item',
    card: '.card, .event-card, .event-box',
    list: 'li.event, article.event',
    table: 'tr.event-row'
  }
};
```

### Phase 3: Source Configuration (1 hour)
```javascript
// Update source-configs.js with discovered patterns
'SourceName': {
  url: 'https://...',
  active: true,
  extraction: {
    method: 'pattern|ai|hybrid',
    container: 'selector',
    selectors: { /* if pattern-based */ },
    instructions: '/* if ai-based */',
    validation: {
      minEvents: 1,
      maxEvents: 50,
      requiredFields: ['title', 'date']
    }
  }
}
```

### Phase 4: Testing & Validation (1 hour)
```markdown
1. Run extraction for each source
2. Compare with manual ground truth
3. Calculate accuracy metrics:
   - Precision: correct events / total extracted
   - Recall: correct events / actual events
   - F1 Score: harmonic mean
4. Flag sources needing refinement
```

### Phase 5: Continuous Improvement
```markdown
Weekly:
- Review failed extractions
- Update patterns based on site changes
- Add new sources from community suggestions

Monthly:
- Full audit of all sources
- Pattern library updates
- Performance optimization
```

## 🎯 Success Metrics

### Minimum Viable Extraction
- **Title**: ✅ Required (any text)
- **Date**: ✅ Required (any format we can parse)
- **Free**: ✅ Required (explicit or implied)

### Good Extraction
- All of above plus:
- **Time**: ⭐ Bonus
- **Location**: ⭐ Bonus
- **Description**: ⭐ Bonus

### Perfect Extraction
- All of above plus:
- **Registration URL**: 🌟 Premium
- **Category**: 🌟 Premium
- **Capacity**: 🌟 Premium

## 🚀 Quick Wins Strategy

### Tier 1: Fix These First (High Impact, Low Effort)
1. **WKO Tirol**: Just needs ?bundesland=T parameter ✅
2. **InnCubator**: Already has patterns defined ✅
3. **Startup.Tirol**: Use WordPress API endpoint

### Tier 2: Pattern Discovery (Medium Effort, High Value)
1. **Uni Innsbruck**: Academic events, likely structured
2. **MCI**: Similar to uni, probably has patterns
3. **FH Kufstein**: Another academic source

### Tier 3: Complex Cases (High Effort)
1. **Impact Hub**: Dynamic JS filtering
2. **AI Austria**: Unknown structure
3. **Congress Messe**: Trade fairs, different format

### Tier 4: Consider Dropping
1. **Meetup**: Requires auth (not worth it?)
2. **Engineering Kiosk**: Only 1 event (low value)
3. **WeLocally**: Needs deep crawl (expensive)

## 💡 Key Insights

### Pattern Recognition Principles
1. **Events are lists** - Always in some container
2. **Dates are consistent** - Within a single site
3. **Free has signals** - Look for price fields
4. **Structure repeats** - Find one, find all

### Common Failure Modes
1. **Over-specific selectors** - .event-2024-december fails in January
2. **Under-specific patterns** - Matching non-events
3. **Language assumptions** - Hardcoding "kostenlos"
4. **Dynamic content** - Not waiting for JS

### Extraction Best Practices
1. **Start broad** - Find containers first
2. **Narrow down** - Then find fields within
3. **Handle missing** - Not all fields always present
4. **Validate output** - Sanity check dates/times
5. **Track changes** - Sites update, patterns break

## 📝 Action Items

### Immediate (Today)
1. ✅ Deploy audit dashboard
2. ⬜ Test all 15 sources with current extraction
3. ⬜ Document which ones return 0 events
4. ⬜ Prioritize fixes by impact

### This Week
1. ⬜ Fix Tier 1 sources (quick wins)
2. ⬜ Discover patterns for Tier 2
3. ⬜ Update source-configs.js with patterns
4. ⬜ Re-test and validate

### Next Week
1. ⬜ Tackle Tier 3 complex sources
2. ⬜ Build pattern library
3. ⬜ Create monitoring dashboard
4. ⬜ Document for community contributions

## 🎓 The Meta-Learning

**What we're really building:** Not just an event extractor, but a pattern discovery system that gets smarter over time.

**The real value:** Each pattern we discover makes the next source easier. The system becomes self-improving.

**The end goal:** Community-maintained pattern library where anyone can add a source by providing patterns.

## 🔮 Future Vision

### Self-Healing Extraction
```javascript
// When extraction fails:
1. System detects 0 events (unusual)
2. Triggers pattern re-discovery
3. Tests alternative selectors
4. Notifies admin if can't self-fix
5. Learns from manual fixes
```

### Community Pattern Sharing
```javascript
// Users can submit patterns:
{
  source: 'New Event Site',
  url: 'https://...',
  submittedBy: 'community-member',
  patterns: { /* discovered patterns */ },
  verified: false // Admin reviews
}
```

### Intelligent Deduplication
```javascript
// Smart matching across sources:
- Same event, different descriptions
- Fuzzy title matching
- Location normalization
- Time zone handling
```

---

## 📌 Remember: First Principles

1. **Events exist** - They're there, we just need to find them
2. **Patterns exist** - Humans can see them, so can machines
3. **Extraction is translation** - From visual to structured
4. **Perfect is enemy of good** - 80% accuracy ships, 100% never does
5. **Community scales** - Many eyes make patterns obvious

**The North Star:** Every FREE tech event in Tirol, automatically discovered and shared with the community.

**The Method:** Systematic pattern discovery + AI flexibility + Community verification

**The Result:** KINN-RADAR becomes the authoritative source for Tirol tech events.