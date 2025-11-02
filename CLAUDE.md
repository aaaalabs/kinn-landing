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
- **WhatsApp-Template Generator** ✅ NEW
- Admin dashboard for event management
- User profile management with preferences (Supply/Demand matching)
- No OAuth - simple token-based auth

## Brand Guidelines

**IMPORTANT:** All UI components must follow the KINN Brand Styleguide.

### Design & Visual Identity

See: **`KINN_BRAND_STYLEGUIDE.md`** for comprehensive design system:

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

See: **`MARKETING.md`** for complete marketing strategy:

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

See: **`POTENZIALE.md`** for comprehensive feature opportunities:

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
  identity: { name, linkedIn, github, location },
  supply: { skills, experience, availability, canOffer },
  demand: { seeking, industries, activeSearch, interests },
  preferences: { privacy: { showInDirectory, allowMatching } },
  createdAt: ISO8601,
  updatedAt: ISO8601
}

// Reverse Indexes (for matching)
"skill:{skill}" → Set<email>
"demand:{type}" → Set<email>
"supply:{offer}" → Set<email>
"location:{location}" → Set<email>
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
# Redis (Upstash)
KV_REST_API_URL=...
KV_REST_API_TOKEN=...

# Email (Resend)
RESEND_API_KEY=...
SENDER_EMAIL="KINN <thomas@kinn.at>"

# JWT
JWT_SECRET=...

# Admin
ADMIN_USERNAME=...
ADMIN_PASSWORD_HASH=...

# Base URL
BASE_URL="https://kinn.at"
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

## Code Style

Apply Windsurf Coding Rules from global CLAUDE.md:
- [CP01] KISS principle
- [CP02] Lines of code = debt
- [EH01] Contextual logging
- [EH02] User-friendly errors
- [SC01] Never log sensitive data
- [SC02] Validate all input
