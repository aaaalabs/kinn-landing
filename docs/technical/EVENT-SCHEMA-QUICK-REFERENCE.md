# Event Schema Quick Reference

**Handy reference for common event operations**

---

## Import Statements

```typescript
import {
  // Types
  CompleteKINNEvent,
  EventCreateInput,
  EventUpdateInput,
  PublicEvent,
  EventSummary,

  // Enums
  EventStatus,
  EventAttendanceMode,
  EventFormat,
  SkillLevel,

  // Helper Functions
  formatEventDate,
  formatEventTime,
  formatAddress,
  isUpcomingEvent,
  isPastEvent,
  isOngoingEvent,
  getEventDurationHours,

  // Defaults
  DEFAULT_LOCATION,
  DEFAULT_ORGANIZER,
  DEFAULT_REMINDERS,
  DEFAULT_ATTENDANCE_MODE,
  DEFAULT_FORMAT
} from '@/lib/schemas/event.schema';
```

---

## Common Operations

### Create Minimal Event

```typescript
const event: EventCreateInput = {
  title: 'Event Title',
  description: 'Event description',
  startDate: '2025-02-20T18:30:00+01:00',
  endDate: '2025-02-20T21:00:00+01:00',
  location: DEFAULT_LOCATION
};
```

### Create Stammtisch Event

```typescript
const stammtisch: EventCreateInput = {
  title: `KINN KI Treff Innsbruck: ${topic}`,
  description: 'Monatlicher KI-Austausch in Innsbruck',
  startDate: date.toISOString(),
  endDate: new Date(date.getTime() + 2.5 * 60 * 60 * 1000).toISOString(),
  location: DEFAULT_LOCATION,
  format: EventFormat.MEETUP,
  topic,
  speakers: [{ name: 'Speaker Name', email: 'speaker@example.com' }]
};
```

### Format For Display

```typescript
// Get formatted date
const dateStr = formatEventDate(event);
// Output: "Donnerstag, 20. Februar 2025"

// Get formatted time
const timeStr = formatEventTime(event);
// Output: "18:30 - 21:00"

// Get formatted address
const addr = formatAddress(event.location);
// Output: "Dreiheiligenstraße 21a, 6020 Innsbruck"

// Get duration
const hours = getEventDurationHours(event);
// Output: 2.5
```

### Check Event Status

```typescript
if (isUpcomingEvent(event)) {
  // Show in "upcoming events" section
}

if (isPastEvent(event)) {
  // Show in "past events" archive
}

if (isOngoingEvent(event)) {
  // Show as "happening now"
}
```

### Add Speakers

```typescript
const event: CompleteKINNEvent = {
  // ...other fields
  speakers: [
    {
      name: 'Thomas Expert',
      email: 'thomas@example.com',
      title: 'AI Engineer',
      organization: 'TechCorp',
      bio: 'Expert in LLMs...',
      avatarUrl: 'https://example.com/thomas.jpg',
      links: {
        linkedin: 'https://linkedin.com/in/thomas',
        twitter: 'https://twitter.com/thomas',
        github: 'https://github.com/thomas'
      }
    }
  ]
};
```

### Add AI Metadata

```typescript
const event: CompleteKINNEvent = {
  // ...other fields
  aiMetadata: {
    topics: ['Local LLMs', 'RAG', 'Fine-tuning'],
    technologies: ['Llama 2', 'Mistral', 'GPT-4'],
    learningOutcomes: [
      'Understand how LLMs work',
      'Learn to deploy locally',
      'Optimize for your use case'
    ],
    prerequisites: ['Python basics', 'ML familiarity'],
    skillLevel: SkillLevel.INTERMEDIATE,
    resourceLinks: [
      {
        title: 'GitHub Repository',
        url: 'https://github.com/example/repo',
        type: 'github'
      },
      {
        title: 'Blog Post',
        url: 'https://example.com/blog',
        type: 'documentation'
      }
    ],
    slidesUrl: 'https://slides.example.com/presentation',
    recordingUrl: 'https://youtube.com/watch?v=...'
  }
};
```

### Add Attendees

```typescript
const event: CompleteKINNEvent = {
  // ...other fields
  attendees: [
    {
      email: 'user@example.com',
      name: 'John Doe',
      responseStatus: 'accepted',
      role: 'Participant'
    },
    {
      email: 'admin@kinn.at',
      name: 'Admin User',
      organizer: true
    }
  ]
};
```

### Add Offers (Pricing)

```typescript
const event: CompleteKINNEvent = {
  // ...other fields
  isFree: true,
  offers: [
    {
      name: 'Free Admission',
      price: 0,
      priceCurrency: 'EUR',
      availability: 'InStock'
    }
  ]
};
```

### Add Reminders

```typescript
const event: CompleteKINNEvent = {
  // ...other fields
  reminders: [
    { method: 'email', minutes: 1440 },    // 1 day before
    { method: 'popup', minutes: 60 }       // 1 hour before
  ]
};
```

### Register Event

```typescript
const event: CompleteKINNEvent = {
  // ...other fields
  registrationRequired: true,
  registration: {
    required: true,
    url: 'https://kinn.at/register',
    deadline: '2025-02-19T18:30:00+01:00',
    capacity: {
      maximum: 50,
      current: 35,
      hasWaitlist: true
    },
    instructions: 'Please bring your laptop',
    fields: [
      {
        name: 'experience_level',
        type: 'select',
        required: true,
        options: ['Beginner', 'Intermediate', 'Advanced']
      }
    ]
  }
};
```

### Add Social Metadata

```typescript
const event: CompleteKINNEvent = {
  // ...other fields
  social: {
    hashtags: ['KINN', 'AI', 'LLM', 'Innsbruck'],
    socialMessage: 'Join us for a discussion on Local LLMs! 🤖',
    ogImage: 'https://kinn.at/events/llm-banner.jpg',
    ogDescription: 'Learn how to deploy large language models locally',
    twitterHandle: '@KINNat',
    linkedinEventUrl: 'https://linkedin.com/events/...',
    eventbriteUrl: 'https://eventbrite.com/e/...',
    meetupUrl: 'https://meetup.com/en-US/KINN/events/...'
  }
};
```

### Cancel Event

```typescript
const cancelled: EventUpdateInput = {
  status: EventStatus.CANCELLED,
  cancellationReason: 'Venue booking conflict. We apologize for the short notice.'
};

await updateEvent(eventId, cancelled);
```

### Reschedule Event

```typescript
const rescheduled: EventUpdateInput = {
  status: EventStatus.RESCHEDULED,
  previousStartDate: event.startDate,
  startDate: '2025-02-27T18:30:00+01:00',
  endDate: '2025-02-27T21:00:00+01:00'
};

await updateEvent(eventId, rescheduled);
```

---

## API Endpoints

### List Events

```bash
GET /api/events
GET /api/events?upcoming=true
GET /api/events?status=scheduled
GET /api/events?format=meetup
GET /api/events?page=1&limit=20
```

### Get Event

```bash
GET /api/events/:eventId
GET /api/events/:slug
```

### Create Event

```bash
POST /api/events
Content-Type: application/json

{
  "title": "...",
  "description": "...",
  "startDate": "...",
  "endDate": "...",
  "location": {...}
}
```

### Update Event

```bash
PATCH /api/events/:eventId
Content-Type: application/json

{
  "title": "Updated Title",
  "speakers": [...]
}
```

### Delete Event

```bash
DELETE /api/events/:eventId
```

### Export as ICS

```bash
GET /api/events/:eventId/download.ics
```

### Get Schema.org JSON-LD

```bash
GET /api/events/:eventId/schema
```

---

## Database Queries

### Find Upcoming Events

```typescript
// MongoDB
const upcoming = await db.collection('events')
  .find({ startDate: { $gte: new Date() } })
  .sort({ startDate: 1 })
  .toArray();

// PostgreSQL
const { data } = await db.from('events')
  .select('*')
  .gte('start_date', new Date().toISOString())
  .order('start_date', { ascending: true });
```

### Find By Topic

```typescript
// MongoDB
const ai_events = await db.collection('events')
  .find({ 'aiMetadata.topics': 'Local LLMs' })
  .toArray();

// PostgreSQL
const { data } = await db.from('events')
  .select('*')
  .contains('ai_metadata', { topics: ['Local LLMs'] });
```

### Find By Speaker

```typescript
// MongoDB
const speaker_events = await db.collection('events')
  .find({ 'speakers.name': 'Thomas Expert' })
  .toArray();

// PostgreSQL
const { data } = await db.from('events')
  .select('*')
  .contains('speakers', [{ name: 'Thomas Expert' }]);
```

### Find Published Events

```typescript
// MongoDB
const published = await db.collection('events')
  .find({ published: true, status: 'scheduled' })
  .toArray();

// PostgreSQL
const { data } = await db.from('events')
  .select('*')
  .eq('published', true)
  .eq('status', 'scheduled');
```

---

## Response Types

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "event-123",
    "title": "Event Title",
    ...
  }
}
```

### List Response

```json
{
  "success": true,
  "data": [
    { "id": "event-1", ... },
    { "id": "event-2", ... }
  ],
  "count": 2,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasMore": true
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Event not found",
  "message": "No event with ID event-123"
}
```

---

## Enums

### EventStatus

```typescript
enum EventStatus {
  SCHEDULED = 'scheduled',      // Normal state
  CANCELLED = 'cancelled',      // Event cancelled
  RESCHEDULED = 'rescheduled',  // Date changed
  POSTPONED = 'postponed',      // Temp postponement
  CONFIRMED = 'confirmed'       // Definitely happening
}
```

### EventAttendanceMode

```typescript
enum EventAttendanceMode {
  ONLINE = 'online',      // Virtual only
  OFFLINE = 'offline',    // In-person only
  MIXED = 'mixed'         // Hybrid
}
```

### EventFormat

```typescript
enum EventFormat {
  MEETUP = 'meetup',
  WORKSHOP = 'workshop',
  CONFERENCE = 'conference',
  PANEL = 'panel',
  NETWORKING = 'networking',
  LECTURE = 'lecture',
  HACKATHON = 'hackathon',
  TOUR = 'tour',
  SOCIAL = 'social',
  ONLINE_WEBINAR = 'online-webinar'
}
```

### SkillLevel

```typescript
enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  MIXED = 'mixed'
}
```

---

## Validation Examples

### With Zod

```typescript
import { z } from 'zod';

const EventCreateSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(10),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  location: z.object({
    streetAddress: z.string(),
    addressLocality: z.string(),
    postalCode: z.string(),
    addressCountry: z.string()
  })
});

const validated = EventCreateSchema.parse(eventData);
```

---

## Helper Functions

### Format Helpers

```typescript
formatEventDate(event);           // "Donnerstag, 20. Februar 2025"
formatEventTime(event);            // "18:30 - 21:00"
formatAddress(event.location);    // "Street 1, 1234 City"
```

### Status Checkers

```typescript
isUpcomingEvent(event);      // true/false
isPastEvent(event);          // true/false
isOngoingEvent(event);       // true/false
getEventDurationHours(event); // number
```

---

## Common Mistakes to Avoid

### ❌ Don't do this

```typescript
// Ambiguous timezone
{ startDate: '2025-02-20T18:30:00' }

// Hardcoded user names
{ speakers: [{ name: 'Thomas' }] }

// Missing required fields
{ title: 'Event' }  // missing startDate, endDate, location

// Inconsistent datetime formats
{ startDate: '2025-02-20', endDate: '2025-02-20T21:00:00+01:00' }

// No error handling
await createGoogleCalendarEvent(event);
```

### ✅ Do this instead

```typescript
// Explicit timezone
{ startDate: '2025-02-20T18:30:00+01:00' }

// Use placeholders
{ speakers: [{ name: `${firstName} ${lastName}` }] }

// All required fields
{
  title: 'Event',
  startDate: '2025-02-20T18:30:00+01:00',
  endDate: '2025-02-20T21:00:00+01:00',
  location: DEFAULT_LOCATION
}

// Consistent formats
{
  startDate: '2025-02-20T18:30:00+01:00',
  endDate: '2025-02-20T21:00:00+01:00'
}

// Error handling
try {
  const googleEvent = await createGoogleCalendarEvent(event);
} catch (error) {
  console.error('Google Calendar sync failed:', error);
  throw error;
}
```

---

## Related Files

- **Type definitions:** `/lib/schemas/event.schema.ts`
- **Full specification:** `/docs/technical/EVENT-SCHEMA-STANDARD.md`
- **Implementation guide:** `/docs/technical/EVENT-SCHEMA-IMPLEMENTATION.md`
- **Research summary:** `/docs/technical/EVENT-SCHEMA-SUMMARY.md`

---

## Timestamps & Localization

### ISO 8601 Format

```typescript
// With timezone offset (preferred)
'2025-02-20T18:30:00+01:00'

// UTC with Z
'2025-02-20T17:30:00Z'

// With timezone name
'2025-02-20T18:30:00[Europe/Vienna]'
```

### Format for Display (German)

```typescript
const date = new Date('2025-02-20T18:30:00+01:00');

// Full date
date.toLocaleDateString('de-AT', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
// Output: "Donnerstag, 20. Februar 2025"

// Time only
date.toLocaleTimeString('de-AT', {
  hour: '2-digit',
  minute: '2-digit'
});
// Output: "18:30"
```

---

## Need More Info?

- See `EVENT-SCHEMA-STANDARD.md` for complete specification
- See `EVENT-SCHEMA-IMPLEMENTATION.md` for code examples
- See `EVENT-SCHEMA-SUMMARY.md` for research findings
- Check `/lib/schemas/event.schema.ts` for inline documentation
