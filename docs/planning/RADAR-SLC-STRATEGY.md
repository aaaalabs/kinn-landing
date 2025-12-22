# KINN Radar - SLC Strategy

## Aktueller Zustand (Dezember 2025)

### Was funktioniert
- 17 Source-Configs definiert
- Firecrawl + Groq LLM Extraction Pipeline
- 4 Cron-Jobs (8:00, 8:15, 9:00 Mo, 3:00)
- Admin UI für Event-Approval
- Duplicate Detection (title-date-location)

### Was fehlt (SLC Gaps)
1. **Keine Sichtbarkeit** - Man sieht nicht ob/wann Events gefunden werden
2. **Keine Qualitätsmetriken** - Wieviele Events sind korrekt kategorisiert?
3. **Kein Feedback-Loop** - Approved/Rejected Events verbessern nicht die Extraction
4. **Keine Alerts** - Wenn eine Source bricht, merkt's keiner

---

## SLC First Principles Analyse

### Prinzip 1: Simple
> "Die einfachste Lösung die funktioniert"

**Problem:** Komplexes Multi-Source-System mit unterschiedlichen Extraction-Methoden

**SLC-Ansatz:**
- EIN Extraction-Pfad (Firecrawl → Groq)
- EIN Cron-Job der alles orchestriert
- EIN Dashboard das alles zeigt

### Prinzip 2: Lovable
> "Macht Spaß zu benutzen"

**Problem:** Admin muss manuell checken ob Events da sind

**SLC-Ansatz:**
- Daily Digest Email an Admin: "3 neue Events gefunden"
- Visual Dashboard mit Trends
- One-Click Approve für AI-Kategorie

### Prinzip 3: Complete
> "Löst das Problem vollständig"

**Problem:** System ist da, aber niemand weiß ob es funktioniert

**SLC-Ansatz:**
- Automatische Health Checks
- Metrics die zeigen: Events/Tag, Approval Rate, Source Health
- Feedback das die AI verbessert

---

## Neue Radar Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                     RADAR CONTROL CENTER                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   SOURCES    │    │  EXTRACTION  │    │   OUTPUT     │   │
│  │              │    │              │    │              │   │
│  │ • InnCubator │───▶│  Firecrawl   │───▶│ Pending Q    │   │
│  │ • Startup.T  │    │      +       │    │     ↓        │   │
│  │ • WKO        │    │    Groq      │    │ [Approve]    │   │
│  │ • AI Austria │    │              │    │     ↓        │   │
│  │ • 13 more    │    │              │    │ Widget/Feed  │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    METRICS BAR                          │ │
│  │  Today: 5 new │ Week: 23 │ Pending: 8 │ Sources: 14/17  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementierungsplan

### Phase 1: Visibility (Diese Woche)

#### 1.1 Radar Metrics Dashboard
**File:** `/api/radar/metrics.js`

```javascript
// GET /api/radar/metrics
{
  "summary": {
    "today": { "found": 5, "approved": 3, "rejected": 1, "pending": 1 },
    "week": { "found": 23, "approved": 18, "rejected": 3, "pending": 2 },
    "month": { "found": 89, "approved": 71, "rejected": 12, "pending": 6 }
  },
  "sources": {
    "healthy": 14,
    "failing": 2,
    "inactive": 1,
    "lastRun": "2025-12-22T08:15:00Z"
  },
  "quality": {
    "approvalRate": 0.82,
    "categoryAccuracy": 0.91,  // Based on manual corrections
    "duplicateRate": 0.15
  },
  "trending": {
    "topSources": ["InnCubator", "Startup.Tirol", "AI Austria"],
    "topCategories": ["AI", "Startup", "Workshop"]
  }
}
```

#### 1.2 Admin Dashboard Integration
In `/admin/index.html` Radar Tab erweitern:

```
┌─────────────────────────────────────────────────────────────┐
│  Radar Events                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 METRICS BAR                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│  │ Today  │ │  Week  │ │Pending │ │Sources │               │
│  │   5    │ │   23   │ │   8    │ │ 14/17  │               │
│  │  new   │ │  total │ │ await  │ │ active │               │
│  └────────┘ └────────┘ └────────┘ └────────┘               │
│                                                              │
│  [Filters: Status | Source | Category | Search]              │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ □ AI Workshop - InnCubator - 2025-01-15 - ⏳ Pending    ││
│  │ □ Startup Pitch Night - StartupTirol - 2025-01-18      ││
│  │ □ Tech Meetup - AI Austria - 2025-01-20                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ▼ Radar Tools (collapsed)                                   │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Intelligence (Nächste Woche)

#### 2.1 Source Health Monitoring
**File:** `/api/radar/source-health.js`

Für jede Source tracken:
- Letzte erfolgreiche Extraction
- Events gefunden (Trend)
- Fehlerrate
- Response Time

```javascript
// Redis: radar:source:health:{sourceName}
{
  "lastSuccess": "2025-12-22T08:15:00Z",
  "lastError": null,
  "eventsFound7d": 12,
  "eventsApproved7d": 10,
  "avgResponseMs": 2340,
  "status": "healthy" // healthy | degraded | failing
}
```

#### 2.2 Auto-Categorization Improvement

Wenn Admin eine Kategorie korrigiert:
1. Speichere Correction in Redis
2. Verwende als Kontext für nächste Extractions

```javascript
// Redis: radar:corrections
{
  "title_contains:workshop": { "category": "Education", "count": 5 },
  "title_contains:ki": { "category": "AI", "count": 12 },
  "source:inncubator": { "default_category": "Startup" }
}
```

### Phase 3: Automation (Januar)

#### 3.1 Daily Digest Email
**File:** `/api/radar/daily-digest.js`

Täglich um 9:00 an Admin:
```
Subject: KINN Radar: 5 neue Events gefunden

Hallo Thomas,

Gestern hat der Radar 5 neue Events in Tirol gefunden:

AI Events (2):
• KI Workshop für KMU - InnCubator - 15.01.2025
• Machine Learning Basics - MCI - 18.01.2025

Startup Events (2):
• Pitch Night #12 - Startup.Tirol - 16.01.2025
• Founder Stammtisch - Impact Hub - 17.01.2025

Workshop (1):
• Design Thinking Intro - WKO - 20.01.2025

→ Zur Freigabe: https://kinn.at/admin#radar

8 Events warten noch auf Freigabe.

---
KINN Radar läuft automatisch.
```

#### 3.2 Smart Auto-Approve

Regeln für automatische Freigabe:
1. Kategorie = "AI" → Auto-Approve (KINN Fokus)
2. Source = "InnCubator" oder "Startup.Tirol" → Auto-Approve (vertrauenswürdig)
3. Titel enthält "KINN" → Auto-Approve

Alles andere → Pending für manuelle Review

```javascript
// /api/radar/auto-approve.js
function shouldAutoApprove(event) {
  // AI Events sind KINN-Core
  if (event.category === 'AI') return true;

  // Vertrauenswürdige Sources
  const trustedSources = ['InnCubator', 'Startup.Tirol', 'AI Austria'];
  if (trustedSources.includes(event.source)) return true;

  // KINN-eigene Events
  if (event.title.toLowerCase().includes('kinn')) return true;

  return false;
}
```

---

## Redis Schema Erweiterung

```javascript
// Existing
radar:events                    // SET of event IDs
radar:event:{id}                // HASH event data

// New - Metrics
radar:metrics:daily:{date}      // HASH { found, approved, rejected }
radar:metrics:source:{name}     // HASH source health
radar:metrics:category:{cat}    // HASH category stats

// New - Intelligence
radar:corrections               // LIST of manual corrections
radar:rules:auto-approve        // HASH auto-approve rules
```

---

## Quick Wins (Sofort umsetzbar)

### 1. Metrics Counter hinzufügen
In `extract-firecrawl.js` und `inbound.js`:
```javascript
// Nach erfolgreichem Store
await kv.hincrby(`radar:metrics:daily:${today}`, 'found', 1);
await kv.hincrby(`radar:metrics:source:${sourceName}`, 'found', 1);
```

### 2. Source Status in Admin
Im Health Check Response erweitern:
```javascript
// GET /api/radar/health
{
  "sources": {
    "total": 17,
    "active": 14,
    "lastRun": "2025-12-22T08:15:00Z",
    "nextRun": "2025-12-23T08:00:00Z"
  }
}
```

### 3. Pending Count Badge
Im Admin Tab Button:
```html
<button class="tab" onclick="switchTab('radar')">
  Radar Events <span class="badge" id="radar-pending-badge">8</span>
</button>
```

---

## Success Metrics

| Metrik | Aktuell | Ziel |
|--------|---------|------|
| Events/Woche | ~10 (geschätzt) | 20+ verifiziert |
| Approval Rate | Unbekannt | >80% |
| Source Uptime | Unbekannt | >90% |
| Admin Zeit/Tag | ~5 Min | <2 Min |
| AI Category Accuracy | Unbekannt | >90% |

---

## Implementierungsstatus

### Phase 1: Visibility - COMPLETE
- [x] `/api/radar/metrics.js` - Metrics Endpoint
- [x] Metrics Bar im Admin (Today, Week, Pending, Approval Rate)
- [x] Pending Badge am Tab Button
- [x] Daily Metrics Tracking in Redis

### Phase 2: Source Health - COMPLETE
- [x] `/api/radar/source-health.js` - Health Status Endpoint
- [x] Health Tracking in `extract-firecrawl.js`
- [x] Source Health Section im Admin UI
- [x] Status Badges (healthy/degraded/failing)

### Phase 3: Automation - COMPLETE
- [x] `/api/radar/weekly-digest.js` - Weekly Email an admin@libralab.ai
- [x] Pushbullet Integration für Source Failures
- [x] Cron Job: Montags 9:00 Uhr
- [x] "NEU" Badge für Events der letzten 24-48h
- [x] Sortierung nach Hinzufügedatum (neueste zuerst)

### Env Variables Required
```bash
PUSHBULLET_API_KEY=...      # Für Failure Notifications
RESEND_API_KEY=...          # Für Weekly Digest Email
RADAR_ADMIN_TOKEN=...       # Admin Auth
```

---

## Philosophie

> "Radar soll wie ein guter Assistent sein:
> Er findet die Events, sortiert sie vor,
> und macht nur Arbeit wenn nötig."

- **Simpel:** Ein Button "Alle AI Events freigeben"
- **Lovable:** Sehen was funktioniert (Trends, Stats)
- **Complete:** Von Scraping bis Widget ohne manuelle Schritte
