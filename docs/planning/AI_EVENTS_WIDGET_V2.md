# KINN AI Events Widget V2 - Enhanced Implementation Plan

## Executive Summary

Evolution of the minimal events widget to include infinite scroll, admin curation workflow, and intelligent visibility rules. Maintains Jony Ive aesthetic while adding sophisticated functionality under the hood.

## Core Enhancements Over V1

### 1. Infinite Scroll with Fixed Height
- **Container**: Max height of 420px (golden ratio from width)
- **Initial Load**: 3 events visible without scrolling
- **Lazy Loading**: Next 5 events at 80% scroll threshold
- **Virtual Scrolling**: For performance when >20 events
- **Scroll Behavior**: Smooth, momentum-based, native feel

### 2. Smart Event Ordering
- **Primary Sort**: Temporal proximity (closest to now first)
- **Secondary Sort**: Relevance score (based on user preferences)
- **Tertiary Sort**: RSVP count (social proof)

### 3. Admin Curation Dashboard
- **Event Sources**: AI, Startup, Network, Workshop, Tech Talks
- **Approval Queue**: Pending events with preview
- **Bulk Actions**: Approve/Reject/Edit multiple events
- **Quality Scoring**: Auto-calculate relevance to KINN community

### 4. Visibility Threshold Rules
- **Minimum Events**: Widget only loads if ≥2 approved upcoming events
- **Maximum Age**: Hide events >30 days old
- **User Context**: Show based on login status and preferences

## Technical Architecture

### Data Flow
```
Event Sources → Ingestion → Curation Queue → Admin Approval → Redis Cache → Widget Display
     ↑              ↓             ↓              ↓              ↓            ↓
   RADAR      Auto-categorize  Preview    Quality Score   Approved Set  User Widget
```

### Redis Structure (Enhanced)
```javascript
// Pending events (awaiting approval)
Key: 'radar:events:pending'
Type: ZSET (sorted by ingest_time)
Value: {
  id: string,
  title: string,
  date: ISO8601,
  category: 'ai' | 'startup' | 'network' | 'workshop' | 'tech',
  source: string,
  relevanceScore: 0-100,
  suggestedTags: string[],
  autoApprove: boolean
}

// Approved events (visible to users)
Key: 'radar:events:approved'
Type: ZSET (sorted by event_date)
Value: {
  ...pendingEventFields,
  approvedBy: string,
  approvedAt: ISO8601,
  rsvpCount: number,
  viewCount: number
}

// User preferences for filtering
Key: 'user:preferences:{email}'
Value: {
  categories: string[],  // ['ai', 'startup']
  maxDistance: number,   // km from Innsbruck
  preferredDays: string[], // ['thursday', 'friday']
  hideOnlineEvents: boolean
}

// Event metrics for sorting
Key: 'radar:events:metrics:{eventId}'
Value: {
  views: number,
  clicks: number,
  rsvps: number,
  shares: number
}
```

## UI Components

### User Widget (420px height)
```html
<aside class="ai-events-widget" data-max-height="420">
  <h3 class="widget-title">Kommende Events</h3>

  <!-- Scrollable container with virtual scrolling -->
  <div class="events-scroll-container">
    <div class="events-viewport" style="height: 380px; overflow-y: auto;">
      <div class="events-content" style="transform: translateY(0px);">

        <!-- Initial 3 visible events -->
        <article class="event-item visible" data-proximity="2h">
          <time class="event-proximity">In 2 Stunden</time>
          <h4 class="event-title">KI im Projektmanagement</h4>
          <span class="event-meta">AI · Online · 47 dabei</span>
        </article>

        <!-- Lazy loaded events (hidden initially) -->
        <div class="lazy-load-trigger" data-page="2"></div>

        <!-- Loading skeleton -->
        <div class="event-skeleton" style="display: none;">
          <div class="skeleton-time"></div>
          <div class="skeleton-title"></div>
          <div class="skeleton-meta"></div>
        </div>

      </div>
    </div>

    <!-- Subtle scroll indicator -->
    <div class="scroll-hint" aria-hidden="true">
      <span class="scroll-arrow">↓</span>
    </div>
  </div>

  <!-- Only show if user has preferences set -->
  <a href="/events/preferences" class="preferences-link">Anpassen →</a>
</aside>
```

### Admin Dashboard
```html
<section class="admin-events-curation">
  <header class="curation-header">
    <h2>Event Curation Queue</h2>
    <div class="curation-stats">
      <span>23 pending</span>
      <span>156 approved</span>
      <span>89% auto-approval rate</span>
    </div>
  </header>

  <!-- Filters -->
  <div class="curation-filters">
    <button class="filter-chip active">All</button>
    <button class="filter-chip">AI</button>
    <button class="filter-chip">Startup</button>
    <button class="filter-chip">Network</button>
    <button class="filter-chip">Workshop</button>
  </div>

  <!-- Pending events list -->
  <div class="pending-events">
    <article class="pending-event">
      <div class="event-preview">
        <h3>Machine Learning Meetup</h3>
        <time>15. Dez · 19:00</time>
        <span class="event-source">via meetup.com</span>
      </div>

      <div class="event-metadata">
        <div class="relevance-score">
          <span>Relevance: 87%</span>
          <div class="score-breakdown">
            <span>+30 AI keyword match</span>
            <span>+25 Local venue</span>
            <span>+20 Community interest</span>
            <span>+12 Past attendance</span>
          </div>
        </div>

        <div class="suggested-tags">
          <span class="tag">machine-learning</span>
          <span class="tag">python</span>
          <span class="tag">innsbruck</span>
        </div>
      </div>

      <div class="curation-actions">
        <button class="btn-approve">Approve</button>
        <button class="btn-edit">Edit</button>
        <button class="btn-reject">Reject</button>
      </div>
    </article>
  </div>

  <!-- Bulk actions -->
  <div class="bulk-actions">
    <button class="btn-select-all">Select All</button>
    <button class="btn-approve-selected">Approve Selected</button>
    <button class="btn-auto-approve">
      Enable Auto-Approve (Score >85)
    </button>
  </div>
</section>
```

## Implementation Details

### Infinite Scroll Logic
```javascript
class InfiniteScrollWidget {
  constructor(container) {
    this.container = container;
    this.viewport = container.querySelector('.events-viewport');
    this.content = container.querySelector('.events-content');
    this.page = 1;
    this.loading = false;
    this.hasMore = true;

    this.setupIntersectionObserver();
    this.setupVirtualScroll();
  }

  setupIntersectionObserver() {
    const options = {
      root: this.viewport,
      rootMargin: '100px', // Load 100px before bottom
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.loading && this.hasMore) {
          this.loadMoreEvents();
        }
      });
    }, options);

    // Observe the trigger element
    const trigger = this.content.querySelector('.lazy-load-trigger');
    if (trigger) this.observer.observe(trigger);
  }

  async loadMoreEvents() {
    this.loading = true;
    this.showSkeleton();

    try {
      const res = await fetch(`/api/events/upcoming?page=${this.page + 1}&limit=5`);
      const data = await res.json();

      if (data.events.length > 0) {
        this.renderEvents(data.events);
        this.page++;
        this.hasMore = data.hasMore;
      } else {
        this.hasMore = false;
      }
    } finally {
      this.hideSkeleton();
      this.loading = false;
    }
  }

  setupVirtualScroll() {
    // Only activate for >20 events
    if (this.totalEvents > 20) {
      this.virtualScroller = new VirtualScroller({
        container: this.viewport,
        itemHeight: 72, // Fixed height per event
        buffer: 5 // Render 5 extra items outside viewport
      });
    }
  }

  calculateProximity(eventDate) {
    const now = new Date();
    const event = new Date(eventDate);
    const hours = Math.floor((event - now) / (1000 * 60 * 60));

    if (hours < 1) return 'Jetzt';
    if (hours < 24) return `In ${hours} Stunden`;
    if (hours < 48) return 'Morgen';
    if (hours < 168) return `In ${Math.floor(hours / 24)} Tagen`;
    return event.toLocaleDateString('de-AT', { day: 'numeric', month: 'short' });
  }
}
```

### Admin Curation API

```javascript
// GET /api/admin/events/pending
{
  events: [
    {
      id: 'meetup-ml-2025-12',
      title: 'Machine Learning Meetup',
      date: '2025-12-15T19:00:00Z',
      category: 'ai',
      source: 'meetup.com',
      relevanceScore: 87,
      scoreBreakdown: {
        keywordMatch: 30,
        localVenue: 25,
        communityInterest: 20,
        pastAttendance: 12
      },
      suggestedTags: ['machine-learning', 'python', 'innsbruck'],
      autoApprove: true
    }
  ],
  stats: {
    pending: 23,
    approved: 156,
    autoApprovalRate: 0.89
  }
}

// POST /api/admin/events/approve
{
  eventIds: ['meetup-ml-2025-12', 'startup-pitch-2025-12'],
  tags: ['featured'], // Optional override tags
  notify: true // Send notification to subscribers
}

// POST /api/admin/events/auto-approve-rules
{
  minScore: 85,
  categories: ['ai', 'tech'],
  requiredTags: ['innsbruck'],
  excludeSources: ['facebook.com'] // Untrusted sources
}
```

## Visibility & Loading Rules

### Widget Display Conditions
```javascript
function shouldShowWidget(user, events) {
  // Check minimum event threshold
  const upcomingApproved = events.filter(e =>
    e.status === 'approved' &&
    new Date(e.date) > new Date()
  );

  if (upcomingApproved.length < 2) {
    return false; // Not enough events
  }

  // Check user context
  if (!user.isAuthenticated) {
    return false; // Only for logged-in users
  }

  // Check user preferences
  if (user.preferences?.hideEventsWidget) {
    return false; // User opted out
  }

  // Check time relevance (no events in next 30 days)
  const hasNearEvents = upcomingApproved.some(e => {
    const daysDiff = (new Date(e.date) - new Date()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  });

  return hasNearEvents;
}
```

### Progressive Loading Strategy
```javascript
class EventWidgetLoader {
  constructor() {
    this.loadingStates = {
      IDLE: 'idle',
      CHECKING: 'checking',
      LOADING: 'loading',
      READY: 'ready',
      HIDDEN: 'hidden'
    };
    this.state = this.loadingStates.IDLE;
  }

  async initialize() {
    this.setState(this.loadingStates.CHECKING);

    // Quick check for minimum events
    const quickCheck = await this.quickEventCheck();
    if (quickCheck.count < 2) {
      this.setState(this.loadingStates.HIDDEN);
      return;
    }

    this.setState(this.loadingStates.LOADING);

    // Load initial events
    const initialEvents = await this.loadInitialEvents();
    this.renderWidget(initialEvents);

    this.setState(this.loadingStates.READY);

    // Preload next batch in background
    this.preloadNextBatch();
  }

  async quickEventCheck() {
    // Lightweight endpoint that just returns count
    const res = await fetch('/api/events/count?approved=true&upcoming=true');
    return res.json();
  }

  async loadInitialEvents() {
    const res = await fetch('/api/events/upcoming?limit=3&withMetrics=true');
    return res.json();
  }

  preloadNextBatch() {
    // Use requestIdleCallback for background loading
    requestIdleCallback(() => {
      fetch('/api/events/upcoming?page=2&limit=5')
        .then(res => res.json())
        .then(data => this.cacheEvents(data));
    });
  }
}
```

## Event Relevance Scoring

### Algorithm
```javascript
class EventRelevanceScorer {
  constructor(userPreferences) {
    this.preferences = userPreferences;
    this.weights = {
      categoryMatch: 30,
      temporalProximity: 25,
      communityInterest: 20,
      venueProximity: 15,
      historicalAttendance: 10
    };
  }

  score(event) {
    let score = 0;

    // Category match
    if (this.preferences.categories.includes(event.category)) {
      score += this.weights.categoryMatch;
    }

    // Temporal proximity (closer = higher score)
    const daysUntil = (new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24);
    if (daysUntil <= 7) score += this.weights.temporalProximity;
    else if (daysUntil <= 14) score += this.weights.temporalProximity * 0.5;

    // Community interest (based on RSVP/view metrics)
    const interestScore = (event.rsvpCount * 2 + event.viewCount) / 100;
    score += Math.min(interestScore, this.weights.communityInterest);

    // Venue proximity (for in-person events)
    if (event.type === 'in-person' && this.preferences.location) {
      const distance = this.calculateDistance(event.venue, this.preferences.location);
      if (distance <= 5) score += this.weights.venueProximity;
      else if (distance <= 15) score += this.weights.venueProximity * 0.5;
    }

    // Historical attendance (user attended similar events)
    if (this.userAttendedSimilar(event)) {
      score += this.weights.historicalAttendance;
    }

    return Math.min(score, 100); // Cap at 100
  }
}
```

## Performance Optimizations

### Caching Strategy
```javascript
// Multi-tier caching
const cacheStrategy = {
  // L1: Memory cache (instant, 5 min TTL)
  memory: new Map(),

  // L2: LocalStorage (fast, 15 min TTL)
  local: {
    get: (key) => {
      const item = localStorage.getItem(key);
      if (!item) return null;
      const { data, expires } = JSON.parse(item);
      if (Date.now() > expires) {
        localStorage.removeItem(key);
        return null;
      }
      return data;
    },
    set: (key, data, ttl = 900000) => {
      localStorage.setItem(key, JSON.stringify({
        data,
        expires: Date.now() + ttl
      }));
    }
  },

  // L3: Service Worker cache (offline support)
  sw: {
    cache: 'events-v1',
    strategy: 'network-first'
  }
};
```

### Request Deduplication
```javascript
class RequestDeduplicator {
  constructor() {
    this.pending = new Map();
  }

  async fetch(url, options) {
    const key = `${url}-${JSON.stringify(options)}`;

    // Return existing promise if request in flight
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    // Create new request promise
    const promise = fetch(url, options)
      .finally(() => this.pending.delete(key));

    this.pending.set(key, promise);
    return promise;
  }
}
```

## Accessibility Enhancements

### ARIA Live Regions
```html
<!-- Announce new events as they load -->
<div class="sr-only" aria-live="polite" aria-atomic="true">
  <span id="event-load-status">3 neue Events geladen</span>
</div>

<!-- Scroll position indicator for screen readers -->
<div class="sr-only" aria-live="polite">
  <span id="scroll-position">Event 4 von 23</span>
</div>
```

### Keyboard Navigation
```javascript
class KeyboardNavigation {
  constructor(widget) {
    this.widget = widget;
    this.currentIndex = 0;
    this.setupKeyListeners();
  }

  setupKeyListeners() {
    this.widget.addEventListener('keydown', (e) => {
      switch(e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          this.navigateNext();
          break;

        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          this.navigatePrev();
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          this.selectCurrent();
          break;

        case 'Home':
          e.preventDefault();
          this.navigateFirst();
          break;

        case 'End':
          e.preventDefault();
          this.navigateLast();
          break;
      }
    });
  }
}
```

## Monitoring & Analytics

### Widget Performance Metrics
```javascript
// Track widget performance
const metrics = {
  loadTime: 0,
  scrollDepth: 0,
  eventsViewed: [],
  eventsClicked: [],
  timeOnWidget: 0
};

// Send to analytics endpoint
function trackMetrics() {
  fetch('/api/analytics/widget', {
    method: 'POST',
    body: JSON.stringify({
      ...metrics,
      sessionId: getSessionId(),
      timestamp: new Date().toISOString()
    })
  });
}
```

### Admin Dashboard Metrics
- Approval rate by category
- Average relevance score trends
- Source reliability scores
- User engagement by event type
- RSVP conversion rates

## Migration Path

### Phase 1: Foundation (Week 1)
- [ ] Implement basic infinite scroll
- [ ] Add max-height container
- [ ] Sort by temporal proximity
- [ ] Test with 20+ events

### Phase 2: Curation (Week 2)
- [ ] Build admin approval dashboard
- [ ] Implement relevance scoring
- [ ] Add bulk approval actions
- [ ] Set up auto-approval rules

### Phase 3: Intelligence (Week 3)
- [ ] User preference learning
- [ ] Smart visibility thresholds
- [ ] Performance optimizations
- [ ] A/B testing framework

### Phase 4: Polish (Week 4)
- [ ] Virtual scrolling for large lists
- [ ] Accessibility enhancements
- [ ] Offline support
- [ ] Analytics integration

## Success Metrics

### User Engagement
- Widget load time: <100ms (p95)
- Scroll depth: >50% average
- Click-through rate: >20%
- Events per session: >5 viewed

### Admin Efficiency
- Curation time: <30s per event
- Auto-approval rate: >85%
- False positive rate: <5%
- Admin satisfaction: >8/10

### System Performance
- API response time: <50ms (p95)
- Cache hit rate: >90%
- Error rate: <0.1%
- Uptime: >99.9%

## Risk Mitigation

### Technical Risks
- **Infinite scroll performance**: Use virtual scrolling for large datasets
- **Cache invalidation**: Implement smart TTLs and event-based invalidation
- **API rate limits**: Request deduplication and intelligent prefetching

### UX Risks
- **Information overload**: Limit initial display, progressive disclosure
- **Scroll fatigue**: Show most relevant first, quality over quantity
- **Loading delays**: Skeleton screens, optimistic updates

### Business Risks
- **Low-quality events**: Strict curation, community reporting
- **Spam/duplicate events**: Deduplication algorithm, source reputation
- **Admin burnout**: High auto-approval rate, bulk actions

## Conclusion

This enhanced widget maintains the minimalist aesthetic while adding sophisticated functionality. The infinite scroll respects user attention, the admin dashboard enables quality control, and the visibility rules ensure relevance. By following Jony Ive's principle of "simplicity is the ultimate sophistication," we create a widget that feels inevitable yet delightful.