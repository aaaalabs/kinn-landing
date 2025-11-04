# KINN Google Calendar Integration - Complete Flow

> **Automated Calendar Invitations**: Users subscribe once, get invited to all future Stammtische

---

## 🎯 The Perfect UX

```
User trägt sich EIN MAL ein (kinn.at)
    ↓
Bei jedem neuen Stammtisch:
    ↓
┌─────────────────────────────────────┐
│ Gmail Notification:                 │
│                                     │
│ 📅 KINN KI Treff Innsbruck         │
│ Nov 20, 6:30 PM – 9:00 PM          │
│                                     │
│ Organizer: KINN (treff@kinn.at)    │
│                                     │
│ [Yes] [No] [Maybe]                 │
└─────────────────────────────────────┘
    ↓
Click "Yes"
    ↓
✅ Automatisch in Google Calendar
✅ Reminder 1 day before
✅ Reminder 1 hour before
```

**Genau wie wenn du jemanden zu einem Meeting einlädst!**

---

## 🏗️ Architecture

### Components

```
┌─────────────────────────────────────────┐
│ kinn.at Landing Page                    │
│ (User signs up with email)              │
└───────────┬─────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│ Upstash Redis                           │
│ (Stores subscriber emails)              │
└───────────┬─────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│ Admin Dashboard (/kinnside)             │
│ "Create New Stammtisch Event"           │
└───────────┬─────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│ Google Calendar API                     │
│ calendar.events.insert()                │
│ attendees: [all subscribers]            │
│ sendUpdates: 'all'                      │
└───────────┬─────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│ Google sends email invitations          │
│ to ALL attendees automatically          │
└─────────────────────────────────────────┘
```

---

## 📧 User Journey

### 1. Initial Signup

```
User visits kinn.at
    ↓
Clicks "KI Treff Innsbruck ⓘ"
    ↓
Modal opens
    ↓
Enters email: thomas@example.com
    ↓
Clicks "Abschicken"
    ↓
Email stored in Redis
    ↓
Confirmation email sent (Double Opt-in)
    ↓
User clicks confirmation link
    ↓
✅ Subscribed!
```

### 2. New Event Created

```
Admin creates new Stammtisch in /kinnside
    ↓
Fills in:
- Date/Time
- Location
- Topic/Description
    ↓
Clicks "Create & Send Invitations"
    ↓
Backend:
1. Fetches all confirmed subscribers from Redis
2. Calls Google Calendar API
3. Creates event with ALL as attendees
4. sendUpdates: 'all'
    ↓
Google automatically sends invitations
    ↓
✅ Users receive calendar invite in Gmail!
```

### 3. User Receives Invitation

```
Gmail inbox notification:
"📅 KINN KI Treff Innsbruck"
    ↓
Opens email
    ↓
Sees full event details + buttons
    ↓
Clicks "Yes"
    ↓
✅ Event appears in Google Calendar
✅ Reminders set automatically
```

### 4. Event Updates

```
Admin updates event (location change, etc.)
    ↓
calendar.events.update()
sendUpdates: 'all'
    ↓
Google sends update notification to all attendees
    ↓
Users see update in calendar
```

---

## 💻 Technical Implementation

### Setup: Google Cloud Project

```bash
# 1. Create Google Cloud Project
gcloud projects create kinn-calendar

# 2. Enable Calendar API
gcloud services enable calendar-json.googleapis.com

# 3. Create Service Account
gcloud iam service-accounts create kinn-calendar-bot \
  --display-name="KINN Calendar Bot"

# 4. Download credentials
gcloud iam service-accounts keys create kinn-service-account.json \
  --iam-account=kinn-calendar-bot@kinn-calendar.iam.gserviceaccount.com
```

### Setup: KINN Google Calendar

```
1. Create Google Account: treff@kinn.at
2. Create Calendar: "KINN KI Treff Innsbruck"
3. Share calendar with Service Account:
   - Settings → Share with specific people
   - Add: kinn-calendar-bot@kinn-calendar.iam.gserviceaccount.com
   - Permission: "Make changes to events"
```

### Code: Google Calendar Client

```typescript
// lib/google-calendar.ts

import { google } from 'googleapis'
import { JWT } from 'google-auth-library'

// Service Account Credentials
const serviceAccountKey = JSON.parse(
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY!
)

// Initialize Auth
const auth = new JWT({
  email: serviceAccountKey.client_email,
  key: serviceAccountKey.private_key,
  scopes: ['https://www.googleapis.com/auth/calendar']
})

// Initialize Calendar Client
const calendar = google.calendar({ version: 'v3', auth })

// Get Calendar ID from env (KINN's calendar)
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID! // e.g., "treff@kinn.at"

export { calendar, CALENDAR_ID }
```

### Code: Create Event with Attendees

```typescript
// lib/calendar-events.ts

import { calendar, CALENDAR_ID } from './google-calendar'
import { redis } from './redis'

interface StammtischEvent {
  title: string
  date: Date
  endDate: Date
  location: string
  description: string
  topic: string
}

export async function createStammtischEvent(event: StammtischEvent) {
  // 1. Fetch all confirmed subscribers from Redis
  const subscribers = await redis.smembers('kinn:subscribers:confirmed')

  if (subscribers.length === 0) {
    throw new Error('No subscribers found')
  }

  // 2. Format attendees
  const attendees = subscribers.map(email => ({
    email,
    responseStatus: 'needsAction' // They haven't responded yet
  }))

  // 3. Create event
  const response = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    sendUpdates: 'all', // ← CRITICAL: Google sends invitations!
    requestBody: {
      summary: `KINN KI Treff: ${event.topic}`,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.date.toISOString(),
        timeZone: 'Europe/Vienna'
      },
      end: {
        dateTime: event.endDate.toISOString(),
        timeZone: 'Europe/Vienna'
      },
      attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }       // 1 hour before
        ]
      },
      guestsCanInviteOthers: true,
      guestsCanModify: false,
      guestsCanSeeOtherGuests: true
    }
  })

  return response.data
}
```

### Code: Update Event (Attendee Changes)

```typescript
// When new subscriber joins
export async function addAttendeeToFutureEvents(email: string) {
  // 1. Fetch all future events
  const now = new Date()
  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: now.toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  })

  const events = response.data.items || []

  // 2. Add subscriber to each event
  for (const event of events) {
    const attendees = event.attendees || []

    // Check if already invited
    if (attendees.some(a => a.email === email)) {
      continue
    }

    // Add new attendee
    attendees.push({
      email,
      responseStatus: 'needsAction'
    })

    // Update event
    await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId: event.id!,
      sendUpdates: 'all', // Send invitation to new person
      requestBody: {
        attendees
      }
    })
  }
}
```

### Code: Remove Attendee (Unsubscribe)

```typescript
export async function removeAttendeeFromFutureEvents(email: string) {
  const now = new Date()
  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: now.toISOString(),
    maxResults: 10
  })

  const events = response.data.items || []

  for (const event of events) {
    const attendees = event.attendees || []
    const filtered = attendees.filter(a => a.email !== email)

    if (filtered.length < attendees.length) {
      await calendar.events.patch({
        calendarId: CALENDAR_ID,
        eventId: event.id!,
        sendUpdates: 'all', // Notify they're removed
        requestBody: {
          attendees: filtered
        }
      })
    }
  }
}
```

---

## 🎨 Admin Dashboard

### Create Event UI

```typescript
// app/kinnside/events/page.tsx

'use client'

import { useState } from 'react'

export default function CreateEventPage() {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    topic: '',
    date: '',
    time: '18:30',
    location: 'Die Bäckerei, Dreiheiligenstraße 21a, 6020 Innsbruck',
    description: ''
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await response.json()

      if (data.success) {
        alert(`Event created! ${data.attendeeCount} invitations sent.`)
        // Reset form
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      alert('Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">
        Neuen KI Stammtisch erstellen
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-medium mb-2">
            Thema
          </label>
          <input
            type="text"
            value={form.topic}
            onChange={e => setForm({...form, topic: e.target.value})}
            placeholder="Local LLMs für KMUs"
            className="w-full p-3 border rounded"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-2">
              Datum
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({...form, date: e.target.value})}
              className="w-full p-3 border rounded"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              Uhrzeit
            </label>
            <input
              type="time"
              value={form.time}
              onChange={e => setForm({...form, time: e.target.value})}
              className="w-full p-3 border rounded"
              required
            />
          </div>
        </div>

        <div>
          <label className="block font-medium mb-2">
            Ort
          </label>
          <input
            type="text"
            value={form.location}
            onChange={e => setForm({...form, location: e.target.value})}
            className="w-full p-3 border rounded"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-2">
            Beschreibung
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
            rows={4}
            className="w-full p-3 border rounded"
            placeholder="Monatlicher KI-Austausch..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white p-4 rounded font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Erstelle Event & sende Einladungen...' : 'Event erstellen & Einladungen versenden'}
        </button>
      </form>
    </div>
  )
}
```

### API Endpoint

```typescript
// app/api/events/create/route.ts

import { NextRequest } from 'next/server'
import { createStammtischEvent } from '@/lib/calendar-events'
import { redis } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    const { topic, date, time, location, description } = await request.json()

    // Parse date/time
    const startDate = new Date(`${date}T${time}:00+01:00`) // Vienna time
    const endDate = new Date(startDate.getTime() + 2.5 * 60 * 60 * 1000) // +2.5 hours

    // Create event with all subscribers
    const event = await createStammtischEvent({
      title: `KINN KI Treff: ${topic}`,
      date: startDate,
      endDate,
      location,
      description: description || `Monatlicher KI-Austausch in Innsbruck.\n\nThema: ${topic}\n\nMehr Infos: https://kinn.at`,
      topic
    })

    // Get subscriber count
    const subscriberCount = await redis.scard('kinn:subscribers:confirmed')

    return Response.json({
      success: true,
      event,
      attendeeCount: subscriberCount
    })

  } catch (error) {
    console.error('Error creating event:', error)
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
```

---

## 🚦 User Signup Flow (with Auto-Invite to Future Events)

```typescript
// app/api/confirm/route.ts (Double Opt-in Confirmation)

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return new Response('Invalid token', { status: 400 })
  }

  // 1. Verify token
  const email = await redis.get(`kinn:pending:${token}`)

  if (!email) {
    return new Response('Token expired or invalid', { status: 400 })
  }

  // 2. Add to confirmed subscribers
  await redis.sadd('kinn:subscribers:confirmed', email)
  await redis.del(`kinn:pending:${token}`)

  // 3. Add to all future events!
  try {
    await addAttendeeToFutureEvents(email)
  } catch (error) {
    console.error('Failed to add to future events:', error)
    // Don't fail the confirmation, just log
  }

  // 4. Redirect to success page
  return Response.redirect(new URL('/success', request.url))
}
```

---

## 📊 Benefits of This Approach

### For Users

✅ **One-time signup** → Auto-invited to all future events
✅ **Native Gmail experience** → "Yes/No/Maybe" buttons
✅ **Automatic calendar entry** → No manual import
✅ **Reminders work** → 1 day + 1 hour before
✅ **Updates synced** → Location changes notify everyone
✅ **RSVP tracking** → Organizer sees who's coming

### For KINN

✅ **Attendance tracking** → See RSVPs in Google Calendar
✅ **No email template needed** → Google handles everything
✅ **Professional appearance** → Real calendar invitations
✅ **Scalable** → Works for 10 or 1000 people
✅ **Update flexibility** → Change location/time, auto-notify all

---

## 🔐 Privacy & Permissions

### What Users See

```
From: KINN <treff@kinn.at>
Subject: Invitation: KINN KI Treff Innsbruck @ Nov 20, 2025 6:30pm - 9pm (CET)

You have been invited to the following event:

KINN KI Treff: Local LLMs für KMUs
Nov 20, 2025, 6:30 PM – 9:00 PM (Vienna)
Die Bäckerei, Innsbruck

[Yes - I'll attend] [No] [Maybe]

Organizer: KINN (treff@kinn.at)
```

### Privacy Considerations

- ✅ Users can see other attendees (builds community!)
- ✅ Users can invite others (word-of-mouth growth)
- ❌ Users cannot modify event details
- ✅ Unsubscribe removes from future events
- ✅ GDPR compliant (email stored, explicit consent)

---

## 💰 Costs

```
Google Calendar API: FREE
Google Cloud Service Account: FREE
Upstash Redis: FREE tier (10K commands/day)
Next.js on Vercel: FREE tier
Resend (for confirmation emails): FREE tier (100/day)

Total: €0/month for <1000 subscribers
```

---

## 🎯 Implementation Stages

### Stage 0: MVP Manual (Current)
- Landing page with mailto:
- Manual email list
- Manual calendar invites

### Stage 1: Semi-Automated
- Form submit → Redis
- Resend confirmation emails
- Manual calendar creation

### **Stage 3: Full Calendar Automation** ← THIS!
- Auto double opt-in
- Admin dashboard to create events
- Google Calendar API integration
- Automatic invitations to ALL subscribers
- New signups auto-added to future events

**Effort: +4-5 days**
**Result: ONE CLICK = ALL INVITED 🎉**

---

## 📋 Setup Checklist

- [ ] Create Google Cloud Project
- [ ] Enable Google Calendar API
- [ ] Create Service Account
- [ ] Download credentials JSON
- [ ] Create KINN Google Account (treff@kinn.at)
- [ ] Create KINN Google Calendar
- [ ] Share calendar with Service Account
- [ ] Add credentials to Vercel env vars
- [ ] Implement calendar client
- [ ] Implement createStammtischEvent()
- [ ] Implement addAttendeeToFutureEvents()
- [ ] Build admin dashboard
- [ ] Test with 2-3 test emails
- [ ] Launch! 🚀

---

**This is the PROPER way to do recurring event invitations! 🎯**

No more "add to calendar" links. Real Google Calendar invitations. Professional. Automated. Scalable.

KINN - Wo Tiroler KI Profil bekommt.
