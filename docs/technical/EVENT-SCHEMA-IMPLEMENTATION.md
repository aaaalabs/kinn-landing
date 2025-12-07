# Event Schema Implementation Guide

**Practical examples and code patterns for using the KINN Event Schema**

---

## Quick Start

### 1. Installation

The event schema is defined in TypeScript at:
```
/lib/schemas/event.schema.ts
```

No installation needed - just import the types:

```typescript
import {
  CompleteKINNEvent,
  EventCreateInput,
  EventFormat,
  EventAttendanceMode,
  EventStatus,
  Speaker,
  Address
} from '@/lib/schemas/event.schema';
```

### 2. Creating Your First Event

```typescript
import { EventCreateInput, EventFormat } from '@/lib/schemas/event.schema';

// Simple API call to create event
async function createStammtisch(topic: string, date: Date) {
  const eventData: EventCreateInput = {
    title: `KINN KI Treff Innsbruck: ${topic}`,
    description: 'Monatlicher KI-Austausch in Innsbruck',
    startDate: date.toISOString(),
    endDate: new Date(date.getTime() + 2.5 * 60 * 60 * 1000).toISOString(),
    location: {
      streetAddress: 'Dreiheiligenstraße 21a',
      addressLocality: 'Innsbruck',
      postalCode: '6020',
      addressCountry: 'AT'
    },
    format: EventFormat.MEETUP,
    topic
  };

  const response = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });

  const result = await response.json();
  return result.data;
}
```

---

## Common Use Cases

### Use Case 1: Display Event on Landing Page

```typescript
// Component: EventCard.tsx
import { isUpcomingEvent, formatEventDate, formatAddress } from '@/lib/schemas/event.schema';
import type { EventSummary } from '@/lib/schemas/event.schema';

export function EventCard({ event }: { event: EventSummary }) {
  if (!isUpcomingEvent(event)) return null;

  return (
    <div className="event-card">
      <img src={event.image?.url} alt={event.title} />

      <h3>{event.title}</h3>
      <p>{event.description}</p>

      <div className="event-details">
        <span>📅 {formatEventDate(event)}</span>
        <span>📍 {formatAddress(event.location)}</span>

        {event.speakers && event.speakers.length > 0 && (
          <div className="speakers">
            <strong>Speakers:</strong>
            {event.speakers.map(s => (
              <span key={s.email}>{s.name}</span>
            ))}
          </div>
        )}
      </div>

      {event.isFree && <span className="badge">FREE</span>}

      {event.registrationRequired && (
        <a href={event.registrationRequired ? '#' : undefined} className="btn-primary">
          Register Now
        </a>
      )}
    </div>
  );
}
```

### Use Case 2: Admin Dashboard - Create Event Form

```typescript
// pages/admin/create-event.tsx
import { useState } from 'react';
import { EventCreateInput, EventFormat, SkillLevel } from '@/lib/schemas/event.schema';

export default function CreateEventPage() {
  const [form, setForm] = useState<EventCreateInput>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: {
      streetAddress: 'Dreiheiligenstraße 21a',
      addressLocality: 'Innsbruck',
      postalCode: '6020',
      addressCountry: 'AT'
    }
  });

  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate end date (default 2.5 hours)
      const start = new Date(form.startDate);
      const end = new Date(start.getTime() + 2.5 * 60 * 60 * 1000);

      const eventData = {
        ...form,
        endDate: end.toISOString(),
        speakers,
        format: EventFormat.MEETUP,
        aiMetadata: {
          topics: form.topic?.split(',').map(t => t.trim()) || [],
          skillLevel: SkillLevel.INTERMEDIATE
        }
      };

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });

      if (response.ok) {
        const { data } = await response.json();
        alert(`Event created: ${data.id}`);
      } else {
        throw new Error('Failed to create event');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6">
      <h1>Create New Event</h1>

      {/* Title */}
      <div className="form-group">
        <label>Title</label>
        <input
          type="text"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="KINN KI Treff Innsbruck: Prompt Engineering"
          required
        />
      </div>

      {/* Description */}
      <div className="form-group">
        <label>Description</label>
        <textarea
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Monatlicher KI-Austausch in Innsbruck"
          required
        />
      </div>

      {/* Date & Time */}
      <div className="form-row">
        <div className="form-group">
          <label>Start Date & Time</label>
          <input
            type="datetime-local"
            value={form.startDate}
            onChange={e => setForm({ ...form, startDate: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Location */}
      <div className="form-group">
        <label>Street Address</label>
        <input
          type="text"
          value={form.location.streetAddress}
          onChange={e => setForm({
            ...form,
            location: { ...form.location, streetAddress: e.target.value }
          })}
        />
      </div>

      {/* Speakers */}
      <div className="form-group">
        <h3>Speakers</h3>
        {speakers.map((speaker, i) => (
          <div key={i} className="speaker-item">
            <input
              type="text"
              value={speaker.name}
              onChange={e => {
                const updated = [...speakers];
                updated[i].name = e.target.value;
                setSpeakers(updated);
              }}
              placeholder="Speaker name"
            />
            <button
              type="button"
              onClick={() => setSpeakers(speakers.filter((_, idx) => idx !== i))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSpeakers([...speakers, { name: '', email: '' }])}
        >
          Add Speaker
        </button>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  );
}
```

### Use Case 3: Send Event Invitations via Email

```typescript
// lib/event-emails.ts
import { CompleteKINNEvent } from '@/lib/schemas/event.schema';
import { formatEventDate, formatEventTime, formatAddress } from '@/lib/schemas/event.schema';

export function generateEventInvitationHTML(event: CompleteKINNEvent): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Work Sans, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .event-details { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 8px 0; }
          .speakers { margin: 20px 0; }
          .speaker { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited!</h1>
            <h2>${event.title}</h2>
          </div>

          <div class="event-details">
            <p><strong>📅 Date:</strong> ${formatEventDate(event)}</p>
            <p><strong>⏰ Time:</strong> ${formatEventTime(event)}</p>
            <p><strong>📍 Location:</strong> ${formatAddress(event.location)}</p>

            ${event.description ? `<p><strong>About:</strong></p><p>${event.description}</p>` : ''}

            ${event.speakers && event.speakers.length > 0 ? `
              <div class="speakers">
                <strong>Speakers:</strong>
                ${event.speakers.map(s => `
                  <div class="speaker">
                    <p>${s.name}${s.title ? ` - ${s.title}` : ''}</p>
                    ${s.bio ? `<p>${s.bio}</p>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatCalendarDate(event.startDate)}/${formatCalendarDate(event.endDate)}" class="button">
              Add to Google Calendar
            </a>
            <a href="https://kinn.at/events/${event.metadata.slug}" class="button">
              View Details
            </a>
          </div>

          <p>Looking forward to seeing you!</p>
          <p>Best regards,<br />The KINN Team</p>
        </div>
      </body>
    </html>
  `;
}

function formatCalendarDate(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
```

### Use Case 4: Export Event as ICS File

```typescript
// lib/event-ics.ts
import { CompleteKINNEvent, formatAddress } from '@/lib/schemas/event.schema';

export function eventToICS(event: CompleteKINNEvent): string {
  const escapeText = (text: string) => text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');

  const formatDateTime = (date: string | Date) => {
    const d = new Date(date);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KINN//KINN KI Treff Innsbruck//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${event.id}@kinn.at`,
    `DTSTAMP:${formatDateTime(new Date())}`,
    `DTSTART:${formatDateTime(event.startDate)}`,
    `DTEND:${formatDateTime(event.endDate)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(formatAddress(event.location))}`,
    `ORGANIZER;CN=${event.organizer.name}:mailto:${event.organizer.email}`,
    ...event.attendees.map(a => `ATTENDEE;CN=${a.name || a.email}:mailto:${a.email}`),
    ...event.reminders.map(r => [
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-PT${r.minutes}M`,
      `DESCRIPTION:${event.title}`,
      'END:VALARM'
    ].join('\r\n')),
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  return lines.join('\r\n');
}

// API endpoint example
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { eventId } = req.query;

  try {
    const event = await db.events.findOne({ id: eventId });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const icsContent = eventToICS(event);

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${eventId}.ics"`);
    res.send(icsContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Use Case 5: Sync with Google Calendar

```typescript
// lib/google-calendar-sync.ts
import { CompleteKINNEvent } from '@/lib/schemas/event.schema';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const serviceAccountKey = JSON.parse(
  Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!, 'base64').toString()
);

const auth = new JWT({
  email: serviceAccountKey.client_email,
  key: serviceAccountKey.private_key,
  scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3', auth });
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID!;

export async function createGoogleCalendarEvent(event: CompleteKINNEvent) {
  try {
    const result = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      sendUpdates: 'all',
      requestBody: {
        summary: event.title,
        description: event.fullDescription || event.description,
        location: `${event.location.streetAddress}, ${event.location.addressLocality}`,
        start: {
          dateTime: new Date(event.startDate).toISOString(),
          timeZone: event.timezone
        },
        end: {
          dateTime: new Date(event.endDate).toISOString(),
          timeZone: event.timezone
        },
        attendees: event.attendees.map(a => ({
          email: a.email,
          displayName: a.name
        })),
        reminders: {
          useDefault: false,
          overrides: event.reminders.map(r => ({
            method: r.method as any,
            minutes: r.minutes
          }))
        },
        conferenceData: event.conferenceData ? {
          conferenceType: event.conferenceData.conferenceType,
          entryPoints: event.conferenceData.entryPoints
        } : undefined
      }
    });

    return result.data;
  } catch (error) {
    console.error('Google Calendar sync failed:', error);
    throw error;
  }
}

export async function updateGoogleCalendarEvent(eventId: string, event: Partial<CompleteKINNEvent>) {
  try {
    const result = await calendar.events.update({
      calendarId: CALENDAR_ID,
      eventId: event.metadata?.externalIds?.googleCalendarEventId || eventId,
      sendUpdates: 'all',
      requestBody: {
        summary: event.title,
        description: event.description,
        attendees: event.attendees?.map(a => ({
          email: a.email,
          displayName: a.name
        }))
      }
    });

    return result.data;
  } catch (error) {
    console.error('Google Calendar update failed:', error);
    throw error;
  }
}
```

### Use Case 6: Generate JSON-LD Schema Data

```typescript
// lib/event-schema.ts
import { CompleteKINNEvent } from '@/lib/schemas/event.schema';

export function generateEventJsonLd(event: CompleteKINNEvent): object {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Event',
    name: event.title,
    description: event.fullDescription || event.description,
    startDate: new Date(event.startDate).toISOString(),
    endDate: new Date(event.endDate).toISOString(),
    eventAttendanceMode: `https://schema.org/${
      event.attendanceMode === 'online' ? 'OnlineEventAttendanceMode' :
      event.attendanceMode === 'offline' ? 'OfflineEventAttendanceMode' :
      'HybridEventAttendanceMode'
    }`,
    eventStatus: `https://schema.org/Event${event.status.charAt(0).toUpperCase()}${event.status.slice(1)}`,
    location: {
      '@type': 'Place',
      name: event.location.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.location.streetAddress,
        addressLocality: event.location.addressLocality,
        postalCode: event.location.postalCode,
        addressCountry: event.location.addressCountry
      }
    },
    organizer: {
      '@type': 'Organization',
      name: event.organizer.name,
      url: event.organizer.url
    },
    performer: event.speakers?.map(s => ({
      '@type': 'Person',
      name: s.name,
      url: s.links?.website
    })),
    offers: {
      '@type': 'Offer',
      url: event.registration?.url,
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      validFrom: event.metadata?.createdAt
    },
    image: event.image?.url,
    keywords: event.aiMetadata?.topics?.join(', '),
    attendeeCount: event.metadata?.analytics?.registrations || event.attendees.length
  };
}

// Next.js page example
export function EventPage({ event }: { event: CompleteKINNEvent }) {
  const schemaData = generateEventJsonLd(event);

  return (
    <>
      <Head>
        <title>{event.title}</title>
        <meta name="description" content={event.description} />
        <meta property="og:title" content={event.title} />
        <meta property="og:description" content={event.description} />
        <meta property="og:image" content={event.image?.url} />
        <meta property="og:type" content="event" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
      </Head>

      {/* Page content */}
    </>
  );
}
```

### Use Case 7: Validate Event Data

```typescript
// lib/event-validation.ts
import { z } from 'zod';
import { EventStatus, EventAttendanceMode, EventFormat } from '@/lib/schemas/event.schema';

const AddressSchema = z.object({
  streetAddress: z.string().min(5),
  addressLocality: z.string().min(2),
  postalCode: z.string().regex(/^\d{4}$/),
  addressCountry: z.string().length(2),
  addressRegion: z.string().optional(),
  name: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

const SpeakerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  title: z.string().optional(),
  organization: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional()
});

const EventCreateSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(10).max(500),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  location: AddressSchema,
  format: z.nativeEnum(EventFormat).optional(),
  topic: z.string().optional(),
  speakers: z.array(SpeakerSchema).optional(),
  registrationRequired: z.boolean().optional()
});

export function validateEventCreate(data: unknown) {
  try {
    return EventCreateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

// API usage
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('');

  try {
    const validated = validateEventCreate(req.body);
    const event = await createEvent(validated);
    return res.json({ success: true, data: event });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}
```

---

## Database Operations

### MongoDB Examples

```typescript
// Create
const event = await db.collection('events').insertOne(eventData);

// Read
const event = await db.collection('events').findOne({ id: eventId });
const upcoming = await db.collection('events')
  .find({ startDate: { $gte: new Date() }, published: true })
  .sort({ startDate: 1 })
  .toArray();

// Update
await db.collection('events').updateOne(
  { id: eventId },
  { $set: eventUpdates }
);

// Delete
await db.collection('events').deleteOne({ id: eventId });

// Indexes
await db.collection('events').createIndex({ startDate: 1 });
await db.collection('events').createIndex({ slug: 1 }, { unique: true });
```

### PostgreSQL Examples

```typescript
// Create
const { data } = await db.from('events').insert(eventData).select();

// Read
const { data: event } = await db.from('events')
  .select('*')
  .eq('id', eventId)
  .single();

const { data: upcoming } = await db.from('events')
  .select('*')
  .gte('start_date', new Date().toISOString())
  .eq('published', true)
  .order('start_date', { ascending: true });

// Update
const { data } = await db.from('events')
  .update(eventUpdates)
  .eq('id', eventId)
  .select();

// Delete
await db.from('events').delete().eq('id', eventId);
```

---

## Testing

```typescript
// __tests__/event.test.ts
import { describe, it, expect } from 'vitest';
import {
  isUpcomingEvent,
  isPastEvent,
  getEventDurationHours,
  formatAddress
} from '@/lib/schemas/event.schema';
import type { CompleteKINNEvent } from '@/lib/schemas/event.schema';

const mockEvent: CompleteKINNEvent = {
  id: 'test-event-1',
  title: 'Test Event',
  description: 'Test description',
  fullDescription: 'Full test description',
  startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  endDate: new Date(Date.now() + 86400000 + 7200000).toISOString(), // Tomorrow + 2h
  timezone: 'Europe/Vienna',
  location: {
    streetAddress: 'Test Street 1',
    addressLocality: 'Test City',
    postalCode: '1234',
    addressCountry: 'AT'
  },
  // ... other required fields
};

describe('Event Schema', () => {
  it('should identify upcoming events', () => {
    expect(isUpcomingEvent(mockEvent)).toBe(true);
  });

  it('should calculate duration correctly', () => {
    const hours = getEventDurationHours(mockEvent);
    expect(hours).toBe(2);
  });

  it('should format address correctly', () => {
    const address = formatAddress(mockEvent.location);
    expect(address).toBe('Test Street 1, 1234 Test City');
  });
});
```

---

## Troubleshooting

### Problem: Timezone Issues

```typescript
// ❌ Wrong: Ambiguous timezone
{ startDate: '2025-02-20T18:30:00' }

// ✅ Correct: Explicit timezone
{ startDate: '2025-02-20T18:30:00+01:00' }
// OR
{ startDate: '2025-02-20T18:30:00', timezone: 'Europe/Vienna' }
```

### Problem: Google Calendar API Errors

```typescript
// Check credentials
if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_KEY');
}

// Verify attendee emails are valid
const validAttendees = event.attendees
  .filter(a => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email))
  .map(a => ({ email: a.email }));

// Check sendUpdates parameter
const result = await calendar.events.insert({
  calendarId: CALENDAR_ID,
  sendUpdates: 'all',  // This tells Google to send invitations
  requestBody: { ... }
});
```

### Problem: ICS File Invalid

```typescript
// Always use proper escaping
const escapeText = (text: string) => text
  .replace(/\\/g, '\\\\')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;')
  .replace(/\n/g, '\\n');

// Use UTC times (Z suffix)
const formatDateTime = (date: string | Date) => {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};
```

---

## Next Steps

1. **Implement Database Layer** - Set up MongoDB/PostgreSQL with event schema
2. **Create API Endpoints** - Build /api/events CRUD operations
3. **Build Admin Dashboard** - Event creation and management UI
4. **Email Integration** - Send invitations and reminders
5. **Calendar Sync** - Auto-sync with Google Calendar
6. **Public Pages** - Display events on website
7. **Social Sharing** - Implement OpenGraph and social preview

See `EVENT-SCHEMA-STANDARD.md` for detailed specification.
