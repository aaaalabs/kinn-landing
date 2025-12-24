# Instant Load Solution Plan

## Problem

Das KINN Dashboard (profil.html) hat folgende Performance-Probleme:
- **3524 LOC** HTML/JS in einer Datei
- **Multiple API calls** beim Laden (Profile, Events, Radar, Voting)
- **Blocking render** bis alle Daten da sind
- **Keine Caching-Strategie** für wiederkehrende User

## Ziel

**Perceived instant load** - User sieht sofort Inhalt, Updates passieren unsichtbar im Hintergrund.

---

## Lösung: Stale-While-Revalidate (SWR) + Shell Caching

### Architektur-Überblick

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Request                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Service Worker (SW)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Serve cached shell instantly (< 50ms)                │   │
│  │ 2. Fetch fresh data in background                       │   │
│  │ 3. Update cache + notify page                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Page Render                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Cached Shell   │  │  Skeleton UI    │  │  Fresh Data     │ │
│  │  (instant)      │→ │  (placeholders) │→ │  (hydrated)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phasen

### Phase 1: App Shell + Skeleton UI

**Ziel:** Sofort sichtbare UI ohne Daten

**1.1 Static Shell separieren**
```
/pages/
  profil.html          # Nur Shell + Script-Includes

/js/
  profil/
    shell.js           # Shell rendering (tabs, nav, layout)
    hydrate.js         # Data fetching + hydration
  widgets/
    raus.js            # ✅ bereits modularisiert
    voting.js          # TODO
    radar.js           # TODO
    events.js          # TODO
```

**1.2 Skeleton Components**
```html
<!-- Vor Hydration sichtbar -->
<div class="card skeleton">
  <div class="skeleton-line w-60"></div>
  <div class="skeleton-line w-40"></div>
</div>

<style>
.skeleton-line {
  height: 1rem;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
```

### Phase 2: Service Worker + Cache Strategy

**2.1 Service Worker registrieren**
```javascript
// /sw.js
const CACHE_NAME = 'kinn-dashboard-v1';
const SHELL_CACHE = 'kinn-shell-v1';
const DATA_CACHE = 'kinn-data-v1';

// Shell files (cache-first, update in background)
const SHELL_FILES = [
  '/pages/profil.html',
  '/js/profil/shell.js',
  '/js/profil/hydrate.js',
  '/js/widgets/raus.js',
  '/js/widgets/voting.js',
  '/js/widgets/radar.js',
  '/js/widgets/events.js',
  '/css/profil.css'
];

// API endpoints (stale-while-revalidate)
const API_ROUTES = [
  '/api/profile',
  '/api/events',
  '/api/voting'
];
```

**2.2 Cache Strategies**

| Resource Type | Strategy | TTL |
|--------------|----------|-----|
| Shell HTML/JS/CSS | Cache-first, background update | 24h |
| Profile data | SWR (stale-while-revalidate) | 1h |
| Events | SWR | 15min |
| Voting results | SWR | 5min |
| Static assets | Cache-first | 7d |

**2.3 Service Worker Logic**
```javascript
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Shell files: Cache-first with background update
  if (SHELL_FILES.some(f => url.pathname.endsWith(f))) {
    event.respondWith(cacheFirst(event.request, SHELL_CACHE));
    // Background update
    event.waitUntil(updateCache(event.request, SHELL_CACHE));
    return;
  }

  // API routes: Stale-while-revalidate
  if (API_ROUTES.some(r => url.pathname.startsWith(r))) {
    event.respondWith(staleWhileRevalidate(event.request, DATA_CACHE));
    return;
  }

  // Default: Network-first
  event.respondWith(networkFirst(event.request));
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Fetch fresh in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
      // Notify page of update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'CACHE_UPDATED',
            url: request.url
          });
        });
      });
    }
    return response;
  });

  // Return cached immediately, or wait for network
  return cachedResponse || fetchPromise;
}
```

### Phase 3: Client-Side Hydration

**3.1 Initial Render mit Cache**
```javascript
// hydrate.js
async function initDashboard() {
  // 1. Render shell immediately (already in HTML)

  // 2. Check for cached data
  const cachedProfile = localStorage.getItem('kinn_profile_cache');
  if (cachedProfile) {
    renderProfile(JSON.parse(cachedProfile));
  }

  // 3. Fetch fresh data
  const freshProfile = await fetchProfile();

  // 4. Update if different (diff check)
  if (JSON.stringify(freshProfile) !== cachedProfile) {
    renderProfile(freshProfile);
    localStorage.setItem('kinn_profile_cache', JSON.stringify(freshProfile));
  }
}

// Listen for SW updates
navigator.serviceWorker?.addEventListener('message', event => {
  if (event.data.type === 'CACHE_UPDATED') {
    // Silently refresh affected component
    refreshComponent(event.data.url);
  }
});
```

**3.2 Diff-Based Updates**
```javascript
function updateIfChanged(oldData, newData, renderFn) {
  // Deep compare
  if (JSON.stringify(oldData) === JSON.stringify(newData)) {
    return; // No visual change needed
  }

  // Animate transition if data changed
  const container = document.getElementById('content');
  container.style.opacity = '0.8';

  renderFn(newData);

  // Smooth fade-in
  requestAnimationFrame(() => {
    container.style.transition = 'opacity 0.2s';
    container.style.opacity = '1';
  });
}
```

### Phase 4: Pre-Generation (Optional, für noch schnelleres Laden)

**4.1 Edge-Side Includes (ESI) Alternative: Vercel Edge**
```javascript
// /api/dashboard-shell.js (Edge Function)
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const userToken = req.cookies.get('kinn_token');

  // Generate personalized shell
  const shell = generateShell({
    userName: userToken ? decodeToken(userToken).name : 'Guest',
    hasProfile: !!userToken
  });

  return new Response(shell, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400'
    }
  });
}
```

**4.2 Tägliche Static Generation**
```javascript
// /scripts/generate-dashboard-cache.js
// Cron: 0 4 * * * (4 AM daily)

async function generateDashboardCache() {
  // Fetch latest events
  const events = await fetchEvents();

  // Generate static HTML with latest data
  const html = renderDashboardHTML({
    events,
    lastUpdated: new Date().toISOString()
  });

  // Upload to CDN/KV
  await uploadToKV('dashboard_cache', html);
}
```

---

## Vercel-Spezifische Optimierungen

### ISR (Incremental Static Regeneration)
```javascript
// vercel.json
{
  "functions": {
    "pages/profil.html": {
      "memory": 128,
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/pages/profil.html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=3600, stale-while-revalidate=86400"
        }
      ]
    },
    {
      "source": "/js/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Edge Caching für API
```javascript
// /api/events.js
export default async function handler(req, res) {
  // Cache at edge for 15 minutes
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');

  const events = await getEvents();
  return res.json(events);
}
```

---

## Metriken & Ziele

| Metrik | Aktuell | Ziel |
|--------|---------|------|
| FCP (First Contentful Paint) | ~2.5s | < 0.5s |
| LCP (Largest Contentful Paint) | ~3.5s | < 1.0s |
| TTI (Time to Interactive) | ~4.0s | < 2.0s |
| CLS (Cumulative Layout Shift) | 0.15 | < 0.05 |

---

## Implementation Roadmap

### Woche 1: Shell + Modularisierung
- [ ] Voting widget auslagern
- [ ] Radar widget auslagern
- [ ] Events widget auslagern
- [ ] Skeleton UI implementieren

### Woche 2: Service Worker
- [ ] SW registrierung
- [ ] Cache-first für Shell
- [ ] SWR für API calls
- [ ] Update-Notifications

### Woche 3: Hydration + Polish
- [ ] localStorage caching
- [ ] Diff-based updates
- [ ] Smooth transitions
- [ ] Offline fallback

### Woche 4: Measurement + Tuning
- [ ] Lighthouse CI setup
- [ ] Real User Monitoring
- [ ] Cache TTL tuning
- [ ] Edge optimization

---

## Quick Wins (sofort umsetzbar)

1. **Cache-Control Headers** für JS-Dateien (immutable)
2. **Preload critical scripts** im `<head>`
3. **Defer non-critical scripts**
4. **Skeleton UI** für Cards
5. **localStorage caching** für Profile-Daten

```html
<!-- Sofort im <head> -->
<link rel="preload" href="/js/profil/shell.js" as="script">
<link rel="preload" href="/js/widgets/raus.js" as="script">
```

---

## Referenzen

- [Stale-While-Revalidate Pattern](https://web.dev/stale-while-revalidate/)
- [App Shell Model](https://developers.google.com/web/fundamentals/architecture/app-shell)
- [Service Worker Caching Strategies](https://developers.google.com/web/tools/workbox/modules/workbox-strategies)
- [Vercel Edge Caching](https://vercel.com/docs/concepts/edge-network/caching)
