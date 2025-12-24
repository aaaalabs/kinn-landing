# KINN Landing Page MVP

## Project Overview

KINN (KI Treff Innsbruck) landing page for event subscriptions with iCal feed integration.

**Stack:**
- Vanilla HTML/CSS/JavaScript
- Vercel Serverless Functions (API routes)
- Redis (Upstash) for data storage
- Resend for email delivery
- JWT for token-based authentication

## Key Features

- Email subscription with double opt-in
- iCal feed generation for calendar apps
- **Event Types: Präsenz, Online (Google Meet), Hybrid** ✅ NEW
- **RSVP-System mit Ja/Nein/Vielleicht** ✅ NEW (Backend ready)
- **Google Calendar Integration (Smart Hybrid)** ✅ NEW - Copy-paste workflow for native Calendar Invites
- **WhatsApp-Template Generator** ✅ NEW
- Admin dashboard for event management
- User profile management with preferences (Supply/Demand matching)
- No OAuth - simple token-based auth

---

## 📚 Quick Reference Documentation

All documentation has been organized into `/docs` for better structure. Here are the most important guides:

### 🎯 Planning & Strategy
- **Main Implementation Plan:** [`docs/planning/PLAN.md`](docs/planning/PLAN.md)
- **Platform Potentials & Roadmap:** [`docs/planning/POTENZIALE.md`](docs/planning/POTENZIALE.md)
- **KInnside Features (Future):** [`docs/planning/KInnside.md`](docs/planning/KInnside.md)
- **Redis Architecture Plan:** [`docs/planning/redis_plan.md`](docs/planning/redis_plan.md)

### 🎨 Marketing & Brand Identity
- **Complete Marketing Strategy:** [`docs/marketing/MARKETING.md`](docs/marketing/MARKETING.md)
- **Brand Styleguide (Visual Identity):** [`docs/marketing/KINN_BRAND_STYLEGUIDE.md`](docs/marketing/KINN_BRAND_STYLEGUIDE.md)
- **Visual Generation Prompts:** [`docs/marketing/KINN-Visual-Generation-Prompts.md`](docs/marketing/KINN-Visual-Generation-Prompts.md)
- **Marketing Concept (German):** [`docs/marketing/KINN-Marketing-Konzept.md`](docs/marketing/KINN-Marketing-Konzept.md)
- **Event Locations:** [`docs/marketing/LOCATIONS.md`](docs/marketing/LOCATIONS.md)

### 🔧 Technical Implementation Guides
- **Google Calendar Workflow (Smart Hybrid):** [`docs/technical/GOOGLE_CALENDAR_WORKFLOW.md`](docs/technical/GOOGLE_CALENDAR_WORKFLOW.md) ⭐ NEW
- **Calendar Integration Research:** [`docs/technical/CALENDAR-INTEGRATION.md`](docs/technical/CALENDAR-INTEGRATION.md)
- **Google Calendar Flow (API):** [`docs/technical/GOOGLE-CALENDAR-FLOW.md`](docs/technical/GOOGLE-CALENDAR-FLOW.md)
- **iCal Setup Guide:** [`docs/technical/ICAL_SETUP.md`](docs/technical/ICAL_SETUP.md)
- **Event Creation Workflow:** [`docs/technical/EVENT_CREATION.md`](docs/technical/EVENT_CREATION.md)
- **Email Warmup Guide:** [`docs/technical/EMAIL_WARMUP_GUIDE.md`](docs/technical/EMAIL_WARMUP_GUIDE.md)
- **Resend API Checklist:** [`docs/technical/RESEND_API_CHECKLIST.md`](docs/technical/RESEND_API_CHECKLIST.md)
- **Inbound Email Setup:** [`docs/technical/INBOUND_SETUP.md`](docs/technical/INBOUND_SETUP.md)

### 🛠️ Code Restructuring (Active Project)
- **Executive Summary:** [`docs/restructuring/RESTRUCTURING-SUMMARY.md`](docs/restructuring/RESTRUCTURING-SUMMARY.md) ⭐
- **Detailed Implementation Plan:** [`docs/restructuring/RESTRUCTURING-PLAN.md`](docs/restructuring/RESTRUCTURING-PLAN.md)
- **Comprehensive Risk Analysis:** [`docs/restructuring/RESTRUCTURING-RISK-ANALYSIS.md`](docs/restructuring/RESTRUCTURING-RISK-ANALYSIS.md)

### 📊 Reports & Security
- **DMARC Report (Nov 2025):** [`docs/reports/DMARC-REPORT-2025-11-02.md`](docs/reports/DMARC-REPORT-2025-11-02.md)
- **Security Review:** [`docs/reports/SECURITY_REVIEW.md`](docs/reports/SECURITY_REVIEW.md)

### 🎨 Design Assets
- **Font Comparison Tool:** [`design/fonts/font-comparison.html`](design/fonts/font-comparison.html)
- **Font Option Previews:** [`design/fonts/`](design/fonts/)

### 📦 Archive
- **Legacy Files:** [`docs/archive/`](docs/archive/)

---

## Brand Guidelines

**IMPORTANT:** All UI components must follow the KINN Brand Styleguide.

### Design & Visual Identity

See: **[`docs/marketing/KINN_BRAND_STYLEGUIDE.md`](docs/marketing/KINN_BRAND_STYLEGUIDE.md)** for comprehensive design system:

**Core Identity:**
- No emojis policy (timeless, professional)
- KINN SVG logo (with don'ts and variations)
- Work Sans typography (weights 300-900)
- Bold Mint (#5ED9A6) primary color
- Minimal, elegant, Jony Ive aesthetic

**Components:**
- Button styles (primary, secondary, danger)
- Cards, forms, shadows, spacing
- Email design (spam-safe)
- Accessibility (WCAG 2.1 AA)

**Photography:**
- Event photo guidelines (natural, candid)
- GDPR consent protocols
- Image treatments and filters

**Application Templates:**
- Email signatures (KINN Core Team)
- Social media profiles (LinkedIn, Twitter)
- Presentation templates
- Business cards

### Marketing & Messaging

See: **[`docs/marketing/MARKETING.md`](docs/marketing/MARKETING.md)** for complete marketing strategy:

**Brand Voice:**
- Community naming: KINN'der, KINN'sider, KINN Core
- Taglines: "KINN'der an die Macht", "In KINN'derschuhen"
- Tone: Direct, bodenständig, self-aware witzig

**Elevator Pitches:**
- 10s: "Monatlicher AI Austausch in Innsbruck"
- 30s: + Supply/Demand matching
- 2min: Full story with problem/solution/vision

**Key Messages:**
- Primary: "Community-owned AI network in Tirol"
- Secondary: "From networking to actual collaboration"
- Tertiary: "Local identity, global relevance"

**Growth Strategy:**
- Target audiences (AI Devs, Tech Professionals, Students, B2B)
- Content pillars (Technical Excellence, Local Heroes, Job Intel)
- Channels (Owned/Earned/Paid)
- Viral loops & partnerships
- Monetization tiers

**What We Offer:**
- Monthly KINN Treffs
- Supply/Demand Matching (✅ implemented)
- Calendar Integration (✅ implemented)
- Future: Job Board, Learning Paths, Academy

### Platform Potentials & Roadmap

See: **[`docs/planning/POTENZIALE.md`](docs/planning/POTENZIALE.md)** for comprehensive feature opportunities:

**Vision:** KINN as Operating System für Tirols AI Community

**Quick Wins (P0):**
- Email Forwards mit AI-Matching (`vorname@kinn.at`)
- QR Code Mini-Profiles (`code.kinn.at/thomas`)
- KINN Directory (Public Talent Search)

**Strategic Plays (P1-P2):**
- Reverse Job Board (Members post what they seek)
- KINN Verified Badge (Trust Layer)
- KINN Spotlight (Member Storytelling)
- Learning Hub (Peer-to-Peer Knowledge)

**Moonshots (P3-P4):**
- KINN Ventures (Angel Syndicate)
- KINN Remote (Umbrella Company)
- KINN API (Programmable Talent Network)

**Network Effects:**
- Match-Qualität steigt exponentiell mit Netzwerkgröße
- KINN wird zum Signal für Quality ("KINN-verified")
- Data Moat: Supply/Demand Intelligence
- Distribution Power: KINN Recommendation = Hiring-Signal

## API Endpoints

### Public Endpoints
- `POST /api/signup` - Initial email subscription
- `GET /api/confirm?token=...` - Email confirmation
- `GET /api/calendar.ics` - iCal feed generation (with meeting links!)
- `GET /api/profile?token=...` - Get user preferences
- `PUT /api/profile/update` - Update user preferences
- `PUT /api/profile/update-extended` - Update full profile (supply/demand)
- `POST /api/profile/unsubscribe` - Complete unsubscribe
- **`GET /api/rsvp?token=...&event=...&response=yes|no|maybe`** ✅ NEW - RSVP for events
- `GET /api/events` - Get upcoming events (public)

### Admin Endpoints (Bearer Auth via ADMIN_PASSWORD)
- `GET /api/admin/events` - List all events
- `PUT /api/admin/events` - Update events config (bulk)
- **`POST /api/events/create`** ✅ NEW - Create single event with validation
- **`GET /api/admin/subscribers?filter=yes&event=...&format=text`** ✅ NEW - Get filtered subscribers
  - Filters: `all`, `yes`, `no`, `maybe`, `yes_maybe`, `none`
  - Formats: `json` (default), `text` (comma-separated for copy-paste)
- **`POST /api/admin/whatsapp-template`** ✅ NEW - Generate WhatsApp reminder messages

## Redis Data Structure

```javascript
// Events Config
"events:config" → {
  events: Array<Event>,
  defaults: {
    timezone: 'Europe/Vienna',
    organizer: 'thomas@kinn.at',
    categories: ['KI', 'AI', 'Networking', 'Innsbruck'],
    reminder: '24h'
  }
}

// Event Schema (NEW fields highlighted)
Event {
  id: string,
  type: "online" | "in-person" | "hybrid", // ✅ NEW
  title: string,
  description: string,
  location: string,
  meetingLink?: string, // ✅ NEW (for online/hybrid)
  maxCapacity?: number, // ✅ NEW (for in-person/hybrid)
  date: "YYYY-MM-DD",
  startTime: "HH:MM",
  endTime: "HH:MM",
  start: ISO8601,
  end: ISO8601,
  status: "confirmed" | "cancelled",
  rsvps: { // ✅ NEW
    yes: Array<email>,
    no: Array<email>,
    maybe: Array<email>
  },
  createdAt: ISO8601
}

// Subscribers
"subscribers:confirmed" → Set<email>

// User Preferences (basic)
"user:preferences:{email}" → {
  email: string,
  phone?: string, // ✅ NEW (for WhatsApp reminders)
  whatsappReminders?: boolean, // ✅ NEW
  notifications: { enabled: boolean },
  subscribedAt: ISO8601,
  updatedAt: ISO8601
}

// User Profile (extended with supply/demand)
"profile:{email}" → {
  email: string,
  identity: {
    name,
    linkedIn,
    github,
    location // Event preference: "in-person" | "online" | "all"
             // in-person = Präsenz in Tirol (gets in-person + hybrid events)
             // online = Online/Remote (gets online + hybrid events)
             // all = Beides/Flexibel (gets all events)
             // Legacy values: "ibk"/"tirol" → "in-person", "remote" → "online", "hybrid" → "all"
  },
  supply: {
    skills: Array<string>,           // UI: Multi-select skill badges
    experience: string,              // junior|mid|senior|lead
    availability: string,            // UI Label: "Meine aktuelle Situation" (pure status, no intent)
                                     // NEW values: employed|freelancer|student|between-jobs|side-projects
                                     // LEGACY values (still accepted): fulltime|freelance|sideproject|passive
    canOffer: Array<string>          // UI Label: "Ich biete an"
                                     // Values: mentoring|code-review|workshop|projects
  },
  demand: {
    seeking: Array<string>,          // UI Label: "Offen für"
                                     // Values: job|freelance|cofounder|collaboration|learning
    activeSearch: boolean | string,  // UI Label: "Wie aktiv?" (3 options)
                                     // NEW values: "active"|"passive"|"networking-only"
                                     // LEGACY values (still accepted): true (→active) | false (→networking-only)
    interests: string                // Free-text field (optional)
    // NOTE: "industries" field removed - skill-based matching is sufficient
  },
  preferences: { privacy: { showInDirectory, allowMatching } },
  createdAt: ISO8601,
  updatedAt: ISO8601
}

// Reverse Indexes (for matching) - ULTRA-SIMPLE v2.1
"skill:{skill}"    → Set<email>  // python, react, machine-learning, ...
"level:{level}"    → Set<email>  // junior, mid, senior, lead
"work:{type}"      → Set<email>  // employed, freelancer, student, between-jobs, side-projects
"loc:{place}"      → Set<email>  // tirol, online, all
```

## Token Types

1. **Confirmation Token** (JWT)
   - Payload: `{ email, type: 'confirm' }`
   - Expiry: 24 hours
   - Use: Email address verification

2. **Profile Token** (JWT)
   - Payload: `{ email, type: 'profile' }`
   - Expiry: Never (long-lived)
   - Use: User preference management

## Environment Variables

```bash
# Redis (Upstash) - IMPORTANT: Use KINNST_ prefix!
KINNST_KV_REST_API_URL=https://...upstash.io
KINNST_KV_REST_API_TOKEN=...

# Email (Resend)
RESEND_API_KEY=...
SENDER_EMAIL="KINN <thomas@kinn.at>"

# AI APIs (for RAUS)
GROQ_API_KEY=...
ASSEMBLYAI_API_KEY=...

# JWT
JWT_SECRET=...

# Admin
ADMIN_USERNAME=...
ADMIN_PASSWORD_HASH=...

# Base URL
BASE_URL="https://kinn.at"
```

**IMPORTANT:** Do NOT use `Redis.fromEnv()` - it looks for `UPSTASH_REDIS_*` vars.
Always use explicit config:
```javascript
const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});
```

## Development Workflow

```bash
# Install dependencies
npm install

# Run locally (Vercel CLI)
vercel dev

# Deploy
vercel --prod
```

## Design Principles

Following Jony Ive's philosophy:
- **Minimal** - Remove everything unnecessary
- **Elegant** - Subtle gradients, soft shadows, refined typography
- **Timeless** - No trends, no emojis, no seasonal effects
- **Purposeful** - Every element serves a function

## GDPR Compliance

- Double opt-in for email subscriptions
- User control over email notifications
- One-click unsubscribe in all emails
- Token-based preference management
- Data deletion on unsubscribe

## Spam Prevention (Emails)

- No emojis in subject lines or body
- No direct webcal:// links in email body
- Simple HTML structure (table-based layout)
- Professional tone and copy
- Clear sender identity
- Unsubscribe link in every email

## Event Workflows (NEW - Nov 2025)

### Admin: Event erstellen

**Option A: User Profil** (`/pages/profil.html` - Session-based)
1. Login via magic link → Session gespeichert
2. Profil → "Dashboard" Tab zeigt Events
3. (Event-Erstellung aktuell nur via Admin-Seite)
4. Events werden in Redis gespeichert

**Option B: Admin-Seite** (`/admin/index.html` - Password-based)
1. Gehe zu `/admin`
2. Admin API Key eingeben (ADMIN_PASSWORD)
3. Event-Form ausfüllen:
   - **Event Type**: Präsenz / Online / Hybrid
   - **Meeting Link**: (zeigt sich bei Online/Hybrid)
   - **Max Capacity**: (zeigt sich bei Präsenz/Hybrid)
4. Submit → Endpoint: `POST /api/events/create`

**Was passiert beim Event-Create:**
- Validation (type, meetingLink requirements, etc.)
- Event ID generiert (`kinn-treff-12-1730123456`)
- Event in Redis gespeichert (`events:config`)
- RSVP-Arrays initialisiert: `{ yes: [], no: [], maybe: [] }`
- ⚠️ **TODO**: Email-Notification an alle Subscriber (noch nicht implementiert!)

### User: Auf Event RSVPen

**Ablauf (wenn Email-Notifications implementiert sind):**
1. User bekommt Email: "KINN Treff #12 - Do 15.2. | Online via Google Meet"
2. Email enthält RSVP-Buttons: `[Zusagen ✓]` `[Absagen ✗]` `[Vielleicht ?]`
3. Klick → `GET /api/rsvp?token=...&event=kinn-12&response=yes`
4. RSVP gespeichert in Redis (`event.rsvps.yes.push(email)`)
5. Success-Page: "Danke für deine Zusage! 29 Personen haben zugesagt"
6. Optional: Phone-Nummer für WhatsApp-Reminder eingeben

### Admin: Google Calendar Invites versenden ✅ IMPLEMENTED

**Workflow (Smart Hybrid - No API, 2 Minuten):**

1. **Copy Subscribers**
   - `/admin` → Teilnehmer Tab
   - Klick auf "📋 Copy All Subscribers for Google Calendar"
   - Alle Emails werden als komma-separierte Liste kopiert

2. **Google Calendar öffnen**
   - Gehe zu [calendar.google.com](https://calendar.google.com)
   - Create Event

3. **Event Details ausfüllen**
   - Title: "KINN Treff #12 - AI & Innovation"
   - Date & Time: z.B. Do 15.12.2025, 18:00-20:00
   - Location: "Coworking Tirol, Innsbruck"

4. **Add Guests**
   - Klick auf "Add guests"
   - Paste Emails (Cmd/Ctrl+V)

5. **Add Google Meet**
   - Klick auf "Add Google Meet video conferencing"
   - Meeting Link wird automatisch generiert

6. **Send Invites**
   - Klick auf "Send" → Done! 🎉
   - Google verschickt automatisch Calendar Invites
   - Native RSVP-Tracking (Yes/No/Maybe)
   - Automatische Reminders (24h, 1h)

**Vorteile:**
- ✅ Professionelle Calendar Invites (nicht Custom HTML)
- ✅ Höhere Verbindlichkeit (native RSVP)
- ✅ Zero API-Setup (keine OAuth, keine Service Accounts)
- ✅ Google übernimmt Reminders, Updates, Cancellations
- ✅ Sync mit allen Calendar Apps (Apple, Outlook, etc.)

**Details:** [`docs/technical/GOOGLE_CALENDAR_WORKFLOW.md`](docs/technical/GOOGLE_CALENDAR_WORKFLOW.md)

### Admin: WhatsApp-Reminder versenden

**Workflow (Template-Generator):**
1. Dashboard → Event → "WhatsApp Reminder"
2. Select:
   - **Template**: "1 Tag vorher" / "2 Stunden vorher" / "Custom"
   - **Filter**: "Yes only" / "Yes + Maybe" / "All"
3. Click "Generate Messages"
4. **Endpoint**: `POST /api/admin/whatsapp-template`
   ```json
   {
     "eventId": "kinn-12",
     "templateType": "1day",
     "rsvpFilter": "yes"
   }
   ```
5. **Response**: Array of messages:
   ```json
   {
     "messages": [
       {
         "phone": "+43 664 123 4567",
         "name": "Thomas",
         "message": "Hey Thomas, morgen um 18:00 ist KINN Treff! 🤖\nMeeting: https://meet.google.com/xyz\nFreue mich auf dich!"
       }
     ],
     "count": 29,
     "missingPhone": ["user3@example.com"]
   }
   ```
6. **Copy Messages** → Paste in WhatsApp Web → Manuell versenden

### iCal Feed: Meeting-Links

**Was sich geändert hat:**
- `/api/calendar.ics` generiert jetzt:
  ```ical
  CONFERENCE:https://meet.google.com/xyz-abc-def
  X-GOOGLE-CONFERENCE:https://meet.google.com/xyz-abc-def
  X-MICROSOFT-SKYPETEAMSMEETINGURL:https://meet.google.com/xyz-abc-def
  DESCRIPTION:...\n\nMeeting Link: https://meet.google.com/xyz-abc-def
  ```
- **Apple Calendar**: Zeigt Meeting-Link clickable an
- **Google Calendar**: "Join with Google Meet" Button
- **Outlook**: Meeting-Link in Description

## Code Style

Apply Windsurf Coding Rules from global CLAUDE.md:
- [CP01] KISS principle
- [CP02] Lines of code = debt
- [EH01] Contextual logging
- [EH02] User-friendly errors
- [SC01] Never log sensitive data
- [SC02] Validate all input
