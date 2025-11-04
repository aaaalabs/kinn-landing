# KINN MVP - Project Plan & Status

> **Vision:** "Wo Tiroler KI Profil bekommt" - Operating System für Tirols AI Community

**Last Updated:** 2025-02-02

---

## 🔄 Recent Changes

**2025-02-02:** Gravatar Integration - Zero-Friction Profile Pictures
- Automatic avatar via Gravatar (MD5 email hash)
- Elegant fallback: KINN Mint initials avatar
- Zero signup friction (no upload needed)
- Privacy-first: User controls via gravatar.com
- Philosophy: "Skills > Aussehen" - optional not required

**2025-02-02:** Redis Schema v2.1 - Key Renaming for Clarity
- `xp:*` → `level:*` (more professional, less gaming-associated)
- `status:*` → `work:*` (more precise, avoids namespace collision)
- Reason: Better naming = clearer code + future-proof

**2025-02-02:** Redis Schema v2.0 - ULTRA-SIMPLE Architecture
- Reduced from 7+ index types to 4 core types
- Added: `level:`, `work:`, `loc:` indexes
- Removed: Old `supply:senior+`, `demand:*`, `location:*` keys

**2025-02-02:** Profile UX Optimization
- Added Portfolio field to "Ich" tab
- Removed redundant H2 from "Angebot" tab
- Reorganized "Angebot" flow: Kontext → Value → Details

---

## 📊 Current Status: MVP Phase 1 (LIVE)

### ✅ Core Features (DEPLOYED)

#### 1. Email Subscription & Events
- [x] Landing Page mit Signup
- [x] Double Opt-in Flow
- [x] Event Management (Admin Dashboard)
- [x] iCal Feed für Calendar-Sync
- [x] RSVP System (Ja/Nein/Vielleicht)
- [x] WhatsApp Template Generator
- [x] Event Types: Präsenz, Online, Hybrid

#### 2. User Profiles
- [x] Magic Link Authentication (MVA)
- [x] Profile Page mit 3 Tabs:
  - Tab "Ich": Name, LinkedIn, GitHub, Portfolio, Event-Präferenz
  - Tab "Angebot": Erfahrung, Situation, Skills, Ich biete an
  - Tab "Suche": Offen für, Wie aktiv?, Interessen, Privacy
- [x] Skill Selection (95 AI Skills mit Domain-Filters)
- [x] Supply/Demand Matching Framework
- [x] Auto-save Skills
- [x] Gravatar Integration (automatic profile pictures with initials fallback)

#### 3. Data Infrastructure
- [x] Redis Schema v2.1 (ULTRA-SIMPLE)
  - `skill:*` - Skill Matching
  - `level:*` - Experience Level (junior, mid, senior, lead)
  - `work:*` - Work Status (employed, freelancer, student, etc.)
  - `loc:*` - Location (tirol, online, all)
- [x] Profile Storage (JSON Hashes)
- [x] Match Hints System

#### 4. Admin Tools
- [x] Admin Dashboard (Session-based + Password-based)
- [x] Event Creation & Management
- [x] Subscriber List with RSVP Filters
- [x] WhatsApp Template Generator
- [x] Redis Migration Endpoints

#### 5. Brand & UX
- [x] KINN Brand Styleguide implementiert
- [x] Jony Ive Design Principles
- [x] Tyrolean German Voice ("KINN'der")
- [x] Progressive Disclosure (Tabs statt Long Scroll)
- [x] Kontext→Value→Details Flow (UX Optimierung)

---

## 🚧 Phase 2: Matching & Directory (NEXT)

**Goal:** Enable Member-to-Member Discovery

### Priority 1: User Matching (P0)

#### Feature: "Zeig mir passende KINN'der"
- [ ] Match-Algorithmus implementieren
  - Skill-based Matching
  - Experience-Level Matching
  - Location-based Matching
  - Supply ↔ Demand Matching (z.B. "Suche Learning" ↔ "Biete Mentoring")
- [ ] Match-Results Page
  - Top 10 Matches anzeigen
  - Match-Score berechnen
  - Filter: Skills, Experience, Location
- [ ] Notification: "Neue Matches verfügbar"

**Why Important:**
- Core Value Proposition: "KINN matcht dich mit passenden Leuten"
- Network Effects: Je mehr User, desto besser die Matches
- User Retention: Regelmäßige Match-Updates

**Estimated Effort:** 6-8 hours

---

### Priority 2: Directory Index (P0)

#### Feature: Privacy-Index für Matching
- [ ] `directory:public` Set implementieren
  - Opt-in via `preferences.privacy.showInDirectory`
  - Automatisches Add/Remove bei Profil-Update
- [ ] Admin: Directory Stats
  - Anzahl öffentlicher Profile
  - Top Skills
  - Distribution (XP, Status, Location)

**Why Important:**
- Privacy First: Nur Opt-in Profile sichtbar
- Foundation für Public Directory (Phase 3)
- Marketing: "X KINN'der im Directory"

**Estimated Effort:** 2-3 hours

---

### Priority 3: Profile View (P1)

#### Feature: "Andere Profile ansehen"
- [ ] Public Profile Page
  - `/profile/{username}` oder `/profile/{email-hash}`
  - Zeigt: Name, Skills, Experience, Angebote
  - Privacy-respecting (nur wenn showInDirectory=true)
- [ ] Link zu Profil in Match-Results
- [ ] Optional: QR Code Generator für Profil

**Why Important:**
- Transparency: User können sehen wer sie matcht
- Trust Building: Profile mit Content = seriöser
- Viral Loop: Shareable Profile Links

**Estimated Effort:** 4-5 hours

---

## 🔮 Phase 3: Public Directory & Trust (LATER)

**Goal:** Become Talent Hub for Tirol

### Feature: Public Directory
- [ ] `/directory` Page
  - Suchbar & Filterbar
  - Sortierung: Aktualität, Experience, etc.
  - Nur Opt-in Profile
- [ ] Query-Interface
  - "Senior Python Devs in Tirol"
  - "Freelancer mit React"
  - "Juniors die Learning suchen"
- [ ] SEO-Optimierung
  - Meta-Tags für Directory
  - Open Graph für Profile-Shares
  - Sitemap für Google

**Why Important:**
- External Discovery: Firmen finden KINN'der
- SEO Value: "AI Devs Tirol" Rankings
- Revenue Potential: Premium Listings

**Estimated Effort:** 12-15 hours

---

### Feature: Verified Badge
- [ ] Admin: User verifizieren
  - `verified:true` Set
  - Badge im Profil anzeigen
- [ ] Verification Process
  - 1:1 Gespräch mit KINN Core
  - Verification Criteria dokumentieren
- [ ] Directory Filter: "Nur Verifizierte"

**Why Important:**
- Trust Signal: "KINN-verified" = Quality
- Differentiation: Verified vs. Non-Verified
- Network Effects: Verification = Status-Symbol

**Estimated Effort:** 3-4 hours

---

### Feature: Activity Tracking
- [ ] `activity:last-seen` Sorted Set
  - Update bei Login, Profil-Update, etc.
- [ ] Directory: "Aktive zuerst" Sortierung
- [ ] Profile: "Zuletzt aktiv vor X Tagen"
- [ ] Admin: Activity Dashboard

**Why Important:**
- Recency: Aktive User bevorzugen
- Engagement: Inactive User reaktivieren
- Metrics: Retention trackbar

**Estimated Effort:** 3-4 hours

---

## 💡 Phase 4: Advanced Features (FUTURE)

**Goal:** Platform Features for Monetization

### Quick Wins (from POTENZIALE.md)

#### 1. Email Forwards mit AI-Matching
- `vorname@kinn.at` → AI analysiert Anfrage → Match gegen DB → Forward mit Context
- **Revenue:** Free (5/mo) | Pro (€15/mo unlimited) | Enterprise (€200/mo)

#### 2. QR Code Mini-Profiles
- `code.kinn.at/thomas` → Instant Profile Card
- Print-ready Business Cards
- Analytics: Wer scannt dein Profil?

#### 3. KINN Spotlight
- Member Storytelling
- Interview-Format
- Showcase Projects
- SEO + Social Media Content

### Strategic Plays

#### 4. Reverse Job Board
- Members posten was sie suchen
- Firmen durchsuchen Board
- **Revenue:** Freemium + Premium Listings

#### 5. KINN Verified API
- Programmatic Access zu Directory
- "KINN Score" für Talent
- **Revenue:** API Credits

#### 6. Learning Hub
- Peer-to-Peer Knowledge Sharing
- Workshop-Recordings
- Resource Library

---

## 🎯 Success Metrics

### Phase 1 (Current)
- [x] 100+ Email Subscribers ✅ (Target: 150 by March)
- [x] 50+ Complete Profiles ✅ (Target: 75 by March)
- [x] 80%+ Event RSVP Rate ✅

### Phase 2 (Matching)
- [ ] 70%+ Users have ≥1 Match
- [ ] 40%+ Directory Opt-in Rate
- [ ] 5+ Profile Views per User/Month

### Phase 3 (Directory)
- [ ] 500+ Directory Profiles
- [ ] 100+ External Directory Searches/Week
- [ ] 10+ "KINN-verified" Members

### Phase 4 (Monetization)
- [ ] 20+ Premium Subscribers
- [ ] €500 MRR (Monthly Recurring Revenue)
- [ ] 5+ Enterprise Clients

---

## 🔧 Technical Debt & Improvements

### High Priority
- [ ] Email Template System (DRY - aktuell 3x duplicated)
- [ ] Error Handling in Frontend (User-friendly Messages)
- [ ] Loading States für alle Async Operations
- [ ] Rate Limiting für Signup/Login

### Medium Priority
- [ ] Redis Cleanup Logic (wenn >100 User)
- [ ] Profile Validation (z.B. LinkedIn URL Format)
- [ ] Image Uploads (Profile Pictures)
- [ ] Mobile Responsiveness Review

### Low Priority
- [ ] TypeScript Migration (Frontend)
- [ ] Test Suite (E2E Testing)
- [ ] Performance Monitoring (Upstash Analytics)
- [ ] CDN für Static Assets

---

## 📅 Timeline (Estimate)

```
Feb 2025:  Phase 2 - Matching & Directory Index
Mar 2025:  Phase 2 - Profile Views + Polish
Apr 2025:  Phase 3 - Public Directory Launch
May 2025:  Phase 3 - Verified Badge + Activity
Jun 2025:  Phase 4 - Email Forwards (MVP)
Jul 2025:  Phase 4 - QR Codes + Advanced Features
```

**Note:** Timeline ist flexibel und user-feedback-driven!

---

## 🎨 Brand & Marketing Alignment

### Completed
- [x] KINN Brand Styleguide implementiert
- [x] "KINN'der" Community-Naming
- [x] Tyrolean German Voice
- [x] Clean, minimal Design (Jony Ive)

### Ongoing
- [ ] Content Strategy (KINN Spotlight)
- [ ] Social Media Presence (LinkedIn, Twitter)
- [ ] SEO Optimization (Directory Launch)
- [ ] Partnership Outreach (Universities, Companies)

### Future
- [ ] KINN Verified Badge Marketing
- [ ] Email Newsletter (Monthly Roundup)
- [ ] Event-driven Marketing (Workshops, Sprints)
- [ ] Community-Governance (KINN'der an die Macht!)

---

## 💭 Open Questions & Decisions

### Phase 2
- **Q:** Wie berechnen wir Match-Score? (Skill-Overlap vs. Supply↔Demand)
- **Q:** Notification-Frequency für neue Matches? (Weekly Digest?)
- **Q:** Profile-URL-Format? (`/p/thomas` vs. `/profile/thomas@email.com`)

### Phase 3
- **Q:** Verification Criteria? (1:1 Call, Event-Attendance, Peer-Vouching?)
- **Q:** Directory Paywall? (Free Basic, Pro Advanced Filters?)
- **Q:** Activity Threshold? ("Aktiv" = last 30 days?)

### Phase 4
- **Q:** Pricing Strategy für Premium Features?
- **Q:** Revenue-Share mit KINN Core Team?
- **Q:** Legal Entity gründen? (Verein, GmbH?)

---

## 🚀 How to Contribute

**For Developers:**
1. Check this plan for open tasks
2. Pick a feature from Phase 2 (high priority)
3. Create feature branch: `feat/matching-algorithm`
4. Open PR with description referencing this plan

**For KINN Core:**
1. Review Phase 2 priorities
2. Provide feedback on Roadmap
3. Test deployed features on kinn.at
4. Report bugs/ideas in GitHub Issues

**For KINN'der:**
1. Fill out your profile completely
2. Opt-in to Directory (Phase 2)
3. Provide feedback on Matching (Phase 2)
4. Spread the word! 🚀

---

**Status Legend:**
- [x] Done & Deployed
- [ ] Planned but not started
- [~] In Progress (partially done)

**Last Review:** 2025-02-02 by Claude Code
**Next Review:** 2025-02-15 (after Phase 2 features)
