# KINN AI Events Widget - Minimal Implementation Plan

## Design Philosophy (Jony Ive Principles)
- **Invisibility**: The widget doesn't announce itself, it simply exists where needed
- **Clarity**: Information hierarchy through typography alone, no decorative elements
- **Breathing Room**: Generous whitespace, nothing feels cramped
- **Purposeful Animation**: Only micro-interactions that provide feedback

## Location & Access
- **Where**: Post-login landing page (`/dashboard` or `/home`)
- **When**: After successful email confirmation/login
- **Visibility**: Subtle presence, not competing for attention

## Visual Design

### Layout Structure
```
┌─────────────────────────────────────┐
│ Kommende AI Events                  │  <- Small, grey text (0.75rem)
│                                      │
│ 11. Dez · 18:00                    │  <- Date/time in light grey
│ KI im Projektmanagement             │  <- Event title, regular weight
│ Online                              │  <- Location, smallest text
│ ─────────────────                   │  <- Hairline separator
│                                      │
│ 15. Dez · 19:00                    │
│ Machine Learning Meetup             │
│ InnCubator                          │
│ ─────────────────                   │
│                                      │
│ + 3 weitere Events →                │  <- Subtle link to full calendar
└─────────────────────────────────────┘
```

### Typography & Colors
```css
.ai-events-widget {
  font-family: 'Work Sans', system-ui;
  background: transparent; /* No background */
  border: none; /* No borders */
  padding: 0;
}

.widget-title {
  font-size: 0.75rem;
  font-weight: 400;
  color: #6B7280; /* Neutral 500 */
  letter-spacing: 0.025em;
  text-transform: uppercase;
  margin-bottom: 1rem;
}

.event-date {
  font-size: 0.875rem;
  color: #9CA3AF; /* Neutral 400 */
}

.event-title {
  font-size: 1rem;
  color: #1F2937; /* Neutral 800 */
  margin: 0.125rem 0;
}

.event-location {
  font-size: 0.8125rem;
  color: #9CA3AF;
}

.separator {
  border: none;
  border-top: 1px solid #F3F4F6; /* Barely visible */
  margin: 0.75rem 0;
}
```

## Interaction Design

### Hover States
```css
.event-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.event-item:hover .event-title {
  color: #5ED9A6; /* KINN Mint, very subtle */
}
```

### Click Behavior
- **Primary Click**: Opens event detail in modal overlay (not new page)
- **Modal Design**: Blurred background, centered card, escape to close
- **Registration**: Single button "Anmelden" that adds to calendar

## Data Flow

### 1. Data Source
```javascript
// Fetch from RADAR Redis cache
const events = await kv.zrange('radar:events:ai:upcoming', 0, 4);
```

### 2. Widget Component
```html
<aside id="ai-events-widget" role="complementary" aria-label="Upcoming AI Events">
  <!-- Rendered by JavaScript, progressive enhancement -->
</aside>
```

### 3. Progressive Enhancement
```javascript
// Only load if user has confirmed subscription
if (user.preferences?.showAIEvents !== false) {
  loadAIEventsWidget();
}
```

## Implementation Steps

### Phase 1: Backend Preparation (Day 1)
1. Create `/api/events/upcoming-ai` endpoint
2. Filter: category="AI", date >= today, limit 5
3. Cache for 1 hour to reduce Redis calls
4. Return minimal JSON (no descriptions)

### Phase 2: Frontend Integration (Day 2)
1. Add widget container to dashboard HTML
2. Implement fetch on page load (after auth check)
3. Simple DOM manipulation, no framework needed
4. LocalStorage cache with 15-minute TTL

### Phase 3: Interactions (Day 3)
1. Click handler for event items
2. Modal overlay with event details
3. "Add to Calendar" generates .ics download
4. Analytics event tracking (optional)

### Phase 4: Polish (Day 4)
1. Loading state: Three grey skeleton lines
2. Empty state: "Keine AI Events diese Woche"
3. Error state: Silent fail, widget doesn't appear
4. Responsive: Stack on mobile, side-by-side on desktop

## Technical Implementation

### HTML Structure
```html
<aside class="ai-events-widget">
  <h3 class="widget-title">Kommende AI Events</h3>
  <div class="events-list">
    <article class="event-item" data-event-id="...">
      <time class="event-date">11. Dez · 18:00</time>
      <h4 class="event-title">KI im Projektmanagement</h4>
      <span class="event-location">Online</span>
    </article>
    <hr class="separator" />
    <!-- More events -->
  </div>
  <a href="/radar" class="more-link">+ 3 weitere Events →</a>
</aside>
```

### JavaScript (Vanilla, No Dependencies)
```javascript
class AIEventsWidget {
  constructor(container) {
    this.container = container;
    this.cache = this.getCache();
  }

  async load() {
    // Check cache first
    if (this.cache && this.cache.expires > Date.now()) {
      return this.render(this.cache.data);
    }

    // Fetch fresh data
    try {
      const res = await fetch('/api/events/upcoming-ai');
      const data = await res.json();
      this.setCache(data);
      this.render(data);
    } catch {
      // Silent fail - widget doesn't appear
      this.container.style.display = 'none';
    }
  }

  render(events) {
    if (!events.length) {
      this.container.innerHTML = '<p class="empty">Keine AI Events diese Woche</p>';
      return;
    }

    // Build HTML without framework
    const html = events.map(e => `
      <article class="event-item" data-event-id="${e.id}">
        <time>${this.formatDate(e.date)} · ${e.time}</time>
        <h4>${e.title}</h4>
        <span>${e.location}</span>
      </article>
    `).join('<hr class="separator" />');

    this.container.querySelector('.events-list').innerHTML = html;
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = ['Jan','Feb','Mär','Apr','Mai','Jun',
                   'Jul','Aug','Sep','Okt','Nov','Dez'][date.getMonth()];
    return `${day}. ${month}`;
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const widget = document.getElementById('ai-events-widget');
  if (widget && window.userAuthenticated) {
    new AIEventsWidget(widget).load();
  }
});
```

## Performance Optimizations

### Loading Strategy
1. **Inline Critical CSS**: Widget styles in <head>
2. **Defer JavaScript**: Load widget after page render
3. **Request Timing**: Parallel with other dashboard data
4. **Image-free**: No icons, pure typography

### Bundle Size
- Widget CSS: ~1KB
- Widget JS: ~2KB
- Total overhead: <3KB gzipped

## Accessibility

### ARIA Labels
```html
<aside role="complementary" aria-label="Upcoming AI Events">
  <article role="article" aria-label="Event: KI im Projektmanagement">
```

### Keyboard Navigation
- Tab through events
- Enter to open detail
- Escape to close modal
- Focus trap in modal

### Screen Reader Announcements
- "3 upcoming AI events this week"
- Event details read in logical order
- Registration status announced

## Success Metrics

### Engagement
- Click-through rate to events: Target 15%
- Calendar adds per week: Target 10+
- Widget dismissal rate: <5%

### Performance
- Time to render: <100ms
- Cache hit rate: >80%
- Failed loads: <1%

### User Feedback
- "Helpful but not intrusive"
- "I actually use this"
- "Didn't notice it was there" (positive)

## Rollout Strategy

### Phase 1: Beta (Week 1)
- 10% of logged-in users
- A/B test: with/without widget
- Measure: CTR, dismissals, feedback

### Phase 2: Gradual (Week 2-3)
- Increase to 50% of users
- Add preference toggle in settings
- Monitor performance impact

### Phase 3: Full Launch (Week 4)
- 100% of authenticated users
- Default: on, can disable
- Add to mobile app (if exists)

## Anti-Patterns to Avoid

❌ **No badges/counts** - Not "3 NEW!"
❌ **No animations** - Except micro-interactions
❌ **No colors** - Except subtle hover states
❌ **No icons** - Typography only
❌ **No borders/shadows** - Clean edges
❌ **No "View All" button** - Subtle text link
❌ **No auto-refresh** - Only on page load
❌ **No notifications** - Widget is passive

## Jony Ive Checklist

✓ **Can we remove anything else?** - Constantly asking
✓ **Does it feel inevitable?** - Like it was always there
✓ **Is it humble?** - Doesn't shout for attention
✓ **Does it respect the user?** - No dark patterns
✓ **Is it honest?** - Shows what it is, nothing more
✓ **Is it timeless?** - Will look good in 5 years

## Code Location

```
/components/
  AIEventsWidget.js       # Widget class
  AIEventsWidget.css      # Styles (or inline)

/api/events/
  upcoming-ai.js          # API endpoint

/pages/dashboard.html
  <!-- Widget injection point -->

/tests/
  ai-events-widget.test.js
```

## Example API Response

```json
{
  "events": [
    {
      "id": "ki-projektmanagement-2025-12-11",
      "title": "KI im Projektmanagement",
      "date": "2025-12-11",
      "time": "18:00",
      "location": "Online",
      "registrationUrl": "https://..."
    }
  ],
  "total": 5,
  "moreUrl": "/radar?category=AI"
}
```

## Final Notes

This widget embodies the principle of "so simple it seems obvious in retrospect." It doesn't try to be clever or impressive. It simply shows you what's coming up, and gets out of the way.

The highest compliment would be users saying: "Oh, that little events thing? Yeah, I use it all the time. Didn't really notice when it appeared, it just feels like it was always there."

**That's when we know we've succeeded.**