# KINN Landing Page - Master Implementation Plan

> **Hybrid Approach**: Launch fast (MVP manual), switch to automated Google Calendar invitations within 1 week
>
> **Timeline**: 8 days to full automation
> **Strategy**: Validate → Automate → Scale

---

## 🎯 Executive Summary

### The Hybrid Strategy

```
Track A: MVP Manual (Days 1-3)
├─ Launch landing page
├─ Collect emails via mailto:
├─ Manual confirmation emails
└─ VALIDATE market fit

Track B: Backend Development (Days 1-8, parallel)
├─ Next.js + Google Calendar API
├─ Upstash Redis
├─ Admin Dashboard
└─ AUTOMATE invitations

Day 8: Transition
└─ Switch from manual to automated
└─ Import existing subscribers
└─ First automated invitation! 🎉
```

### Why Hybrid?

✅ **Fast to Market**: Live in 2-3 days
✅ **Validate First**: Real users, real feedback
✅ **Professional Ready**: Full automation after validation
✅ **Zero Waste**: Manual work only while building backend
✅ **Smooth Transition**: Existing subscribers seamlessly migrated

---

## 📅 Timeline Overview

```
Day 1-2:   MVP Manual Launch (Track A)
Day 1-8:   Backend Development (Track B, parallel)
Day 3-7:   MVP running, collecting signups
Day 8:     Transition to automated system
Day 9+:    Full automation, scale
```

---

## 🚀 Track A: MVP Manual (Days 1-3)

### Goal
Landing page live, accepting signups, manual email workflow

### Tech Stack
- Single `index.html` file
- Inline CSS (schwarz/weiß)
- Vanilla JavaScript (modal)
- GitHub Pages or Vercel Static
- **Zero dependencies**

### Day 1: Setup & Design

**Morning (4h):**
- [ ] Create project structure
- [ ] Design HTML layout
- [ ] Implement logo inline SVG
- [ ] Style with minimal CSS
- [ ] Test responsive design

**Afternoon (4h):**
- [ ] Build modal component
- [ ] Implement email input
- [ ] Add mailto: functionality
- [ ] Test on mobile/desktop
- [ ] Cross-browser testing

**Deliverable:** Working landing page locally

---

### Day 2: Polish & Deploy

**Morning (3h):**
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Final design tweaks
- [ ] Create email templates (Google Docs)
- [ ] Create .ics file template

**Afternoon (3h):**
- [ ] Domain setup (kinn.at)
- [ ] Deploy to GitHub Pages or Vercel
- [ ] SSL verification
- [ ] Smoke tests
- [ ] Share with 3 test users

**Evening (2h):**
- [ ] Monitor first signups
- [ ] Send first manual confirmation emails
- [ ] Document manual workflow
- [ ] Setup Google Sheets for tracking

**Deliverable:** Live landing page at kinn.at

---

### Day 3: Monitor & Optimize

**All Day:**
- [ ] Monitor signups
- [ ] Respond to confirmation emails
- [ ] Track metrics (signup count)
- [ ] Gather user feedback
- [ ] Iterate on email copy
- [ ] Test calendar .ics files work

**Parallel:** Backend development continues (Track B)

---

### Manual Workflow (Days 3-7)

```
1. User signs up → mailto:treff@kinn.at opens
2. Email lands in inbox
3. Copy email to Google Sheets
4. Send confirmation email (template)
5. User confirms → Mark in sheets
6. Done ✓

Time per signup: ~2 minutes
Acceptable for 0-20 signups
```

### Manual Email Templates

**Template 1: Confirmation Email**
```
Subject: Bestätige deine Anmeldung - KINN KI Treff Innsbruck

Servus [NAME],

danke für dein Interesse am KINN KI Treff Innsbruck!

Bitte bestätige kurz deine Email-Adresse:

→ Ja, ich bin dabei! (Einfach auf diese Email antworten)

Was dich erwartet:
📅 Monatliche Stammtische in Die Bäckerei, Innsbruck
🧠 Austausch über KI, Neural Networks, LLMs
🤝 Community von Entwicklern, Forschern & Enthusiasten

Du bekommst rechtzeitig eine Einladung zum nächsten Treff!

Bis bald,
Das KINN Team

---
P.S.: Nicht mehr dabei? Einfach Bescheid geben.
```

**Template 2: Welcome Email (after confirmation)**
```
Subject: Willkommen beim KINN KI Treff! 🎉

Servus [NAME],

super, du bist dabei!

Der nächste KINN KI Stammtisch:
📅 [DATUM], [UHRZEIT]
📍 Die Bäckerei, Dreiheiligenstraße 21a, Innsbruck
🧠 Thema: [THEMA]

Ich schicke dir ca. 1 Woche vorher eine Einladung mit allen Details.

Falls du schon jetzt den Termin eintragen willst:
→ Kalender-Datei im Anhang (kinn-stammtisch.ics)

Bis bald!
Das KINN Team

💬 Discord: [link]
🔗 LinkedIn: [link]
```

---

## 💻 Track B: Backend Development (Days 1-8, Parallel)

### Goal
Full Google Calendar automation with admin dashboard

### Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Upstash Redis (KV storage)
- Google Calendar API
- Resend (email service)
- Vercel (deployment)

---

### Day 1: Project Setup

**Setup (3h):**
```bash
# Create Next.js project
npx create-next-app@latest kinn-landing --typescript --tailwind --app

# Install dependencies
cd kinn-landing
npm install @upstash/redis googleapis google-auth-library resend react-email

# Setup environment variables
cp .env.example .env.local
```

**Environment Variables:**
```bash
# .env.local
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_CALENDAR_ID=

RESEND_API_KEY=

ADMIN_PASSKEY=
```

**File Structure:**
```
/app
  /page.tsx                 # Landing page
  /success/page.tsx         # Confirmation success
  /kinnside
    /page.tsx              # Admin dashboard
    /events/page.tsx       # Event creator
  /api
    /signup/route.ts       # Email signup
    /confirm/route.ts      # Double opt-in
    /events
      /create/route.ts     # Create calendar event

/components
  /KinnLogo.tsx            # Logo component
  /SignupModal.tsx         # Signup flow
  /EmailInput.tsx          # Input with validation

/lib
  /redis.ts                # Upstash client
  /google-calendar.ts      # Calendar API client
  /calendar-events.ts      # Event operations
  /email.ts                # Resend client

/emails
  /ConfirmationEmail.tsx   # React email template
  /WelcomeEmail.tsx        # React email template

package.json
tsconfig.json
tailwind.config.ts
```

---

### Day 2-3: Core Backend

**Day 2 Tasks:**
- [ ] Setup Upstash Redis connection
- [ ] Create Redis helper functions
- [ ] Implement `/api/signup` endpoint
- [ ] Implement `/api/confirm` endpoint
- [ ] Test signup flow

**Day 3 Tasks:**
- [ ] Setup Google Cloud project
- [ ] Create service account
- [ ] Enable Calendar API
- [ ] Implement Google Calendar client
- [ ] Test event creation

---

### Day 4-5: Google Calendar Integration

**Day 4:**
- [ ] Implement `createStammtischEvent()`
- [ ] Implement `addAttendeeToFutureEvents()`
- [ ] Implement `removeAttendeeFromFutureEvents()`
- [ ] Test with 2-3 test emails

**Day 5:**
- [ ] Create `/api/events/create` endpoint
- [ ] Build event creator form
- [ ] Test end-to-end: Create event → Invitations sent
- [ ] Verify Google Calendar invitations arrive

---

### Day 6-7: Admin Dashboard & Email Templates

**Day 6:**
- [ ] Build admin authentication
- [ ] Create event creator UI
- [ ] Subscriber list view
- [ ] RSVP tracking view

**Day 7:**
- [ ] Design React Email templates
- [ ] Implement confirmation email
- [ ] Implement welcome email
- [ ] Test email deliverability

---

### Day 8: Integration & Transition

**Morning: Final Testing**
- [ ] End-to-end flow test
- [ ] Load testing (simulate 50 signups)
- [ ] Email deliverability check
- [ ] Calendar invitation verification

**Afternoon: Data Migration**
- [ ] Export signups from Google Sheets
- [ ] Import to Upstash Redis
- [ ] Mark as confirmed
- [ ] Verify data integrity

**Evening: Launch Automation!**
- [ ] Update landing page (swap mailto: for form)
- [ ] Deploy to Vercel
- [ ] Create first automated event
- [ ] Monitor invitations
- [ ] 🎉 Celebrate!

---

## 🔄 Transition Strategy (Day 8)

### Before Transition

```
Manual System (Days 3-7):
└─ Emails in Google Sheets
└─ Manual confirmations
└─ Manual calendar invites
```

### Transition Steps

**1. Data Export (30 min)**
```
Google Sheets → CSV
Columns: email, name, confirmed, joinedAt
```

**2. Data Import (30 min)**
```typescript
// scripts/import-subscribers.ts
import { redis } from '@/lib/redis'
import fs from 'fs'
import csv from 'csv-parser'

const subscribers: string[] = []

fs.createReadStream('subscribers.csv')
  .pipe(csv())
  .on('data', (row) => {
    if (row.confirmed === 'true') {
      subscribers.push(row.email)
    }
  })
  .on('end', async () => {
    // Add all to Redis
    for (const email of subscribers) {
      await redis.sadd('kinn:subscribers:confirmed', email)
    }
    console.log(`Imported ${subscribers.length} subscribers`)
  })
```

**3. Deploy New Version (30 min)**
```bash
# Update environment variables in Vercel
vercel env add UPSTASH_REDIS_REST_URL
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
# ... etc

# Deploy
vercel --prod

# Verify deployment
curl https://kinn.at
```

**4. Verify Migration (30 min)**
```bash
# Check Redis has subscribers
curl https://kinn.at/api/admin/subscribers

# Test signup flow
# Test confirmation flow
# Test event creation
```

**5. First Automated Event (1h)**
```
Admin Dashboard → Create Event
└─ Topic: "Welcome to Automated KINN!"
└─ All subscribers auto-invited
└─ Verify invitations arrive
```

### After Transition

```
Automated System (Day 9+):
└─ Emails in Upstash Redis
└─ Auto confirmations via Resend
└─ Auto calendar invites via Google API
```

---

## 💻 Complete Implementation

### 1. Landing Page (MVP Manual)

**index.html (Complete MVP):**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KINN - KI Treff Innsbruck</title>
  <meta name="description" content="Monatlicher KI-Austausch in Innsbruck. Für Entwickler, Forscher & Enthusiasten.">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #fff;
      color: #000;
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .container {
      max-width: 600px;
      width: 100%;
      text-align: center;
    }

    .logo {
      width: 200px;
      max-width: 100%;
      margin: 0 auto 3rem;
      display: block;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }

    .subtitle {
      font-size: 1.125rem;
      color: #666;
      margin-bottom: 3rem;
    }

    .cta-button {
      display: inline-block;
      padding: 1rem 2.5rem;
      background: #000;
      color: #fff;
      text-decoration: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 500;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }

    .cta-button:hover {
      background: #333;
      transform: translateY(-2px);
    }

    .cta-button:active {
      transform: translateY(0);
    }

    /* Modal */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .modal.open {
      display: flex;
    }

    .modal-content {
      background: #fff;
      padding: 2.5rem;
      border-radius: 1rem;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .modal h2 {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .modal label {
      display: block;
      font-weight: 500;
      margin-bottom: 0.5rem;
      text-align: left;
    }

    .modal input {
      width: 100%;
      padding: 0.875rem;
      border: 2px solid #ddd;
      border-radius: 0.5rem;
      font-size: 1rem;
      margin-bottom: 1.5rem;
      transition: border-color 0.2s;
    }

    .modal input:focus {
      outline: none;
      border-color: #000;
    }

    .buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .btn {
      padding: 0.875rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #000;
      color: #fff;
    }

    .btn-primary:hover {
      background: #333;
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #000;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .footer {
      margin-top: 4rem;
      font-size: 0.875rem;
      color: #999;
    }

    @media (max-width: 640px) {
      h1 {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1rem;
      }

      .modal-content {
        padding: 2rem;
      }

      .buttons {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Logo (inline SVG) -->
    <svg class="logo" viewBox="0 0 931.35 308.55" xmlns="http://www.w3.org/2000/svg">
      <polygon points="495.04 20.27 569.04 153.27 569.04 20.27 654.04 20.27 654.04 288.27 572.54 288.27 498.04 159.27 498.04 288.27 416.04 288.27 416.04 20.27 495.04 20.27"/>
      <path d="M682.04,20.27l78.89.11,73.11,133.89V20.27h81v268h-80l-72-130v130h-78.5c-.61,0-1.53-.8-2.5,0V20.27Z"/>
      <polygon points="100.04 20.27 100.04 136.27 160.54 20.27 256.04 20.27 182.26 145.61 262.04 288.27 166.54 288.27 100.04 159.27 100.04 288.27 21.04 288.27 21.04 20.27 100.04 20.27"/>
      <path d="M359.04,20.27v265.5c0,.31,1.37,1.42,1,2.5h-82V20.27h81Z"/>
    </svg>

    <h1>KI Treff Innsbruck</h1>
    <p class="subtitle">Monatlicher Austausch</p>

    <button class="cta-button" onclick="openModal()">
      KI Treff Innsbruck ⓘ
    </button>

    <p class="footer">
      KINN – Wo Tiroler KI Profil bekommt
    </p>
  </div>

  <!-- Modal -->
  <div class="modal" id="modal" onclick="closeModalOnBackdrop(event)">
    <div class="modal-content">
      <h2>Eintragen für KI Treff</h2>
      <form onsubmit="handleSubmit(event)">
        <label for="email">Deine Email:</label>
        <input
          type="email"
          id="email"
          placeholder="deine@email.com"
          required
          autofocus
        >
        <div class="buttons">
          <button type="submit" class="btn btn-primary">
            Abschicken
          </button>
          <button type="button" class="btn btn-secondary" onclick="closeModal()">
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  </div>

  <script>
    function openModal() {
      document.getElementById('modal').classList.add('open')
      setTimeout(() => {
        document.getElementById('email').focus()
      }, 100)
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('open')
      document.getElementById('email').value = ''
    }

    function closeModalOnBackdrop(e) {
      if (e.target === e.currentTarget) {
        closeModal()
      }
    }

    function handleSubmit(e) {
      e.preventDefault()
      const email = document.getElementById('email').value

      // Open mailto with user's email in body
      window.location.href = `mailto:treff@kinn.at?subject=${encodeURIComponent('Eintragen in KI Treff Verteiler')}&body=${encodeURIComponent('Meine Email: ' + email)}`

      // Close modal after short delay
      setTimeout(closeModal, 500)
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal()
      }
    })
  </script>
</body>
</html>
```

---

### 2. Next.js Backend (Automated)

**Key Files:**

#### /lib/redis.ts
```typescript
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Helper functions
export const RedisKeys = {
  subscribers: 'kinn:subscribers:confirmed',
  pending: (token: string) => `kinn:pending:${token}`,
  counter: 'kinn:counter',
}
```

#### /lib/google-calendar.ts
```typescript
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'

const auth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/calendar'],
})

export const calendar = google.calendar({ version: 'v3', auth })
export const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID!
```

#### /lib/calendar-events.ts
```typescript
import { calendar, CALENDAR_ID } from './google-calendar'
import { redis, RedisKeys } from './redis'

interface StammtischEvent {
  title: string
  date: Date
  endDate: Date
  location: string
  description: string
}

export async function createStammtischEvent(event: StammtischEvent) {
  // Fetch all confirmed subscribers
  const subscribers = await redis.smembers(RedisKeys.subscribers)

  if (subscribers.length === 0) {
    throw new Error('No subscribers found')
  }

  // Format attendees
  const attendees = subscribers.map(email => ({
    email,
    responseStatus: 'needsAction'
  }))

  // Create event
  const response = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    sendUpdates: 'all', // Send invitations!
    requestBody: {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.date.toISOString(),
        timeZone: 'Europe/Vienna',
      },
      end: {
        dateTime: event.endDate.toISOString(),
        timeZone: 'Europe/Vienna',
      },
      attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day
          { method: 'popup', minutes: 60 },      // 1 hour
        ],
      },
      guestsCanInviteOthers: true,
      guestsCanSeeOtherGuests: true,
    },
  })

  return response.data
}

export async function addAttendeeToFutureEvents(email: string) {
  const now = new Date()
  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: now.toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  })

  const events = response.data.items || []

  for (const event of events) {
    const attendees = event.attendees || []

    if (attendees.some(a => a.email === email)) {
      continue
    }

    attendees.push({ email, responseStatus: 'needsAction' })

    await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId: event.id!,
      sendUpdates: 'all',
      requestBody: { attendees },
    })
  }
}
```

#### /app/api/signup/route.ts
```typescript
import { NextRequest } from 'next/server'
import { redis, RedisKeys } from '@/lib/redis'
import { nanoid } from 'nanoid'
import { Resend } from 'resend'
import ConfirmationEmail from '@/emails/ConfirmationEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Generate confirmation token
    const token = nanoid(32)

    // Store pending confirmation
    await redis.setex(
      RedisKeys.pending(token),
      60 * 60 * 24, // 24 hours
      email
    )

    // Send confirmation email
    await resend.emails.send({
      from: 'KINN <treff@kinn.at>',
      to: email,
      subject: 'Bestätige deine Anmeldung - KINN KI Treff',
      react: ConfirmationEmail({
        confirmUrl: `${process.env.NEXT_PUBLIC_URL}/confirm?token=${token}`,
      }),
    })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

#### /app/api/confirm/route.ts
```typescript
import { NextRequest } from 'next/server'
import { redis, RedisKeys } from '@/lib/redis'
import { addAttendeeToFutureEvents } from '@/lib/calendar-events'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return new Response('Invalid token', { status: 400 })
  }

  const email = await redis.get(RedisKeys.pending(token))

  if (!email) {
    return new Response('Token expired', { status: 400 })
  }

  // Add to confirmed subscribers
  await redis.sadd(RedisKeys.subscribers, email)
  await redis.incr(RedisKeys.counter)
  await redis.del(RedisKeys.pending(token))

  // Add to all future events
  try {
    await addAttendeeToFutureEvents(email as string)
  } catch (error) {
    console.error('Failed to add to future events:', error)
  }

  return Response.redirect(new URL('/success', request.url))
}
```

#### /app/api/events/create/route.ts
```typescript
import { NextRequest } from 'next/server'
import { createStammtischEvent } from '@/lib/calendar-events'
import { redis, RedisKeys } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    // Verify admin
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.ADMIN_PASSKEY}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { topic, date, time, location, description } = await request.json()

    const startDate = new Date(`${date}T${time}:00+01:00`)
    const endDate = new Date(startDate.getTime() + 2.5 * 60 * 60 * 1000)

    const event = await createStammtischEvent({
      title: `KINN KI Treff: ${topic}`,
      date: startDate,
      endDate,
      location,
      description,
    })

    const count = await redis.scard(RedisKeys.subscribers)

    return Response.json({
      success: true,
      event,
      attendeeCount: count,
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

---

## 📊 Success Metrics

### MVP Phase (Days 3-7)

```
Target Metrics:
- 10+ email signups
- 5+ confirmations
- 0 major bugs
- < 3 sec load time
```

### Automated Phase (Day 9+)

```
Target Metrics:
- 50+ total subscribers
- 80%+ confirmation rate
- 100% calendar invitation delivery
- 30%+ RSVP "Yes" rate
- < 2 sec API response time
```

---

## 💰 Cost Breakdown

### MVP Phase (Days 1-7)
```
Domain (kinn.at): ~€15/year
GitHub Pages: FREE
Email (Gmail): FREE
Time: 2-3 min per signup

Total: ~€15/year
```

### Automated Phase (Day 8+)
```
Vercel: FREE (hobby tier)
Upstash Redis: FREE (10K requests/day)
Google Calendar API: FREE
Resend: FREE (100 emails/day)
Domain: ~€15/year

Total: ~€15/year (for <100 subscribers)
```

---

## 🚨 Risk Mitigation

### Potential Issues & Solutions

**Issue: No signups in MVP phase**
- Solution: Validate messaging, test with friends first
- Pivot: Maybe different value prop needed

**Issue: Google Calendar API quota limits**
- Solution: Free tier = 1M requests/day (plenty)
- Mitigation: Batch operations

**Issue: Emails going to spam**
- Solution: Proper SPF/DKIM setup, warm up domain
- Mitigation: Use established domain

**Issue: Redis data loss**
- Solution: Upstash has automatic backups
- Mitigation: Export to CSV weekly

---

## ✅ Launch Checklist

### MVP Launch (Day 2)
- [ ] index.html tested on all browsers
- [ ] Mobile responsive verified
- [ ] Domain kinn.at configured
- [ ] SSL certificate active
- [ ] Email templates ready (Google Docs)
- [ ] Google Sheets tracking setup
- [ ] Test signup flow end-to-end
- [ ] Share with 3 test users
- [ ] Monitor inbox for signups

### Backend Launch (Day 8)
- [ ] All environment variables in Vercel
- [ ] Google Calendar API working
- [ ] Service account has calendar access
- [ ] Upstash Redis connected
- [ ] Resend API key configured
- [ ] Admin dashboard protected
- [ ] Test event creation works
- [ ] Test invitations arrive
- [ ] Import existing subscribers
- [ ] Update landing page (form replaces mailto:)
- [ ] Deploy to production
- [ ] Monitor logs for errors
- [ ] Create first real event
- [ ] Verify all subscribers invited

---

## 📝 Next Steps After Launch

### Week 2-4
- [ ] Monitor RSVP rates
- [ ] Gather feedback from attendees
- [ ] Iterate on event format
- [ ] Optimize email templates
- [ ] Add Discord integration
- [ ] Build subscriber counter on landing page

### Month 2-3
- [ ] Implement referral system
- [ ] Add event archive/recordings
- [ ] Build community features
- [ ] Launch LinkedIn company page
- [ ] Start content marketing

### Quarter 2
- [ ] Expand to other cities?
- [ ] Partner with universities
- [ ] Sponsor events
- [ ] Launch hackathons
- [ ] Scale to 500+ members

---

## 🎯 Definition of Done

### MVP (Day 3)
✅ Landing page live at kinn.at
✅ Users can sign up
✅ Manual email workflow working
✅ First 5+ signups confirmed

### Automation (Day 8)
✅ Backend deployed to Vercel
✅ Google Calendar integration working
✅ Admin dashboard functional
✅ First automated event created
✅ All subscribers receive invitation
✅ RSVPs tracked in Google Calendar

### Success (Day 30)
✅ 50+ confirmed subscribers
✅ First Stammtisch completed
✅ 20+ attendees
✅ Positive feedback
✅ Ready to scale

---

**Let's build this! 🚀**

*KINN - Wo Tiroler KI Profil bekommt*

---

## Appendix

### Useful Links
- [Google Calendar API Docs](https://developers.google.com/calendar/api)
- [Upstash Redis Docs](https://docs.upstash.com/redis)
- [Resend Docs](https://resend.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [React Email](https://react.email)

### Support
- Questions: hallo@kinn.at
- Issues: (setup GitHub repo)
- Docs: kinn.at/docs (später)
