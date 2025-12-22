# Admin Dashboard Tech Debt - Decommissioning Plan

**Stand:** 22. Dezember 2025
**Ziel:** Schlankes, performantes SLC Admin Dashboard
**Architektur:** kinn.at = Community Portal, Luma = Event-Management

---

## Executive Summary

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Admin HTML | 118 KB | ~60 KB |
| Admin JS LOC | ~1200 | ~600 |
| Radar Files | 22 | 10 |
| API Endpoints | 45+ | ~30 |

**Resultat:** 50% weniger Code, klarere Verantwortlichkeiten

---

## Phase 1: HIGH PRIORITY (Sofort)

### 1.1 Custom Event System entfernen

**Problem:** Komplettes Event-Management-System das nie genutzt wird (Luma ist Source of Truth)

| Datei | LOC | Aktion |
|-------|-----|--------|
| `/api/events/create.js` | 226 | DELETE |
| `/api/events/upcoming.js` | 50 | DELETE |
| `/api/admin/send-event-invites.js` | 260 | DELETE |
| Admin: Events Tab (HTML+JS) | 400 | DELETE |

**Warum sicher:**
- Luma URLs in `event-links.js` sind einzige Event-Referenz
- Kein Button/Form im Admin ruft diese APIs auf
- `send-event-invites.js` hat TODO "never implemented"

**Behalten:**
- `/api/admin/event-links.js` (Luma URL Management)
- `/api/event/[id].js` (Redirect mit OG Tags)

---

### 1.2 Verwaiste Admin-Seiten löschen

| Datei | Size | Problem |
|-------|------|---------|
| `/admin/radar-events.html` | 13 KB | Duplikat von Radar Tab |
| `/admin/event-engagement.html` | 26 KB | Nie verlinkt, ungenutzt |

**Aktion:** DELETE beide

---

### 1.3 Event RSVP Schema bereinigen

**Aktuell in Redis:**
```javascript
event: {
  rsvps: { yes: [], no: [], maybe: [] },  // Redundant - Luma trackt das
  invitesSent: [...]                       // Ungenutzt
}
```

**Aktion:** Felder aus Schema entfernen, Luma ist Source of Truth

---

## Phase 2: MEDIUM PRIORITY (Diese Woche)

### 2.1 Radar System konsolidieren

**Problem:** 22 Dateien für ein Feature, 3 verschiedene Extraktoren

| Löschen | Grund |
|---------|-------|
| `extract-dynamic.js` | Playwright Overhead, Firecrawl reicht |
| `extract-with-config.js` | Generic, durch Firecrawl ersetzt |
| `cleanup-redis-duplicates.js` | Redundant mit `cleanup.js` |
| `check-sites-advanced.js` | Over-engineered |
| `debug.js`, `debug-source.js` | Debug only |
| `test-single-source.js` | Test only |
| `list-sheets.js` | Orphaned Google Sheets Ref |
| `sheets-sync.js.OLD_DISABLED` | Dead Code |

**Behalten:**
- `extract-firecrawl.js` (Haupt-Extraktor)
- `check-sites.js` (Simple HTTP checks)
- `cleanup.js` + `cleanup-cron.js` (Deduplizierung)
- `run-all-extractions.js` (Orchestrierung)
- `calendar.ics.js` (Feed-Export)
- `source-configs.js` (Quellen-Definitionen)
- `inbound.js` (Email-Handler)
- `update-sources.js`, `update-info.js` (Updates)
- `health.js` (Monitoring)

**Resultat:** 22 → 10 Dateien

---

### 2.2 Migration Scripts archivieren

| Datei | Aktion |
|-------|--------|
| `migrate-redis-v2.js` | → `/docs/archive/migrations/` |
| `migrate-redis-v2.1.js` | → `/docs/archive/migrations/` |
| `fix-voting-data.js` | → `/docs/archive/migrations/` |

---

### 2.3 Token Links Tab vereinfachen

**Problem:** 120 LOC für Simple Feature, Bulk-Generation nie genutzt

**Aktion:**
- "Generate for all subscribers" Button entfernen
- Modal-Dialog vereinfachen
- Ziel: 120 → 40 LOC

---

## Phase 3: LOW PRIORITY (Später)

### 3.1 Auth Pattern zentralisieren

**Problem:** 3 verschiedene Auth-Implementierungen

```javascript
// Variante A
if (authHeader?.startsWith('Bearer ')) { ... }

// Variante B
if (token !== process.env.ADMIN_PASSWORD) { ... }

// Variante C
function isAuthenticated(req) { ... }
```

**Aktion:** `/api/utils/admin-auth.js` erstellen, überall importieren

---

### 3.2 Error Response Format standardisieren

**Problem:** Inkonsistente API Responses

```javascript
// Aktuell gemischt:
{ error, message }
{ success: false, message }
{ error }

// Standard:
{ success: true/false, message: "...", data?: {...} }
```

---

### 3.3 Newsletter System dokumentieren

**Problem:** 4 ähnliche Email-Systeme, unklar wer was macht

| Endpoint | Purpose | Keep? |
|----------|---------|-------|
| `send-newsletter.js` | Event Announcements | YES |
| `send-event-invites.js` | Event Invites | NO (Luma) |
| `invite.js` | Personal Outreach | YES |
| `whatsapp-template.js` | WhatsApp Channel | YES |

---

## Verifikation vor Löschung

```bash
# Prüfen ob noch Referenzen existieren
git grep "send-event-invites"
git grep "events/create"
git grep "upcoming.js"
git grep "invitesSent"
git grep "radar-events.html"
git grep "event-engagement"
```

---

## Resultat: SLC Admin Dashboard

**Finale Tabs:**

| Tab | Funktion | Status |
|-----|----------|--------|
| Dashboard | Metrics & Overview | KEEP |
| Radar Events | Event Discovery Approval | KEEP |
| Subscribers | Mailing List Management | KEEP |
| Newsletter | Event Announcements | KEEP |
| Spotlights | Member Story Approvals | KEEP |
| Event Links | Luma URL Management | KEEP |
| Token Links | Magic Login Links | SIMPLIFY |
| ~~Events~~ | ~~Custom Event Creation~~ | DELETE |

**Klare Trennung:**
- **kinn.at:** Community (Voting, Radar, Spotlights, Matching)
- **Luma:** Event-Operatives (RSVPs, Invites, Check-in)

---

## Zeitschätzung

| Phase | Aufwand | Impact |
|-------|---------|--------|
| Phase 1 | 1-2h | -800 LOC, -40 KB |
| Phase 2 | 2-3h | -12 Files, -300 LOC |
| Phase 3 | 1-2h | Cleaner Code |
| **Total** | **4-7h** | **50% leaner** |

---

## Nächster Schritt

Phase 1.1 starten: Events Tab + APIs entfernen
