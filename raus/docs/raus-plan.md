# KINN:RAUS - Implementation Plan

> **Ersetzt:** `kinn-use-case-pipeline-briefing.md` (war Next.js-basiert, passt nicht zur Codebase)

## Ziel

Use Case Collection Pipeline für den "KI Praxis Report Tirol 2026" und das KINN:RAUS Podcast-Format.

---

## Ist-Zustand der KINN Codebase

```
Frontend:     Vanilla HTML/CSS/JS (NICHT Next.js!)
Backend:      Vercel Serverless Functions (Node.js)
Database:     Upstash Redis (JSON objects)
Auth:         JWT Tokens + Bearer Auth (ADMIN_PASSWORD)
Email:        Resend API
Styling:      Custom CSS + Work Sans Font
```

**Wichtig:** Das Briefing ging von Next.js + Tailwind aus. Die Realität ist vanilla HTML. Der Plan muss das berücksichtigen.

---

## SLC Prinzipien

- **[CP01] KISS** - Kein React, kein State Management, kein Build Process
- **[CP02] Lines of Code = Debt** - Eine HTML-Datei, ein API-Endpoint reicht für MVP
- **[CP03] Early Returns** - Wizard mit klaren Exit-Screens

---

## Architektur-Entscheidung

### Option A: Eigene Seite (Empfohlen)
```
/raus/index.html     → Standalone Use Case Wizard
/api/raus/submit.js  → API Endpoint
```

### Option B: In Profil integrieren
```
/pages/profil.html   → Neuer Tab "RAUS einreichen"
```

**Empfehlung: Option A** - Trennung ist sauberer, eigener Namespace, kann unabhängig iteriert werden.

---

## Datenmodell (Redis)

### UseCase Object
```javascript
// Key: "raus:usecase:{id}"
{
  id: "uc_1703424000_abc123",      // Timestamp + Random
  submittedAt: "2025-12-24T10:00:00Z",
  submitterEmail: "user@example.com",
  status: "submitted",              // submitted | in_review | verified | rejected

  // Qualification Answers
  qualification: {
    isProductive: true,
    region: "tirol",                // tirol | austria | international
    tirolConnection: null,          // office | partner | none (nur wenn international)
    visibility: "full"              // full | anonymized | report_only
  },

  // Computed Flags
  flags: {
    priority: "high",               // high | medium | low
    section: "tirol",               // tirol | tirol_connected | austria | network
    podcastEligible: true
  },

  // Use Case Content
  content: {
    headline: "KI-gestützte Angebotserstellung",
    problem: "Angebote dauerten 2h...",
    solution: "Claude API mit Templates...",
    result: "15min statt 2h, 80% Zeitersparnis",
    toolsUsed: ["Claude", "Custom ML Model"],
    industry: "Handwerk & Produktion",
    industryCustom: null,
    companySize: "micro"            // solo | micro | small | medium | large
  },

  // Confirmer
  confirmer: {
    name: "Max Mustermann",
    role: "Geschäftsführer",
    company: "Tischlerei Muster GmbH",
    linkedin: "https://linkedin.com/in/max"
  },

  // Admin Fields
  reviewNotes: null,
  reviewedBy: null,
  reviewedAt: null
}
```

### Pipeline Stats (optional, computed on-demand)
```javascript
// Key: "raus:stats" (cached, TTL 5min)
{
  submitted: 23,
  inReview: 5,
  verified: 14,
  rejected: 4,
  goal: 50,
  lastUpdated: "2025-12-24T10:00:00Z"
}
```

### Index für schnellen Zugriff
```javascript
// Key: "raus:usecases"
// Type: Redis SET
// Value: IDs aller Use Cases
```

---

## Phase 0: MVP (Day 1)

### Scope
- Wizard UI (standalone HTML)
- Submit API (speichert in Redis)
- Keine Email-Notifications
- Keine Admin-Ansicht (Redis direkt lesen)

### Files
```
/raus/
  index.html          → Wizard UI (basiert auf mockup_test.html)

/api/raus/
  submit.js           → POST - Use Case einreichen
```

### Wizard Flow (aus mockup_test.html übernehmen)
```
intro → q1 (produktiv?) → q2 (region) → q2b (tirol connection) → q3 (visibility) → q3b (report only) → details → confirmer → success

Exit Screens:
- exit_not_productive
- exit_no_connection
- exit_confidential
```

### API Endpoint: POST /api/raus/submit

```javascript
// Request Body
{
  qualification: { isProductive, region, tirolConnection, visibility },
  content: { headline, problem, solution, result, toolsUsed, industry, ... },
  confirmer: { name, role, company, linkedin }
}

// Response
{
  success: true,
  id: "uc_1703424000_abc123",
  message: "Danke! Dein Use Case wurde eingereicht."
}
```

### Validation
```javascript
// Required Fields
- content.headline (max 150 chars)
- content.problem (required)
- content.solution (required)
- content.result (required)
- content.toolsUsed (min 1)
- content.industry (required)
- content.companySize (required)
- confirmer.name (required)
- confirmer.role (required)
- confirmer.company (required)
- confirmer.linkedin (optional, URL validation if provided)
```

### Styling
- Custom CSS wie `profil.html` (Work Sans, KINN Colors)
- KEIN Tailwind CDN in Production (mockup war nur Test)
- Responsive (Mobile First)

---

## Phase 1: Email Notifications (Day 2)

### On Submit
1. **User Confirmation Email**
   ```
   Subject: Dein Use Case wurde eingereicht - KINN
   Body: Zusammenfassung + Timeline + Kontakt
   ```

2. **Admin Notification Email**
   ```
   To: thomas@kinn.at
   Subject: Neuer Use Case eingereicht: {headline}
   Body: Alle Details + Link zur Admin-Ansicht
   ```

### Implementation
- Resend API (bereits integriert)
- Template inline in submit.js (wie bestehende KINN Emails)

---

## Phase 2: Admin View (Day 3-4)

### Option A: JSON Dump Endpoint
```
GET /api/admin/raus?status=all
Authorization: Bearer {ADMIN_PASSWORD}

Response: Array aller Use Cases
```

### Option B: Admin Dashboard Tab
- In `/admin/index.html` neuen Tab "RAUS" hinzufügen
- Liste aller Submissions mit Filtern
- Status ändern (submitted → in_review → verified)

**Empfehlung:** Starte mit Option A, dann Option B wenn sinnvoll.

---

## Phase 3: Status Updates (Week 2)

### Status Transitions
```
submitted → in_review → verified → scheduled → published
                     → rejected
```

### Admin Actions
- Status ändern via PATCH /api/admin/raus/{id}
- Notizen hinzufügen
- reviewedBy + reviewedAt setzen

### User Notifications
- Email bei Status-Änderung
- "Dein Use Case wurde verifiziert!" etc.

---

## Phase 4: Pipeline Stats (Week 2-3)

### Live Stats auf Intro Screen
```javascript
// Berechnung on-demand oder cached
const stats = {
  submitted: await redis.scard('raus:usecases'),
  verified: await countByStatus('verified'),
  // ...
};
```

### Display
```
╔═══════════════════════════════════════╗
║  23 eingereicht  │  14 verifiziert    ║
║  6 Podcast geplant  │  3 veröffentlicht  ║
╠═══════════════════════════════════════╣
║  ████████████░░░░░░░░░░░░  28%       ║
║  Ziel: 50 verifizierte Use Cases      ║
╚═══════════════════════════════════════╝
```

---

## Nicht im Scope (YAGNI)

Diese Features aus dem ursprünglichen Briefing werden **bewusst weggelassen**:

- ❌ Make.com Webhooks (Resend direkt reicht)
- ❌ Notion/Airtable Integration (Redis reicht)
- ❌ Slack/Discord Notifications (Email reicht)
- ❌ Complex State Management (Vanilla JS reicht)
- ❌ React/Next.js (Vanilla HTML reicht)
- ❌ Tailwind CSS (Custom CSS reicht)
- ❌ "Erinnere mich in 3 Monaten" Feature
- ❌ "Für DACH-Report anmelden" Feature
- ❌ User Submissions List (User sieht nur Success Screen)
- ❌ Progress Persistence (localStorage) - Wizard ist kurz genug

---

## Migration vom Briefing

### Was übernommen wird
- Wizard Flow (Q1 → Q2 → Q3 → Details → Confirmer → Success)
- Exit Screens (Not Productive, No Connection, Confidential)
- Datenmodell (UseCase Entity)
- Priority/Section Berechnung
- Validation Schema

### Was angepasst wird
- Next.js → Vanilla HTML
- Tailwind → Custom CSS
- Complex API Routes → Ein Endpoint
- Multiple Tables → Redis JSON
- Make.com → Direct Resend
- React State → Simple JS Object

---

## Checkliste für Implementation

### Phase 0 (MVP)
- [ ] `/raus/index.html` erstellen (Wizard UI)
- [ ] CSS: KINN Brand Styles (aus profil.html übernehmen)
- [ ] JS: State Management für Wizard Steps
- [ ] JS: Form Validation
- [ ] `/api/raus/submit.js` erstellen
- [ ] Redis: Use Case speichern
- [ ] Redis: Index aktualisieren
- [ ] Vercel: Routing in vercel.json

### Phase 1 (Emails)
- [ ] User Confirmation Email Template
- [ ] Admin Notification Email Template
- [ ] Error Handling wenn Email fehlschlägt

### Phase 2 (Admin)
- [ ] GET /api/admin/raus Endpoint
- [ ] Admin Dashboard Tab (optional)
- [ ] Filter by Status

### Phase 3 (Status)
- [ ] PATCH /api/admin/raus/{id}
- [ ] Status Change Emails

### Phase 4 (Stats)
- [ ] Stats Calculation Helper
- [ ] Cache mit TTL
- [ ] Intro Screen Integration

---

## Referenzen

- **UI Mockup:** `/raus/mockup_test.html` (funktioniert, aber braucht KINN Styling)
- **Redis Patterns:** `/api/utils/redis.js` (getEventsConfig als Template)
- **Admin Auth:** `/api/admin/events.js` (isAuthenticated Funktion)
- **Email Templates:** `/api/signup.js` (Resend Integration)
- **KINN Styling:** `/pages/profil.html` (CSS Referenz)
- **Brand Guide:** `/docs/marketing/KINN_BRAND_STYLEGUIDE.md`

---

*Plan Version: 2.0*
*Erstellt: 24. Dezember 2025*
*Basiert auf: Actual KINN Codebase Analysis*
