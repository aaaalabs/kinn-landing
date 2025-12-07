# KINN-RADAR Admin Dashboard Concept

## Overview

A comprehensive admin dashboard for managing KINN-RADAR events, providing advanced features beyond Google Sheets for power users and automation workflows.

## Design Philosophy

Following KINN's SLC (Simple, Lovable, Complete) principles:
- **Simple**: Clean, focused interface with progressive disclosure
- **Lovable**: Smooth animations, instant feedback, keyboard shortcuts
- **Complete**: All event management features in one place

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   KINN-RADAR Admin Dashboard              │
├────────────────┬─────────────────┬──────────────────────┤
│   Event Grid   │  Event Details  │   Quick Actions      │
│                │                 │                      │
│  □ Select All  │  Title: ____    │  [+ New Event]      │
│  □ Event 1     │  Date: _____    │  [⚡ Quick Add]     │
│  □ Event 2     │  Time: _____    │  [📋 Bulk Import]  │
│  □ Event 3     │  Location: __   │  [🔄 Sync Now]     │
│                │                 │  [📊 Analytics]     │
├────────────────┴─────────────────┴──────────────────────┤
│                    Status Bar                            │
│  12 Active • 3 Draft • 2 Past • Last Sync: 2 min ago   │
└──────────────────────────────────────────────────────────┘
```

## Core Features

### 1. Event Management Grid

```typescript
interface EventGridFeatures {
  // Display
  columns: [
    'checkbox',      // Multi-select
    'status',       // Visual indicator
    'title',        // Sortable
    'date',         // Sortable
    'location',     // Filterable
    'source',       // Filterable
    'confidence',   // Sortable
    'actions'       // Edit/Delete/Duplicate
  ];

  // Interactions
  sorting: 'multi-column';
  filtering: 'advanced';
  grouping: 'by-date' | 'by-source' | 'by-location';
  pagination: 50; // items per page

  // Bulk Operations
  bulkActions: [
    'delete',
    'archive',
    'mark-reviewed',
    'export',
    'change-status'
  ];
}
```

### 2. Smart Event Editor

```html
<!-- Inline Editing Mode -->
<div class="event-editor">
  <div class="editor-header">
    <h3>Quick Edit: AI Workshop Innsbruck</h3>
    <button class="save-continue">Save & Next →</button>
  </div>

  <div class="editor-tabs">
    <button class="active">Essential</button>
    <button>Details</button>
    <button>Meta</button>
    <button>History</button>
  </div>

  <div class="editor-content">
    <!-- Essential Tab -->
    <div class="field-group">
      <input type="text" placeholder="Event Title" />
      <input type="date" />
      <input type="time" />
      <select>
        <option>Werkstätte Wattens</option>
        <option>SOWI Innsbruck</option>
        <option>Online</option>
      </select>
    </div>

    <!-- Smart Features -->
    <div class="ai-suggestions">
      <h4>🤖 AI Suggestions</h4>
      <ul>
        <li>Similar to "ML Workshop" on Jan 15</li>
        <li>Consider adding "Deep Learning" tag</li>
        <li>Venue typically holds 50 people</li>
      </ul>
    </div>
  </div>
</div>
```

### 3. Duplicate Detection System

```javascript
// Real-time duplicate checking
const DuplicateDetector = {
  checkStrategies: [
    'exact-title-date',      // Same title & date
    'fuzzy-title-match',     // Similar titles (85%+ match)
    'same-venue-time',       // Same location & time
    'description-similarity' // Content overlap
  ],

  ui: {
    highlight: 'yellow',
    icon: '⚠️',
    action: 'merge' | 'keep-both' | 'replace'
  }
};
```

### 4. Source Management Panel

```typescript
interface SourcePanel {
  sources: {
    name: string;
    type: 'newsletter' | 'website' | 'api' | 'manual';
    lastCheck: Date;
    eventsFound: number;
    successRate: number;
    status: 'active' | 'paused' | 'error';
    actions: ['pause', 'test', 'configure', 'delete'];
  }[];

  metrics: {
    totalSources: number;
    activeNow: number;
    eventsToday: number;
    avgConfidence: number;
  };
}
```

## UI Components

### 1. Main Dashboard (`/admin/radar`)

```jsx
// pages/admin/radar.jsx
import { useState, useEffect } from 'react';
import { EventGrid } from '@/components/EventGrid';
import { QuickActions } from '@/components/QuickActions';
import { StatusBar } from '@/components/StatusBar';

export default function RadarDashboard() {
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({});
  const [selectedEvents, setSelectedEvents] = useState([]);

  return (
    <div className="radar-dashboard">
      <header className="dashboard-header">
        <h1>KINN-RADAR Control Center</h1>
        <div className="header-actions">
          <button className="btn-sync">🔄 Sync</button>
          <button className="btn-add">+ Event</button>
          <input type="search" placeholder="Search events..." />
        </div>
      </header>

      <div className="dashboard-layout">
        <aside className="filters-panel">
          <FilterPanel
            onFilterChange={setFilters}
            eventCount={events.length}
          />
        </aside>

        <main className="content-area">
          <EventGrid
            events={events}
            filters={filters}
            onSelect={setSelectedEvents}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </main>

        <aside className="details-panel">
          {selectedEvents.length === 1 && (
            <EventDetails event={selectedEvents[0]} />
          )}
          {selectedEvents.length > 1 && (
            <BulkActions
              count={selectedEvents.length}
              onAction={handleBulkAction}
            />
          )}
        </aside>
      </div>

      <StatusBar events={events} />
    </div>
  );
}
```

### 2. Quick Add Modal

```jsx
// components/QuickAddModal.jsx
export function QuickAddModal({ onAdd, onClose }) {
  return (
    <div className="modal quick-add">
      <div className="modal-content">
        <h3>⚡ Quick Add Event</h3>

        <textarea
          placeholder="Paste event info or URL here..."
          className="paste-area"
          onPaste={handleSmartPaste}
        />

        <div className="smart-parse-result">
          <p>🤖 AI Detected:</p>
          <ul>
            <li>Title: Workshop KI Grundlagen</li>
            <li>Date: 2025-01-15</li>
            <li>Location: Innsbruck</li>
          </ul>
        </div>

        <div className="actions">
          <button onClick={handleAdd}>Add Event</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Analytics View

```jsx
// components/AnalyticsView.jsx
export function AnalyticsView({ events }) {
  return (
    <div className="analytics-panel">
      <div className="metrics-grid">
        <MetricCard
          title="Events This Month"
          value={23}
          trend="+15%"
          icon="📅"
        />
        <MetricCard
          title="Avg Attendance"
          value={42}
          trend="+8%"
          icon="👥"
        />
        <MetricCard
          title="Top Source"
          value="DIH West"
          subtext="12 events"
          icon="🏆"
        />
        <MetricCard
          title="Confidence Score"
          value="94%"
          trend="+2%"
          icon="✅"
        />
      </div>

      <div className="charts">
        <EventTimeline events={events} />
        <SourceBreakdown events={events} />
        <LocationHeatmap events={events} />
      </div>
    </div>
  );
}
```

## Advanced Features

### 1. Keyboard Shortcuts

```javascript
const shortcuts = {
  'cmd+k': 'Quick search',
  'cmd+n': 'New event',
  'cmd+d': 'Duplicate selected',
  'cmd+delete': 'Delete selected',
  'j/k': 'Navigate up/down',
  'x': 'Toggle selection',
  'e': 'Edit selected',
  'r': 'Mark reviewed',
  'cmd+s': 'Save changes',
  'esc': 'Close modal/deselect'
};
```

### 2. Real-time Collaboration

```javascript
// WebSocket for live updates
const ws = new WebSocket('wss://kinn.at/api/radar/live');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);

  switch(update.type) {
    case 'event-added':
      showNotification(`New event: ${update.event.title}`);
      break;
    case 'event-edited':
      updateLocalEvent(update.event);
      break;
    case 'user-viewing':
      showUserAvatar(update.user);
      break;
  }
};
```

### 3. Smart Import System

```javascript
// Paste Handler with AI parsing
async function handleSmartPaste(text) {
  // Try to detect format
  const format = detectFormat(text);

  if (format === 'url') {
    // Fetch and parse webpage
    const event = await parseWebpage(text);
    return event;
  }

  if (format === 'email') {
    // Extract from email content
    const event = await parseEmail(text);
    return event;
  }

  if (format === 'calendar') {
    // Parse ICS/calendar data
    const event = await parseCalendar(text);
    return event;
  }

  // Fallback to AI extraction
  const event = await aiExtractEvent(text);
  return event;
}
```

### 4. Review Workflow

```typescript
interface ReviewWorkflow {
  stages: [
    'incoming',     // New from sources
    'needs-review', // Flagged by system
    'reviewing',    // Being reviewed
    'approved',     // Ready for publication
    'published'     // Live on calendar
  ];

  actions: {
    approve: (eventId: string) => void;
    reject: (eventId: string, reason: string) => void;
    requestInfo: (eventId: string, questions: string[]) => void;
    escalate: (eventId: string, to: string) => void;
  };

  automation: {
    autoApprove: {
      sources: ['kinn.at', 'trusted-partners'],
      confidence: 0.95
    };
    autoReject: {
      patterns: ['spam', 'duplicate', 'past-date']
    };
  };
}
```

## Mobile Responsive Design

```css
/* Mobile-first approach */
@media (max-width: 768px) {
  .radar-dashboard {
    grid-template-columns: 1fr;
  }

  .filters-panel {
    position: fixed;
    transform: translateX(-100%);
    transition: transform 0.3s;
  }

  .filters-panel.open {
    transform: translateX(0);
  }

  .event-grid {
    /* Card view on mobile */
    display: flex;
    flex-direction: column;
  }

  .event-card {
    margin: 8px;
    padding: 12px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  /* Swipe actions */
  .event-card {
    position: relative;
    touch-action: pan-y;
  }

  .swipe-actions {
    position: absolute;
    right: 0;
    display: flex;
  }
}
```

## Performance Optimizations

### 1. Virtual Scrolling

```javascript
// Only render visible events
import { VirtualList } from '@tanstack/react-virtual';

function EventGrid({ events }) {
  const parentRef = useRef();

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5
  });

  return (
    <div ref={parentRef} className="event-list">
      {virtualizer.getVirtualItems().map(virtualRow => (
        <EventRow
          key={virtualRow.key}
          event={events[virtualRow.index]}
          style={{
            height: virtualRow.size,
            transform: `translateY(${virtualRow.start}px)`
          }}
        />
      ))}
    </div>
  );
}
```

### 2. Optimistic Updates

```javascript
// Update UI immediately, sync in background
function handleEventUpdate(eventId, updates) {
  // 1. Update local state immediately
  setEvents(prev => prev.map(e =>
    e.id === eventId ? {...e, ...updates} : e
  ));

  // 2. Show pending indicator
  setPending(eventId, true);

  // 3. Sync to backend
  updateEventAPI(eventId, updates)
    .then(() => setPending(eventId, false))
    .catch(() => {
      // Revert on failure
      setEvents(prev => prev.map(e =>
        e.id === eventId ? originalEvent : e
      ));
      showError('Update failed');
    });
}
```

### 3. Smart Caching

```javascript
// Cache with stale-while-revalidate
const eventCache = new Map();

async function fetchEvents(filters) {
  const cacheKey = JSON.stringify(filters);
  const cached = eventCache.get(cacheKey);

  if (cached && Date.now() - cached.time < 60000) {
    // Return cached data immediately
    return cached.data;
  }

  // Fetch fresh data in background
  fetchEventsAPI(filters).then(data => {
    eventCache.set(cacheKey, {
      data,
      time: Date.now()
    });

    // Update UI if data changed
    if (JSON.stringify(data) !== JSON.stringify(cached?.data)) {
      setEvents(data);
    }
  });

  return cached?.data || [];
}
```

## Authentication & Authorization

```javascript
// Role-based access control
const roles = {
  admin: {
    can: ['create', 'read', 'update', 'delete', 'bulk-ops', 'settings'],
    ui: ['all-panels', 'analytics', 'settings']
  },
  editor: {
    can: ['create', 'read', 'update'],
    ui: ['event-grid', 'editor', 'quick-add']
  },
  viewer: {
    can: ['read'],
    ui: ['event-grid', 'filters']
  }
};

// Middleware
export function requireRole(role) {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !roles[user.role].can.includes(req.action)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

## Deployment Architecture

```yaml
Frontend:
  - Next.js 14 with App Router
  - Deployed to Vercel Edge
  - Global CDN distribution

Backend:
  - Vercel Serverless Functions
  - Edge Functions for auth
  - WebSocket via Pusher/Ably

Database:
  - Primary: Upstash Redis
  - Cache: Vercel KV
  - Search: Redis Search

Monitoring:
  - Vercel Analytics
  - Custom event tracking
  - Error tracking (Sentry)
```

## Implementation Phases

### Phase 1: Basic Dashboard (Week 1)
- Event grid with sorting/filtering
- Basic CRUD operations
- Simple authentication

### Phase 2: Advanced Features (Week 2)
- Duplicate detection
- Smart import
- Keyboard shortcuts
- Real-time updates

### Phase 3: Analytics & Automation (Week 3)
- Analytics dashboard
- Review workflow
- Bulk operations
- Source management

### Phase 4: Polish & Optimize (Week 4)
- Performance optimizations
- Mobile experience
- Advanced search
- Export/import tools

## Cost Estimate

```yaml
Development Time: 40-60 hours
Monthly Costs:
  - Vercel Pro: €20 (if needed)
  - Upstash: €0 (free tier sufficient)
  - Pusher/Ably: €0 (free tier)
  - Total: €0-20/month

Benefits:
  - 10x faster event management
  - Reduced errors by 90%
  - Real-time collaboration
  - Full audit trail
  - Advanced analytics
```

## Success Metrics

- **Speed**: Add event in <30 seconds
- **Accuracy**: 95%+ duplicate detection
- **Efficiency**: Bulk edit 50+ events/minute
- **Reliability**: 99.9% uptime
- **Adoption**: 100% of admins prefer over sheets

## Conclusion

The admin dashboard represents the evolution from manual processes to a professional event management system. While Google Sheets provides an excellent starting point, this dashboard offers the advanced features needed as KINN-RADAR scales to hundreds of events across Tirol.

**Recommendation**: Start with Google Sheets for immediate needs, then build this dashboard when managing 50+ events/month or needing advanced automation features.