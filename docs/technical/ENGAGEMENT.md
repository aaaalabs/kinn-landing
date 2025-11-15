# KINN Event Engagement Tracking System

**Version:** 1.0
**Status:** Planning
**Last Updated:** 2025-11-12

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [Data Structures](#2-data-structures)
3. [User Flows](#3-user-flows)
4. [UI Design](#4-ui-design)
5. [API Specifications](#5-api-specifications)
6. [Newsletter RSVP Integration](#6-newsletter-rsvp-integration)
7. [Analytics & Reports](#7-analytics--reports)
8. [Implementation Phases](#8-implementation-phases)

---

## 1. Overview & Goals

### Problem Statement

At the early stage of KINN (2-3 events), Thomas needs to:
- Track who actually shows up vs. who just RSVPs
- Avoid spamming no-shows with repeated personal invitations
- Build reliable data for future event planning
- Understand engagement patterns BEFORE the community grows too large

### Goals

1. **Track Engagement Lifecycle:**
   - Personal invitation sent (DM/WhatsApp)
   - User confirmed attendance (DM reply or Newsletter RSVP)
   - User actually attended (post-event check-in)

2. **Prevent Spam:**
   - Identify chronic no-shows (0% show-up rate, 2+ invites)
   - Warn admin before sending another personal invite
   - Maintain deliverability reputation

3. **Enable Retroactive Data Entry:**
   - Enter attendance for past events (Event #1, #2)
   - Compute show-up rates across all historical events
   - Sync data efficiently between events

4. **Integrate with Newsletter System:**
   - Newsletter contains RSVP buttons: "Komme" / "Vielleicht" / "Diesmal nicht"
   - Clicks automatically track engagement (no manual DM tracking needed)
   - Reduces admin workload

---

## 1.5 Communication Channels: Newsletter vs. Google Calendar Invites

### Critical Distinction

KINN uses **two separate communication channels** for event invitations, each serving different purposes and audiences:

#### 1. Newsletter Aussendungen (Broadcast Channel)

**Purpose:** General event awareness and RSVP collection

**Audience:** ALL subscribers (opt-out based)
- Sent to entire mailing list
- Users can opt-out by:
  - Clicking "Abmelden" link in email footer
  - Disabling notifications in profile settings (`preferences.notifications.enabled = false`)

**Content:**
- Event announcements
- RSVP buttons (yes/maybe/no)
- General updates and community news
- Educational content (e.g., Profile Walkthrough)

**Sending Method:**
- Resend API (`/api/newsletter/send`)
- Bulk sending with batch processing
- Rate limiting: 2 requests/hour

**Filter Query:**
```javascript
// Get all newsletter-eligible subscribers
const subscribers = await getAllSubscribers();
const eligible = subscribers.filter(async (email) => {
  const preferences = await getUserPreferences(email);
  return preferences?.notifications?.enabled !== false;
});
```

**Use Cases:**
- First event invitation (to all)
- Re-engagement campaigns
- Community updates
- Profile feature announcements

---

#### 2. Google Calendar Einladungen (Curated Channel)

**Purpose:** High-commitment, personal invitations for engaged community members

**Audience:** **Filtered subset** based on engagement history
- Has attended at least once (proven interest)
- OR wanted to come but couldn't (confirmed but no-show)
- OR registered AFTER last event (missed previous Google Calendar invite)

**Content:**
- Native Google Calendar invitation
- Automatic reminders (24h, 1h before event)
- Native RSVP tracking (Yes/No/Maybe)
- Meeting link auto-sync

**Sending Method:**
- Manual copy-paste workflow (see [`GOOGLE_CALENDAR_WORKFLOW.md`](./GOOGLE_CALENDAR_WORKFLOW.md))
- Admin copies filtered email list from `/admin`
- Pastes into Google Calendar "Add guests"
- Google handles delivery and tracking

**Filter Query:**
```javascript
// Get Google Calendar invite-eligible subscribers
async function getGoogleCalendarEligible(currentEventId) {
  const subscribers = await getAllSubscribers();
  const eventsConfig = await getEventsConfig();
  const currentEvent = eventsConfig.events.find(e => e.id === currentEventId);

  if (!currentEvent) return [];

  const eligible = [];

  for (const email of subscribers) {
    const profile = await getProfile(email);
    const preferences = await getUserPreferences(email);

    // Skip if notifications disabled
    if (preferences?.notifications?.enabled === false) {
      continue;
    }

    // Filter criteria
    const stats = profile?.engagement?.stats || {};
    const subscribedAt = new Date(preferences?.subscribedAt || 0);
    const lastEventDate = new Date(eventsConfig.events
      .filter(e => e.status === 'past')
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date || 0);

    const hasAttended = stats.totalAttended > 0;
    const wantedToCome = stats.totalConfirmed > stats.totalAttended;
    const registeredAfterLastEvent = subscribedAt > lastEventDate;

    if (hasAttended || wantedToCome || registeredAfterLastEvent) {
      eligible.push({
        email,
        name: profile?.identity?.name || email.split('@')[0],
        reason: hasAttended
          ? 'past-attendee'
          : wantedToCome
          ? 'wanted-to-come'
          : 'new-subscriber'
      });
    }
  }

  return eligible;
}
```

**Use Cases:**
- Event #2, #3+ (after first event establishes engagement)
- High-commitment events (limited capacity)
- VIP/early access invitations
- Follow-up invites for no-shows who want to come

---

### Why This Distinction Matters

#### 1. **Spam Prevention**
- **Newsletter:** Broad reach acceptable (opt-out available)
- **Google Calendar:** Curated list prevents Gmail spam flags
- Sending native Calendar invites to disengaged users = high spam risk

#### 2. **Quality Over Quantity**
- **Newsletter:** Awareness-driven (low commitment)
- **Google Calendar:** Attendance-driven (high commitment)
- Calendar invites = "You're part of the core community"

#### 3. **Resource Efficiency**
- **Newsletter:** Automated batch sending
- **Google Calendar:** Manual curation (2 minutes per event)
- Filtering saves time and improves deliverability

#### 4. **User Experience**
- **Newsletter:** Casual, can ignore if busy
- **Google Calendar:** Native reminders, syncs to all devices
- Calendar invites feel more personal and official

---

### Implementation: Admin UI Filters

#### In `/admin/index.html` (Teilnehmer Tab)

**Add two copy-paste buttons:**

```html
<!-- Existing button -->
<button onclick="copyNewsletterSubscribers()">
  📧 Copy All Subscribers (Newsletter)
</button>

<!-- NEW button -->
<button onclick="copyGoogleCalendarEligible()">
  📅 Copy Eligible for Google Calendar Invite
</button>
```

**Logic:**

```javascript
async function copyNewsletterSubscribers() {
  // Existing logic: all subscribers with notifications enabled
  const response = await fetch('/api/admin/subscribers?notifications=enabled&format=text', {
    headers: { 'Authorization': `Bearer ${adminPassword}` }
  });
  const emails = await response.text();
  await navigator.clipboard.writeText(emails);
  showNotification(`Copied ${emails.split(', ').length} emails for newsletter`);
}

async function copyGoogleCalendarEligible() {
  // NEW logic: filter by engagement history
  const currentEventId = getCurrentEventId(); // Get from UI context

  const response = await fetch(
    `/api/admin/subscribers?filter=google-calendar-eligible&event=${currentEventId}&format=text`,
    { headers: { 'Authorization': `Bearer ${adminPassword}` } }
  );

  const data = await response.json();
  const emails = data.emails.join(', ');

  await navigator.clipboard.writeText(emails);

  // Show breakdown
  showNotification(`
    Copied ${data.count} emails for Google Calendar:
    • ${data.breakdown.pastAttendees} past attendees
    • ${data.breakdown.wantedToCome} wanted to come
    • ${data.breakdown.newSubscribers} new subscribers

    Excluded: ${data.excluded} (never engaged)
  `);
}
```

---

### API Extension: `/api/admin/subscribers`

**Add new filter option:**

```javascript
// In /api/admin/subscribers.js

const {
  filter = 'all',
  event,
  notifications = 'all',
  format = 'json',
  channel = 'newsletter' // NEW: 'newsletter' | 'google-calendar'
} = req.query;

if (channel === 'google-calendar') {
  // Apply engagement-based filtering
  const eventsConfig = await getEventsConfig();
  const currentEvent = eventsConfig.events.find(e => e.id === event);

  if (!currentEvent) {
    return res.status(400).json({
      error: 'Event ID required for google-calendar filter'
    });
  }

  const eligible = [];
  const breakdown = {
    pastAttendees: 0,
    wantedToCome: 0,
    newSubscribers: 0
  };

  for (const email of subscribersData.map(s => s.email)) {
    const profile = await getProfile(email);
    const preferences = await getUserPreferences(email);

    // Skip if notifications disabled
    if (preferences?.notifications?.enabled === false) continue;

    const stats = profile?.engagement?.stats || {};
    const subscribedAt = new Date(preferences?.subscribedAt || 0);
    const lastEventDate = new Date(eventsConfig.events
      .filter(e => e.status === 'past')
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date || 0);

    const hasAttended = stats.totalAttended > 0;
    const wantedToCome = stats.totalConfirmed > stats.totalAttended;
    const registeredAfterLastEvent = subscribedAt > lastEventDate;

    if (hasAttended) {
      eligible.push(email);
      breakdown.pastAttendees++;
    } else if (wantedToCome) {
      eligible.push(email);
      breakdown.wantedToCome++;
    } else if (registeredAfterLastEvent) {
      eligible.push(email);
      breakdown.newSubscribers++;
    }
  }

  const excluded = subscribersData.length - eligible.length;

  if (format === 'text') {
    return res.send(eligible.join(', '));
  }

  return res.json({
    success: true,
    data: {
      count: eligible.length,
      emails: eligible,
      breakdown,
      excluded
    }
  });
}
```

---

### Decision Tree: Which Channel to Use?

```
Event Invitation Decision Flow
═══════════════════════════════

Is this Event #1?
├─ YES → Newsletter to ALL (awareness campaign)
└─ NO  → Dual approach:
         ├─ Newsletter to ALL (broad awareness)
         └─ Google Calendar to ENGAGED (high commitment)

Who gets Google Calendar invite?
├─ Has attended before? → YES
├─ Confirmed but no-show (wanted to come)? → YES
├─ Subscribed after last event? → YES
└─ Otherwise (never engaged) → NO (newsletter only)

Notifications disabled in settings?
└─ Excluded from BOTH channels
```

---

### Example Scenario: Event #3 Planning

**Context:**
- Event #3 on Dec 20, 2025
- 50 total subscribers
- Event #1: 12 attended
- Event #2: 15 attended (3 new, 9 returning)
- 10 new subscribers since Event #2

**Newsletter Broadcast:**
- Send to: 48 (50 minus 2 with notifications disabled)
- Purpose: General awareness, RSVP collection
- Expected: ~20 RSVP clicks (40% rate)

**Google Calendar Invites:**
- Send to: 22 subscribers
  - 15 past attendees (Events #1 or #2)
  - 5 no-shows who confirmed (wanted to come)
  - 2 new subscribers registered after Event #2 (couldn't get invite before)
- Purpose: High-commitment core community
- Expected: ~18 "Yes" RSVPs (80% rate)

**Excluded from Google Calendar:**
- 28 subscribers (50 - 22)
  - Never attended
  - Never confirmed interest
  - Subscribed before last event (had opportunity, didn't engage)
- Reasoning: Sending Calendar invites = spam risk, low ROI

**Result:**
- Total reach: 48 (newsletter)
- High-commitment invites: 22 (Google Calendar)
- Expected attendance: ~20 (based on 80% show-up rate of committed group)

---

### Migration Plan

**Phase 1 (Current):** Manual tracking in engagement UI
- Admin manually marks who was invited via Google Calendar
- Checkbox: "📅 Google Calendar Sent"

**Phase 2 (Future):** One-click copy-paste with filtering
- Admin clicks "Copy for Google Calendar" → filtered list
- UI shows breakdown (past attendees, wanted to come, new)

**Phase 3 (Optional):** Automated sync
- Google Calendar API integration
- Auto-detect who received Calendar invite
- Sync RSVP status from Google Calendar

---

## 2. Data Structures

### 2.1 Redis Schema

#### Event-Level Storage (Primary)

**Key:** `events:config`

```javascript
{
  events: [
    {
      // Existing fields
      id: "kinn-2025-12-20",
      type: "in-person" | "online" | "hybrid",
      title: "KINN Treff #3 - AI & Innovation",
      description: "...",
      location: "Coworking Tirol",
      meetingLink: null,
      date: "2025-12-20",
      startTime: "18:00",
      endTime: "20:00",
      start: "2025-12-20T17:00:00.000Z", // UTC
      end: "2025-12-20T19:00:00.000Z",   // UTC
      status: "confirmed",
      maxCapacity: 25,

      // Existing RSVP tracking
      rsvps: {
        yes: ["user1@example.com", "user2@example.com"],
        maybe: ["user3@example.com"],
        no: ["user4@example.com"]
      },

      // NEW: Engagement tracking
      engagement: {
        // Personal outreach tracking
        personallyInvited: [
          "thomas@kinn.at",
          "manfred@example.com",
          "christian@example.com"
        ],

        // DM confirmations (manual or via Newsletter RSVP)
        confirmedDM: [
          "thomas@kinn.at",
          "christian@example.com"
        ],

        // Actually attended (filled after event)
        attended: [
          // Empty until event is over
        ],

        // Newsletter RSVP source tracking (NEW)
        newsletterRSVP: {
          yes: ["thomas@kinn.at"],
          maybe: ["christian@example.com"],
          no: ["manfred@example.com"]
        }
      },

      createdAt: "2025-11-12T10:00:00.000Z"
    }
  ],

  defaults: {
    timezone: "Europe/Vienna",
    organizer: "thomas@kinn.at",
    categories: ["KI", "AI", "Networking", "Innsbruck"],
    reminder: "24h"
  }
}
```

#### User-Level Storage (Computed Stats)

**Key:** `profile:{email}`

```javascript
{
  email: "thomas@kinn.at",

  identity: {
    name: "Thomas Seiger",
    linkedIn: "...",
    github: "...",
    location: "in-person"
  },

  supply: { /* ... */ },
  demand: { /* ... */ },
  preferences: { /* ... */ },

  // NEW: Engagement statistics
  engagement: {
    // Aggregate stats (computed from all events)
    stats: {
      totalEventsInvited: 3,      // How many events personally invited to
      totalConfirmed: 2,           // How many DM/Newsletter confirmations
      totalAttended: 2,            // How many actually showed up
      showUpRate: 0.67,            // 2/3 = 67%
      lastAttended: "2025-11-07",  // Most recent event attended
      streak: 2                    // Consecutive events attended
    },

    // Event-by-event history (computed from events:config)
    history: {
      "kinn-2025-11-07": {
        invited: true,
        confirmedDM: false,
        attended: true,
        source: "walk-in"  // Came without RSVP
      },
      "kinn-2025-10-15": {
        invited: true,
        confirmedDM: true,
        attended: false,    // NO-SHOW!
        source: "newsletter"
      },
      "kinn-2025-09-20": {
        invited: false,
        confirmedDM: false,
        attended: true,
        source: "walk-in"
      }
    }
  },

  createdAt: "2025-09-15T12:00:00.000Z",
  updatedAt: "2025-11-12T10:00:00.000Z"
}
```

### 2.2 Data Sync Strategy

**Principle:** Event data is **source of truth**, User stats are **computed on-demand**.

**Write Flow:**
1. Admin updates engagement for Event #3 (e.g., marks "attended")
2. Update `events:config` → `event.engagement.attended.push(email)`
3. Trigger: Recompute `profile:{email}.engagement` stats
4. Computed stats are cached in user profile for fast reads

**Read Flow:**
1. Admin opens Event #3 engagement page
2. Fetch `events:config` → get event.engagement
3. For each subscriber, fetch `profile:{email}.engagement.stats`
4. Display: Show-up rate, warnings, history

**Efficiency:**
- Writing: O(1) - Update event, then update 1 user profile
- Reading: O(n) - Fetch all subscriber profiles (but cached)
- Retroactive: When entering Event #1 data → recompute all affected users once

---

## 3. User Flows

### 3.1 Flow: Newsletter RSVP (NEW - Primary Method)

**Timeline:** 1 week before event

**Steps:**
1. Thomas creates Event #3 in admin panel
2. Thomas clicks "Send Newsletter" with RSVP buttons
3. Newsletter contains:
   ```
   KINN Treff #3 - 20. Dezember 2025

   [Komme ✓] [Komm vielleicht ?] [Diesmal nicht ✗]
   ```
4. User clicks button → GET `/api/events/rsvp?eventId=kinn-2025-12-20&response=yes&token=...`
5. System updates:
   - `events:config` → `event.engagement.newsletterRSVP.yes.push(email)`
   - `events:config` → `event.engagement.confirmedDM.push(email)` (if yes/maybe)
   - `events:config` → `event.rsvps.yes.push(email)` (existing RSVP system)
6. User sees confirmation page: "Danke! Du bist dabei."

**Advantages:**
- ✅ No manual DM tracking needed
- ✅ Automatic sync with engagement system
- ✅ User-friendly one-click RSVP
- ✅ Reduces WhatsApp/Email clutter

### 3.2 Flow: Manual DM Tracking (Fallback)

**Timeline:** Before event

**Steps:**
1. Thomas sends personal WhatsApp/Email to selected users
2. Opens `/admin/events/kinn-2025-12-20/engagement`
3. For each user who received DM, checks "📧 DM Sent"
4. When user replies "Ja, bin dabei", checks "✓ Zusage"
5. Clicks "Save All"
6. System updates `events:config` → `event.engagement.personallyInvited`, `confirmedDM`

**Use Cases:**
- Personal 1:1 invites (not via newsletter)
- WhatsApp group confirmations
- Verbal confirmations at other events

### 3.3 Flow: Post-Event Attendance Recording

**Timeline:** After event

**Steps:**
1. Event is over, Thomas opens `/admin/events/kinn-2025-12-20/engagement`
2. UI shows list of all subscribers with checkboxes pre-filled:
   - "📧 DM" = already filled (from pre-event tracking)
   - "✓ Zusage" = already filled (from Newsletter RSVP or manual)
   - "✓ Kam" = empty (to be filled now)
3. Thomas checks "✓ Kam" for everyone who actually showed up
4. Alternative: Bulk action "Mark all with 'Zusage' as attended" (quick default)
5. Clicks "Save All"
6. System:
   - Updates `events:config` → `event.engagement.attended`
   - Recomputes `profile:{email}.engagement.stats` for all affected users
   - Updates show-up rates across all events

**Edge Cases:**
- Walk-ins (no RSVP): Can manually check "✓ Kam" without "Zusage"
- No-shows: "✓ Zusage" checked but "✓ Kam" unchecked → triggers warning for next event

### 3.4 Flow: Retroactive Data Entry

**Timeline:** Anytime

**Steps:**
1. Thomas wants to enter data for Event #1 (already past)
2. Opens `/admin/events/kinn-2025-10-15/engagement`
3. UI shows all subscribers at that time
4. Thomas checks "✓ Kam" for everyone he remembers attending
5. Optionally checks "📧 DM" if he remembers sending personal invites
6. Clicks "Save All"
7. System:
   - Updates Event #1 data
   - Recomputes all user stats
   - Next time he opens Event #2 or #3, show-up rates are updated! ✅

---

## 4. UI Design

### 4.1 Admin Event List (Updated)

**Location:** `/admin/index.html` (Events Tab)

**Changes:**
- Add "Engagement" button to each event card
- Show quick stats: "8/12 attended (67%)"

**Mockup:**

```
┌─────────────────────────────────────────────────────────────┐
│ Events                                         [+ New Event] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ KINN Treff #3 - 20. Dezember 2025                       │ │
│ │ Status: Geplant | Online (Google Meet)                  │ │
│ │                                                          │ │
│ │ RSVPs: 15 Yes, 3 Maybe, 2 No                            │ │
│ │ Engagement: 12 persönlich eingeladen                    │ │
│ │                                                          │ │
│ │ [Details] [Engagement] [Send Invites]                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ KINN Treff #2 - 7. November 2025                        │ │
│ │ Status: Vergangen | Hybrid                              │ │
│ │                                                          │ │
│ │ RSVPs: 12 Yes, 2 Maybe                                  │ │
│ │ Attendance: 8/12 attended (67%)                         │ │
│ │                                                          │ │
│ │ [Details] [Engagement] [View Report]                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Engagement Detail Page (NEW)

**Location:** `/admin/event-engagement.html`
**URL:** `/admin/event-engagement.html?eventId=kinn-2025-12-20`

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│ ← Zurück zu Events                                   [Admin] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ KINN Treff #3 - 20. Dezember 2025                           │
│ Status: Geplant | Online (Google Meet)                      │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Quick Stats                                            │  │
│ │ • 27 Total Subscribers                                 │  │
│ │ • 12 Persönlich eingeladen (44%)                       │  │
│ │ • 10 DM-Zusagen (83% von eingeladenen)                 │  │
│ │ • 0 Gekommen (Event noch nicht vorbei)                 │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Filters & Actions                                      │  │
│ │                                                         │  │
│ │ Search: [__________]  Filter: [Alle ▼]  Sort: [Rate ▼] │  │
│ │                                                         │  │
│ │ Filter Options:                                         │  │
│ │ • Alle (27)                                             │  │
│ │ • ✨ Neue User (5) - Noch nie eingeladen               │  │
│ │ • ✅ Hohe Show-Up Rate >70% (12)                        │  │
│ │ • ⚠️ Niedrige Rate <30% (2) - Spam-Risiko              │  │
│ │ • 📧 Persönlich eingeladen (12)                         │  │
│ │ • ✓ DM-Zusagen (10)                                     │  │
│ │                                                         │  │
│ │ [💾 Save All] [✓ Mark All Attended] [📊 Export CSV]    │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Participants List                                        ││
│ │                                                          ││
│ │ ┌────────────────────────────────────────────────────┐  ││
│ │ │ Thomas S.                       Rate: ✅ 100% (3/3) │  ││
│ │ │ thomas@kinn.at                                     │  ││
│ │ │                                                    │  ││
│ │ │ ┌──────────┬──────────┬──────────┐                │  ││
│ │ │ │ 📧 DM    │ ✓ Zusage │ ✓ Kam    │                │  ││
│ │ │ │ [x] Sent │ [x] Yes  │ [ ] TBD  │                │  ││
│ │ │ └──────────┴──────────┴──────────┘                │  ││
│ │ │                                                    │  ││
│ │ │ History: ✓ #1  ✓ #2  ✓ #3                         │  ││
│ │ │ Source: Newsletter RSVP (2025-11-13)              │  ││
│ │ │ Note: Zuverlässig - immer dabei! 🌟               │  ││
│ │ └────────────────────────────────────────────────────┘  ││
│ │                                                          ││
│ │ ┌────────────────────────────────────────────────────┐  ││
│ │ │ Manfred                          Rate: ✨ NEW      │  ││
│ │ │ manfred@example.com                                │  ││
│ │ │                                                    │  ││
│ │ │ ┌──────────┬──────────┬──────────┐                │  ││
│ │ │ │ 📧 DM    │ ✓ Zusage │ ✓ Kam    │                │  ││
│ │ │ │ [x] Sent │ [ ] No   │ [ ] TBD  │                │  ││
│ │ │ └──────────┴──────────┴──────────┘                │  ││
│ │ │                                                    │  ││
│ │ │ History: (leer)                                    │  ││
│ │ │ Source: Personal WhatsApp (2025-11-14)            │  ││
│ │ │ Note: Erste Einladung - probieren!                │  ││
│ │ └────────────────────────────────────────────────────┘  ││
│ │                                                          ││
│ │ ┌────────────────────────────────────────────────────┐  ││
│ │ │ test@example.com                Rate: ⚠️ 0% (0/2)  │  ││
│ │ │                                                    │  ││
│ │ │ ┌──────────┬──────────┬──────────┐                │  ││
│ │ │ │ 📧 DM    │ ✓ Zusage │ ✓ Kam    │                │  ││
│ │ │ │ [x] Sent │ [ ] No   │ [ ] TBD  │                │  ││
│ │ │ └──────────┴──────────┴──────────┘                │  ││
│ │ │                                                    │  ││
│ │ │ History: ✗ #1  ✗ #2                                │  ││
│ │ │ Source: Newsletter (No response)                  │  ││
│ │ │                                                    │  ││
│ │ │ ⚠️ WARNING: 0 shows in 2 invites                   │  ││
│ │ │ → Skip personal invite (Spam-Risiko!)             │  ││
│ │ └────────────────────────────────────────────────────┘  ││
│ │                                                          ││
│ │ ... (more cards)                                         ││
│ │                                                          ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ [💾 Save All] [✓ Mark All Attended] [📊 Export CSV]         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Mobile Layout:**

```
┌────────────────────┐
│ ← Events           │
├────────────────────┤
│ KINN Treff #3      │
│ 20. Dez 2025       │
│                    │
│ Stats:             │
│ • 27 Subscriber    │
│ • 12 eingeladen    │
│ • 10 zugesagt      │
│                    │
│ [Filter] [Sort]    │
├────────────────────┤
│ Thomas S.          │
│ Rate: ✅ 100%      │
│                    │
│ 📧 [x] ✓ [x] 👤[ ] │
│ DM    Zu    Kam    │
│                    │
│ ✓#1 ✓#2 ✓#3        │
│ 🌟 Zuverlässig     │
├────────────────────┤
│ Manfred            │
│ Rate: ✨ NEW       │
│                    │
│ 📧 [x] ✓ [ ] 👤[ ] │
│ DM    Zu    Kam    │
│                    │
│ Erste Einladung    │
├────────────────────┤
│ ... (more)         │
├────────────────────┤
│ [💾 Save All]      │
└────────────────────┘
```

**Key UI Elements:**

1. **Checkbox States:**
   - Unchecked `[ ]` - Not done
   - Checked `[x]` - Done
   - Disabled (past events) - Read-only

2. **Color Coding:**
   - ✅ Green - High show-up rate (>70%)
   - ⚠️ Yellow - Medium rate (30-70%)
   - ❌ Red - Low rate (<30%) or no-shows
   - ✨ Blue - New user (no history)

3. **History Icons:**
   - ✓ #1 - Attended Event #1
   - ✗ #2 - Did not attend Event #2
   - ⊘ #3 - Not invited to Event #3

4. **Source Labels:**
   - "Newsletter RSVP" - Clicked button in email
   - "Personal WhatsApp" - Manual DM
   - "Walk-in" - Came without RSVP

### 4.3 Newsletter Integration UI

**Location:** Newsletter creation flow (in `/admin` when creating newsletter)

**Mockup:**

```
┌──────────────────────────────────────────────────────────┐
│ Create Newsletter for Event                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Event: [KINN Treff #3 - 20. Dez 2025 ▼]                 │
│                                                          │
│ Template: [Profile Walkthrough ▼]                       │
│                                                          │
│ Recipients:                                              │
│ ┌────────────────────────────────────────────────────┐  │
│ │ [x] All subscribers (27)                           │  │
│ │ [ ] Filter by profile completeness                 │  │
│ │ [ ] Filter by past attendance                      │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ✅ Include RSVP buttons:                                 │
│ ┌────────────────────────────────────────────────────┐  │
│ │ [Komme ✓] [Komm vielleicht ?] [Diesmal nicht ✗]   │  │
│ │                                                    │  │
│ │ RSVP clicks will automatically:                    │  │
│ │ • Update event.rsvps                               │  │
│ │ • Update event.engagement.confirmedDM              │  │
│ │ • Track source as "newsletter"                     │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ [Preview] [Send Test] [Send to All]                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Newsletter Email Preview:**

```
Subject: KINN Treff #3 - 20. Dezember | Online via Google Meet

──────────────────────────────────────────────────────

KINN Treff #3 - AI & Innovation
20. Dezember 2025, 18:00-20:00

[KINN Logo]

Hey Thomas!

Nächster KINN Treff: Donnerstag, 20. Dezember, 18:00 Uhr.
Diesmal Online via Google Meet.

Themen:
• AI-Trends 2026
• Supply/Demand Matching Updates
• Open Mic

──────────────────────────────────────────────────────

Kannst du dabei sein?

┌──────────────────────────────────────────────────┐
│                                                  │
│   [Komme ✓]   [Vielleicht ?]   [Diesmal nicht] │
│                                                  │
└──────────────────────────────────────────────────┘

──────────────────────────────────────────────────────

Meeting Link: https://meet.google.com/xyz-abc-def
(wird nach Zusage geteilt)

Bis dann!
Thomas

──────────────────────────────────────────────────────
KINN - KI Treff Innsbruck
thomas@kinn.at | kinn.at
[Datenschutz] | [Impressum] | [Abmelden]
```

**RSVP Button URLs:**

```
https://kinn.at/api/events/rsvp?eventId=kinn-2025-12-20&response=yes&token=ABC123
https://kinn.at/api/events/rsvp?eventId=kinn-2025-12-20&response=maybe&token=ABC123
https://kinn.at/api/events/rsvp?eventId=kinn-2025-12-20&response=no&token=ABC123
```

**Confirmation Page (after click):**

```
┌──────────────────────────────────────────────────┐
│                                                  │
│               [KINN Logo]                        │
│                                                  │
│         ✅ Danke für deine Antwort!              │
│                                                  │
│  Du hast "Komme" für KINN Treff #3 ausgewählt.   │
│                                                  │
│  Meeting Link:                                   │
│  https://meet.google.com/xyz-abc-def            │
│                                                  │
│  📅 Zum Kalender hinzufügen:                     │
│  [Google Calendar] [Apple] [Outlook]            │
│                                                  │
│  Bis zum 20. Dezember!                           │
│  Thomas                                          │
│                                                  │
│  [← Zurück zur Startseite]                       │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 5. API Specifications

### 5.1 GET /api/admin/events/:eventId/engagement

**Description:** Fetch engagement data for a specific event.

**Authentication:** Required (Bearer token)

**Request:**
```
GET /api/admin/events/kinn-2025-12-20/engagement
Authorization: Bearer ADMIN_PASSWORD
```

**Response:**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "kinn-2025-12-20",
      "title": "KINN Treff #3 - AI & Innovation",
      "date": "2025-12-20",
      "status": "upcoming",
      "type": "online"
    },
    "stats": {
      "totalSubscribers": 27,
      "personallyInvited": 12,
      "confirmedDM": 10,
      "attended": 0,
      "newsletterRSVPs": {
        "yes": 8,
        "maybe": 2,
        "no": 1
      }
    },
    "participants": [
      {
        "email": "thomas@kinn.at",
        "name": "Thomas S.",
        "showUpRate": 1.0,
        "showUpStats": {
          "invited": 3,
          "confirmed": 2,
          "attended": 3
        },
        "thisEvent": {
          "personallyInvited": true,
          "confirmedDM": true,
          "attended": false,
          "source": "newsletter" // or "manual" or "walk-in"
        },
        "history": [
          {
            "eventId": "kinn-2025-11-07",
            "eventTitle": "KINN Treff #2",
            "attended": true
          },
          {
            "eventId": "kinn-2025-10-15",
            "eventTitle": "KINN Treff #1",
            "attended": true
          }
        ],
        "warning": null
      },
      {
        "email": "test@example.com",
        "name": "test@example.com",
        "showUpRate": 0,
        "showUpStats": {
          "invited": 2,
          "confirmed": 0,
          "attended": 0
        },
        "thisEvent": {
          "personallyInvited": true,
          "confirmedDM": false,
          "attended": false,
          "source": "manual"
        },
        "history": [
          {
            "eventId": "kinn-2025-11-07",
            "eventTitle": "KINN Treff #2",
            "attended": false
          },
          {
            "eventId": "kinn-2025-10-15",
            "eventTitle": "KINN Treff #1",
            "attended": false
          }
        ],
        "warning": {
          "level": "danger",
          "text": "⚠️ 0 shows in 2 invites - Skip personal invite!"
        }
      }
    ]
  }
}
```

### 5.2 PUT /api/admin/events/:eventId/engagement

**Description:** Update engagement data for a specific event (bulk update).

**Authentication:** Required (Bearer token)

**Request:**
```
PUT /api/admin/events/kinn-2025-12-20/engagement
Authorization: Bearer ADMIN_PASSWORD
Content-Type: application/json

{
  "updates": [
    {
      "email": "thomas@kinn.at",
      "personallyInvited": true,
      "confirmedDM": true,
      "attended": false
    },
    {
      "email": "manfred@example.com",
      "personallyInvited": true,
      "confirmedDM": false,
      "attended": false
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Engagement data updated for 2 users",
  "stats": {
    "updated": 2,
    "errors": 0
  },
  "updatedEvent": {
    "id": "kinn-2025-12-20",
    "engagement": {
      "personallyInvited": ["thomas@kinn.at", "manfred@example.com"],
      "confirmedDM": ["thomas@kinn.at"],
      "attended": []
    }
  }
}
```

**Error Responses:**
```json
// 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "Invalid or missing admin password"
}

// 404 Not Found
{
  "error": "Event not found",
  "message": "Event with ID 'kinn-2025-12-20' does not exist"
}

// 400 Bad Request
{
  "error": "Invalid request",
  "message": "Missing required field: updates"
}
```

### 5.3 GET /api/events/rsvp (NEW - Newsletter Integration)

**Description:** Handle RSVP clicks from newsletter buttons.

**Authentication:** Token-based (JWT in query param)

**Request:**
```
GET /api/events/rsvp?eventId=kinn-2025-12-20&response=yes&token=ABC123
```

**Parameters:**
- `eventId` (required): Event ID
- `response` (required): `yes` | `maybe` | `no`
- `token` (required): JWT profile token (same as existing magic links)

**Response:**
```
HTTP 307 Redirect to /pages/rsvp-confirmation.html?status=yes&eventId=kinn-2025-12-20&token=ABC123
```

**Side Effects:**
1. Update `events:config`:
   - Add email to `event.rsvps.yes` (or `maybe`/`no`)
   - Add email to `event.engagement.newsletterRSVP.yes`
   - If `yes` or `maybe`: Add to `event.engagement.confirmedDM`
2. Send confirmation email (optional)
3. Track click timestamp and source

**Confirmation Page:**
- Display: "✅ Danke! Du bist dabei."
- Show: Meeting link, calendar links, event details
- Option: Update RSVP ("Doch nicht Zeit? Hier ändern")

---

## 6. Newsletter RSVP Integration

### 6.1 Overview

**Goal:** Automate engagement tracking via newsletter RSVP buttons instead of manual DM tracking.

**Benefits:**
- ✅ Reduces admin workload (no manual checkbox clicking for DMs)
- ✅ Increases RSVP rates (one-click vs. WhatsApp reply)
- ✅ Automatic sync with engagement system
- ✅ Better data: timestamp, source tracking

### 6.2 Newsletter Template Updates

**Add to existing newsletter templates:**

```jsx
// In /emails/event-invite.tsx (NEW template)
import { Button } from '../components/button';

<Section style={{ textAlign: 'center', margin: '32px 0' }}>
  <Text style={heading}>Kannst du dabei sein?</Text>

  <Section style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
    <Button
      href={`${baseUrl}/api/events/rsvp?eventId=${eventId}&response=yes&token=${userToken}`}
      variant="primary"
    >
      Komme ✓
    </Button>

    <Button
      href={`${baseUrl}/api/events/rsvp?eventId=${eventId}&response=maybe&token=${userToken}`}
      variant="secondary"
    >
      Vielleicht ?
    </Button>

    <Button
      href={`${baseUrl}/api/events/rsvp?eventId=${eventId}&response=no&token=${userToken}`}
      variant="danger"
    >
      Diesmal nicht
    </Button>
  </Section>
</Section>
```

### 6.3 RSVP Endpoint Implementation

**File:** `/api/events/rsvp.js`

**Logic:**
```javascript
import { verifyProfileToken } from './utils/tokens.js';
import { getEventsConfig, updateEventsConfig, updateUserEngagement } from './utils/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { eventId, response, token } = req.query;

  // Validate params
  if (!eventId || !response || !token) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  if (!['yes', 'maybe', 'no'].includes(response)) {
    return res.status(400).json({ error: 'Invalid response value' });
  }

  // Verify token
  const email = verifyProfileToken(token);
  if (!email) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    // Fetch event
    const eventsConfig = await getEventsConfig();
    const event = eventsConfig.events.find(e => e.id === eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update RSVP
    ['yes', 'maybe', 'no'].forEach(r => {
      event.rsvps[r] = event.rsvps[r] || [];
      event.rsvps[r] = event.rsvps[r].filter(e => e !== email);
    });
    event.rsvps[response].push(email);

    // Update engagement
    event.engagement = event.engagement || {
      personallyInvited: [],
      confirmedDM: [],
      attended: [],
      newsletterRSVP: { yes: [], maybe: [], no: [] }
    };

    // Track newsletter RSVP
    ['yes', 'maybe', 'no'].forEach(r => {
      event.engagement.newsletterRSVP[r] = event.engagement.newsletterRSVP[r] || [];
      event.engagement.newsletterRSVP[r] = event.engagement.newsletterRSVP[r].filter(e => e !== email);
    });
    event.engagement.newsletterRSVP[response].push(email);

    // If yes/maybe: Mark as confirmed
    if (response === 'yes' || response === 'maybe') {
      if (!event.engagement.confirmedDM.includes(email)) {
        event.engagement.confirmedDM.push(email);
      }
    }

    // Save
    await updateEventsConfig(eventsConfig);

    // Update user engagement stats
    await updateUserEngagement(email);

    console.log(`[RSVP] ${email} → ${response} for ${eventId}`);

    // Redirect to confirmation page
    return res.redirect(`/pages/rsvp-confirmation.html?status=${response}&eventId=${eventId}&token=${token}`);

  } catch (error) {
    console.error('[RSVP] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 6.4 Confirmation Page

**File:** `/pages/rsvp-confirmation.html`

**Content:**
- Success message based on response (yes/maybe/no)
- Event details (date, time, location/link)
- Calendar add buttons (if yes/maybe)
- Option to change RSVP
- Unsubscribe link

---

## 7. Analytics & Reports

### 7.1 Key Metrics

**Event-Level:**
- Total invites sent (personal + newsletter)
- Confirmation rate: confirmed / invited
- Show-up rate: attended / confirmed
- No-show rate: (confirmed - attended) / confirmed

**User-Level:**
- Show-up rate: attended / invited (across all events)
- Streak: consecutive events attended
- Reliability tier: High (>70%), Medium (30-70%), Low (<30%)

**System-Level:**
- Average show-up rate across all events
- Newsletter RSVP rate (clicks / sent)
- Manual DM response rate

### 7.2 Report Views

**Event Report (Post-Event):**
```
KINN Treff #2 - 7. November 2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Invites:
• 12 Personal invites sent
• 8 Newsletter RSVPs (67% click rate)
• 10 Total confirmations (83%)

Attendance:
• 8 Actually attended (80% show-up rate)
• 2 No-shows (20%)

Breakdown:
• Newsletter RSVPs: 6/8 showed (75%)
• Manual DMs: 2/4 showed (50%)
• Walk-ins: 0

No-Shows:
• user1@example.com (2nd no-show - flag!)
• user2@example.com (1st no-show)
```

**User Report:**
```
Thomas S. (thomas@kinn.at)
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Show-Up Rate: 100% (3/3) ✅
Streak: 3 events
Last Attended: KINN Treff #3 (2025-12-20)

History:
✓ #3 - Attended (Newsletter RSVP)
✓ #2 - Attended (Manual DM)
✓ #1 - Attended (Walk-in)

Recommendation: Highly reliable - always invite!
```

### 7.3 CSV Export

**Columns:**
- Email
- Name
- Total Invited
- Total Confirmed
- Total Attended
- Show-Up Rate
- Last Event Attended
- Reliability Tier
- Warning (if any)

**Use Case:** Import to Google Sheets for further analysis, pivot tables, charts.

---

## 8. Implementation Phases

### Phase 1: Core Engagement Tracking (Week 1 - 4h)

**Goal:** Enable basic engagement tracking for current and past events.

**Deliverables:**
1. Backend:
   - `/api/admin/events/:eventId/engagement` (GET/PUT)
   - Redis helper functions: `computeUserEngagementStats()`, `updateEventEngagement()`
2. Frontend:
   - `/admin/event-engagement.html` (new page)
   - Update `/admin/index.html` to add "Engagement" button
3. Features:
   - 3 checkboxes: DM Sent, Confirmed, Attended
   - Show-up rate calculation
   - Warnings for no-shows
   - Retroactive data entry for past events

**Success Criteria:**
- ✅ Thomas can enter data for Event #1, #2
- ✅ Show-up rates computed correctly
- ✅ Warnings display for 0% users
- ✅ Data syncs across events

### Phase 2: Newsletter RSVP Integration (Week 2 - 3h)

**Goal:** Automate engagement tracking via newsletter buttons.

**Deliverables:**
1. Backend:
   - `/api/events/rsvp` (new endpoint)
   - Update newsletter sending logic to include RSVP buttons
2. Frontend:
   - `/pages/rsvp-confirmation.html` (new page)
   - Update newsletter template: `/emails/event-invite.tsx` (new template)
3. Features:
   - One-click RSVP from email
   - Auto-update engagement data
   - Confirmation page with calendar links

**Success Criteria:**
- ✅ Newsletter contains working RSVP buttons
- ✅ Clicks update `event.engagement.confirmedDM`
- ✅ User sees confirmation page
- ✅ Admin sees RSVP source in engagement UI

### Phase 3: Analytics & Reports (Week 3 - 2h)

**Goal:** Provide insights and export capabilities.

**Deliverables:**
1. Backend:
   - `/api/admin/events/:eventId/report` (new endpoint)
   - CSV export logic
2. Frontend:
   - Event report view (post-event summary)
   - User profile engagement section
   - Export button

**Success Criteria:**
- ✅ Post-event report shows key metrics
- ✅ CSV export works
- ✅ User profiles show engagement history

### Phase 4: Advanced Features (Future)

**Potential:**
- QR Code check-in at events (live attendance tracking)
- Automated reminders for users with low show-up rates
- Predictive analytics: "This user is 80% likely to show up"
- Integration with Google Calendar (sync RSVPs)
- WhatsApp reminders based on engagement tier

---

## 9. Edge Cases & Considerations

### 9.1 Data Consistency

**Scenario:** User clicks "Komme" in newsletter, then manually updates in admin UI.

**Solution:** Last write wins. Admin UI shows source ("Newsletter RSVP" vs. "Manual DM") for clarity.

### 9.2 Token Expiry

**Scenario:** User clicks RSVP button in old newsletter (token expired).

**Solution:** RSVP endpoint checks token validity, redirects to error page with "Request new magic link" option.

### 9.3 Event Cancellation

**Scenario:** Event is cancelled after RSVPs collected.

**Solution:**
- Admin can mark event as "cancelled" in UI
- Send cancellation email to all confirmed attendees
- Engagement data is preserved (doesn't count against show-up rate)

### 9.4 Duplicate RSVPs

**Scenario:** User clicks "Komme", then clicks "Vielleicht".

**Solution:** Latest click overwrites previous. User sees updated confirmation page.

### 9.5 Walk-In Attendees

**Scenario:** Someone attends without RSVP (walk-in).

**Solution:** Admin can check "✓ Kam" without checking "DM Sent" or "Zusage". System tracks as "walk-in" source.

### 9.6 Retroactive Data Loss

**Scenario:** Thomas doesn't remember who attended Event #1.

**Solution:**
- Leave "✓ Kam" unchecked for unknown
- Show-up rate only counts events where data is entered
- Option: Mark event as "incomplete data" to exclude from stats

---

## 10. Privacy & GDPR

### 10.1 Data Collected

**Engagement Data:**
- Personal invite status (admin action)
- RSVP response (user action)
- Attendance status (admin action)
- Source tracking (newsletter vs. manual)

**Retention:**
- Indefinite (for historical analysis)
- User can request deletion via unsubscribe

### 10.2 User Consent

**RSVP Buttons:**
- Clicking = explicit consent to track attendance
- Privacy policy linked in newsletter footer

**Unsubscribe:**
- User can opt out of all tracking via profile settings
- Data remains in system but user receives no more invites

### 10.3 Admin Access

**Who can see:**
- Only admins with `ADMIN_PASSWORD` can view engagement data
- No public API access
- Logs engagement actions for audit trail

---

## 11. Testing Plan

### 11.1 Unit Tests

**Backend:**
- `computeUserEngagementStats()` - Correct calculations
- `updateEventEngagement()` - Proper Redis updates
- RSVP endpoint - All response types (yes/maybe/no)

**Frontend:**
- Checkbox state management
- Filter/sort logic
- Warning display rules

### 11.2 Integration Tests

**Scenarios:**
1. Admin enters data for Event #1 → User stats update correctly
2. User clicks "Komme" in newsletter → Engagement UI shows "✓ Zusage"
3. Admin marks attended → Show-up rate recalculates

### 11.3 Manual Testing Checklist

**Pre-Event:**
- [ ] Create Event #3
- [ ] Send newsletter with RSVP buttons
- [ ] Verify clicks update engagement data
- [ ] Manually add DM invites in admin UI

**Post-Event:**
- [ ] Mark attendees in admin UI
- [ ] Verify show-up rates update
- [ ] Check warnings for no-shows
- [ ] Export CSV report

**Retroactive:**
- [ ] Enter data for Event #1 and #2
- [ ] Verify stats sync across all events

---

## 12. Success Metrics

### 12.1 Immediate (Week 1)

- ✅ Event #1 and #2 data entered
- ✅ Show-up rates calculated for all users
- ✅ At least 1 warning for no-show displayed

### 12.2 Short-Term (Month 1)

- ✅ 3+ events tracked with engagement data
- ✅ Newsletter RSVP rate >50% (clicks / sent)
- ✅ Show-up rate >70% (attended / confirmed)
- ✅ 0 spam complaints (no-shows not re-invited)

### 12.3 Long-Term (Month 3)

- ✅ 10+ events tracked
- ✅ Clear reliability tiers identified (high/medium/low)
- ✅ Automated newsletter sending based on engagement tiers
- ✅ CSV export used for quarterly reporting

---

## 13. Open Questions

1. **Should we track "invited but declined" separately?**
   - Currently: "No" RSVP is tracked, but not distinguished from "never responded"
   - Proposed: Add `event.engagement.declined` array

2. **How to handle event capacity limits?**
   - If event maxCapacity = 20, and 30 RSVP "yes", who gets in?
   - Solution: First-come-first-served based on RSVP timestamp, waitlist for rest

3. **Should we send reminder emails to confirmed attendees?**
   - Currently: No automated reminders
   - Proposed: 24h before event, send "Don't forget!" email to confirmed

4. **How to incentivize high show-up rates?**
   - Gamification: "3-event streak! 🔥"
   - Priority access to capacity-limited events
   - Public leaderboard (opt-in)?

---

## 14. Changelog

**2025-11-12:**
- Initial documentation created
- Defined data structures, user flows, UI design
- Specified newsletter RSVP integration
- Outlined 3-phase implementation plan

---

## 15. References

**Related Docs:**
- [`/docs/technical/GOOGLE_CALENDAR_WORKFLOW.md`](./GOOGLE_CALENDAR_WORKFLOW.md) - Calendar invites
- [`/docs/technical/EVENT_CREATION.md`](./EVENT_CREATION.md) - Event creation flow
- [`/docs/marketing/KINN_BRAND_STYLEGUIDE.md`](../marketing/KINN_BRAND_STYLEGUIDE.md) - UI design guidelines

**External:**
- [GDPR Compliance for Event Management](https://gdpr.eu/)
- [Best Practices for Email RSVP Tracking](https://www.litmus.com/blog/email-rsvp-tracking/)

---

**End of Document**
