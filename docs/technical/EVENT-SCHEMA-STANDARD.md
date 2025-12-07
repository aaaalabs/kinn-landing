# KINN Event Schema Standard

**Comprehensive event data specification for KINN events**

Last Updated: 2025-12-07
Status: Active
Version: 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Standards & Compatibility](#standards--compatibility)
3. [Data Structure](#data-structure)
4. [Implementation Patterns](#implementation-patterns)
5. [API Examples](#api-examples)
6. [Structured Data Formats](#structured-data-formats)
7. [Database Schema](#database-schema)
8. [Best Practices](#best-practices)

---

## Overview

The KINN Event Schema provides a unified data structure for managing events across multiple platforms and formats:

- **Google Calendar API** integration
- **iCalendar (ICS)** file export
- **Schema.org** structured data
- **JSON-LD** for search engines
- **OpenGraph** social sharing
- **Email invitations**
- **Public API** responses

### Key Features

- **Type-safe TypeScript interfaces**
- **Flexible base types** (required fields only)
- **Complete types** (all optional fields)
- **Utility helper functions**
- **Default values** for KINN's standard events
- **Validation-ready structure**

---

## Standards & Compatibility

### 1. Schema.org Event (https://schema.org/Event)

The schema is built on Schema.org's Event type and properties:

| Field | Schema.org | Property |
|-------|-----------|----------|
| title | name | string |
| description | description | string |
| startDate | startDate | ISO 8601 DateTime |
| endDate | endDate | ISO 8601 DateTime |
| location | location | Place / PostalAddress |
| organizer | organizer | Organization / Person |
| attendees | attendee | Person[] |
| eventStatus | eventStatus | EventStatusType |
| eventAttendanceMode | eventAttendanceMode | OnlineEventAttendanceMode |
| offers | offers | Offer[] |
| image | image | ImageObject[] |

**Benefits:**
- Search engines (Google, Bing) understand events
- Rich snippets in search results
- Better SEO for event pages

### 2. iCalendar Format (RFC 5545)

Events can be exported to `.ics` format for import into any calendar app:

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//KINN//KINN KI Treff Innsbruck//DE
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
  UID:kinn-stammtisch-2025-01@kinn.at
  DTSTAMP:20250101T180000Z
  DTSTART:20250120T183000+0100
  DTEND:20250120T210000+0100
  SUMMARY:KINN KI Treff Innsbruck: Local LLMs
  DESCRIPTION:Monatlicher KI-Austausch...
  LOCATION:Die Bäckerei, Innsbruck
  ORGANIZER;CN=KINN:mailto:treff@kinn.at
  ATTENDEE;CN=Thomas:mailto:thomas@example.com
  RRULE:FREQ=MONTHLY;BYMONTHDAY=20
  BEGIN:VALARM
    ACTION:DISPLAY
    TRIGGER:-PT1D
    DESCRIPTION:KINN KI Treff Innsbruck
  END:VALARM
END:VEVENT
END:VCALENDAR
```

**Use Cases:**
- Apple Calendar import
- Outlook import
- Any calendar application
- Offline availability

### 3. Google Calendar API (v3)

Native integration format for Google Calendar:

```typescript
{
  "summary": "KINN KI Treff Innsbruck: Local LLMs",
  "description": "Monatlicher KI-Austausch...",
  "location": "Die Bäckerei, Innsbruck",
  "start": {
    "dateTime": "2025-01-20T18:30:00+01:00",
    "timeZone": "Europe/Vienna"
  },
  "end": {
    "dateTime": "2025-01-20T21:00:00+01:00",
    "timeZone": "Europe/Vienna"
  },
  "attendees": [
    { "email": "thomas@example.com" }
  ],
  "recurrence": ["RRULE:FREQ=MONTHLY;BYMONTHDAY=20"],
  "reminders": {
    "useDefault": false,
    "overrides": [
      { "method": "email", "minutes": 1440 },
      { "method": "popup", "minutes": 60 }
    ]
  }
}
```

### 4. JSON-LD for Search Engines

Embedded in HTML `<script type="application/ld+json">`:

```json
{
  "@context": "https://schema.org/",
  "@type": "Event",
  "name": "KINN KI Treff Innsbruck: Local LLMs",
  "description": "Monatlicher KI-Austausch in Innsbruck",
  "startDate": "2025-01-20T18:30:00+01:00",
  "endDate": "2025-01-20T21:00:00+01:00",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "eventStatus": "https://schema.org/EventScheduled",
  "location": {
    "@type": "Place",
    "name": "Die Bäckerei",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Dreiheiligenstraße 21a",
      "addressLocality": "Innsbruck",
      "postalCode": "6020",
      "addressCountry": "AT"
    }
  },
  "organizer": {
    "@type": "Organization",
    "name": "KINN",
    "url": "https://kinn.at"
  },
  "performer": [
    {
      "@type": "Person",
      "name": "Thomas Speaker",
      "url": "https://thomas.example.com"
    }
  ],
  "offers": {
    "@type": "Offer",
    "url": "https://kinn.at/register",
    "price": "0",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock"
  }
}
```

### 5. OpenGraph Metadata

For social sharing (Twitter, Facebook, LinkedIn):

```html
<meta property="og:type" content="event" />
<meta property="og:title" content="KINN KI Treff Innsbruck: Local LLMs" />
<meta property="og:description" content="Monatlicher KI-Austausch in Innsbruck" />
<meta property="og:image" content="https://kinn.at/event-banner.jpg" />
<meta property="og:url" content="https://kinn.at/events/stammtisch-jan-2025" />
<meta property="og:start_time" content="2025-01-20T18:30:00+01:00" />
<meta property="og:end_time" content="2025-01-20T21:00:00+01:00" />
<meta property="og:location" content="Die Bäckerei, Innsbruck" />
```

---

## Data Structure

### 1. Core Types

#### Address (Physical Location)

```typescript
interface Address {
  streetAddress: string;      // "Dreiheiligenstraße 21a"
  addressLocality: string;    // "Innsbruck"
  postalCode: string;         // "6020"
  addressCountry: string;     // "AT" (ISO 3166-1)
  addressRegion?: string;     // "Tyrol"
  name?: string;              // "Die Bäckerei" (display name)
  latitude?: number;          // 47.2652
  longitude?: number;         // 11.3945
  url?: string;               // directions/maps link
}
```

**Example:**
```typescript
const location: Address = {
  name: 'Die Bäckerei',
  streetAddress: 'Dreiheiligenstraße 21a',
  addressLocality: 'Innsbruck',
  postalCode: '6020',
  addressCountry: 'AT',
  addressRegion: 'Tyrol',
  latitude: 47.2652,
  longitude: 11.3945,
  url: 'https://maps.google.com/?q=47.2652,11.3945'
};
```

#### Speaker/Presenter

```typescript
interface Speaker {
  name: string;               // Full name (required)
  email?: string;             // Contact email
  title?: string;             // "AI Engineer", "Researcher"
  organization?: string;      // Company/organization
  bio?: string;               // Biography (markdown)
  avatarUrl?: string;         // Profile picture
  links?: {
    website?: string;
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}
```

#### Attendee

```typescript
interface Attendee {
  email: string;              // Email (required for calendar)
  name?: string;              // Display name
  responseStatus?: 'needsAction' | 'accepted' | 'tentative' | 'declined';
  optional?: boolean;         // Is attendance optional?
  organizer?: boolean;        // Is organizer/host?
  avatarUrl?: string;         // Profile picture
  role?: string;              // "Speaker", "Host", "Volunteer"
}
```

#### Offer (Ticketing/Pricing)

```typescript
interface Offer {
  name: string;               // "Early Bird", "General Admission"
  price: number;              // 0 for free events
  priceCurrency: string;      // "EUR"
  availability?: 'InStock' | 'OutOfStock';
  inventoryLevel?: number;    // Remaining tickets
  url?: string;               // Purchase URL
  validFrom?: DateTime;       // When available
  validUntil?: DateTime;      // When expires
}
```

### 2. Event Enums

#### EventStatus
```typescript
enum EventStatus {
  SCHEDULED = 'scheduled',      // Normal state
  CANCELLED = 'cancelled',      // Event cancelled
  RESCHEDULED = 'rescheduled',  // Date/time changed
  POSTPONED = 'postponed',      // Temporary postponement
  CONFIRMED = 'confirmed'       // Definitely happening
}
```

#### EventAttendanceMode
```typescript
enum EventAttendanceMode {
  ONLINE = 'online',            // Virtual only
  OFFLINE = 'offline',          // In-person only
  MIXED = 'mixed'               // Hybrid (both options)
}
```

#### EventFormat
```typescript
enum EventFormat {
  MEETUP = 'meetup',            // Casual gathering
  WORKSHOP = 'workshop',        // Hands-on learning
  CONFERENCE = 'conference',    // Large formal event
  PANEL = 'panel',              // Panel discussion
  NETWORKING = 'networking',    // Networking event
  LECTURE = 'lecture',          // Presentation
  HACKATHON = 'hackathon',      // Coding event
  TOUR = 'tour',                // Guided tour
  SOCIAL = 'social',            // Social gathering
  ONLINE_WEBINAR = 'online-webinar'  // Virtual presentation
}
```

#### SkillLevel
```typescript
enum SkillLevel {
  BEGINNER = 'beginner',        // No prior knowledge
  INTERMEDIATE = 'intermediate', // Some experience
  ADVANCED = 'advanced',        // Significant experience
  EXPERT = 'expert',            // Deep expertise
  MIXED = 'mixed'               // Various levels welcome
}
```

### 3. AI-Specific Metadata

For AI/tech events, add technology-specific details:

```typescript
interface AISpecificMetadata {
  topics: string[];             // ["Local LLMs", "RAG", "Embedding"]
  technologies?: string[];      // ["Llama 2", "Mistral", "GPT-4"]
  learningOutcomes?: string[]; // ["Understand LLM basics", "Deploy locally"]
  prerequisites?: string[];     // ["Python basics", "ML familiarity"]
  skillLevel?: SkillLevel;       // INTERMEDIATE
  resourceLinks?: {
    title: string;
    url: string;
    type?: 'github' | 'colab' | 'documentation';
  }[];
  slidesUrl?: string;            // Where slides available
  recordingUrl?: string;         // After event recording
}
```

### 4. Complete Event Structure

The `CompleteKINNEvent` interface includes:

```
Event Core
├── Identity (id, uuid, slug)
├── Content (title, description, images)
├── Timing (startDate, endDate, timezone, recurrence)
└── Location (address, virtual info)

Attendance
├── Organizer & Co-organizers
├── Speakers & Presenters
├── Attendees list
├── Capacity & Registration
└── Format & Attendance Mode

Content Details
├── Full description (Markdown)
├── Learning outcomes
├── Skill level & Prerequisites
├── AI-specific metadata
└── Resource links

Organization
├── Sponsors
├── Partners
├── Offers/Pricing
└── Tags & Categories

Communication
├── Email reminders
├── Notification preferences
├── Confirmation templates
└── Cancellation handling

Social & Discovery
├── Social media metadata
├── Hashtags
├── OpenGraph data
└── External event URLs

Administration
├── Creation & update timestamps
├── Creator information
├── Publishing status
├── Privacy settings
└── Analytics tracking
```

---

## Implementation Patterns

### 1. Creating a Minimal Event

```typescript
import {
  EventCreateInput,
  EventAttendanceMode,
  EventFormat,
  DEFAULT_LOCATION,
  DEFAULT_ORGANIZER
} from '@/lib/schemas/event.schema';

const stammtisch: EventCreateInput = {
  title: 'KINN KI Treff Innsbruck: Prompt Engineering',
  description: 'Monatlicher KI-Austausch in Innsbruck',
  startDate: '2025-02-20T18:30:00+01:00',
  endDate: '2025-02-20T21:00:00+01:00',
  location: DEFAULT_LOCATION,
  format: EventFormat.MEETUP,
  attendanceMode: EventAttendanceMode.OFFLINE,
  topic: 'Prompt Engineering Best Practices'
};
```

### 2. Creating a Complete Event

```typescript
import {
  CompleteKINNEvent,
  EventStatus,
  EventAttendanceMode,
  EventFormat,
  SkillLevel,
  Speaker,
  Sponsor,
  DEFAULT_LOCATION,
  DEFAULT_ORGANIZER,
  DEFAULT_REMINDERS,
  EventMetadata
} from '@/lib/schemas/event.schema';

const event: CompleteKINNEvent = {
  // Identity
  id: 'kinn-stammtisch-2025-02',
  url: '/events/stammtisch-feb-2025',

  // Core Content
  title: 'KINN KI Treff Innsbruck: Prompt Engineering',
  description: 'Monatlicher KI-Austausch in Innsbruck. Diese Woche: Prompt Engineering Best Practices.',
  fullDescription: `# Prompt Engineering Masterclass\n\n...markdown content...`,

  // Timing
  startDate: '2025-02-20T18:30:00+01:00',
  endDate: '2025-02-20T21:00:00+01:00',
  timezone: 'Europe/Vienna',

  // Location
  location: DEFAULT_LOCATION,
  format: EventFormat.MEETUP,
  attendanceMode: EventAttendanceMode.OFFLINE,

  // Content
  aiMetadata: {
    topics: ['Prompt Engineering', 'LLMs', 'ChatGPT'],
    technologies: ['ChatGPT', 'Claude', 'Gemini'],
    learningOutcomes: [
      'Master advanced prompting techniques',
      'Learn few-shot and chain-of-thought',
      'Understand model behavior'
    ],
    skillLevel: SkillLevel.INTERMEDIATE,
    prerequisites: ['Basic familiarity with LLMs']
  },

  // Speakers
  speakers: [
    {
      name: 'Thomas Speaker',
      email: 'thomas@example.com',
      title: 'AI Engineer',
      organization: 'TechCorp',
      bio: 'Expert in prompt engineering...',
      links: { linkedin: 'https://linkedin.com/in/thomas' }
    }
  ],

  // Registration
  registrationRequired: true,
  registration: {
    required: true,
    url: 'https://kinn.at/register',
    deadline: '2025-02-19T18:30:00+01:00',
    capacity: { maximum: 50, current: 35 }
  },

  // Attendees
  attendees: [],

  // Offers
  isFree: true,
  offers: [
    {
      name: 'Free Admission',
      price: 0,
      priceCurrency: 'EUR',
      availability: 'InStock'
    }
  ],

  // Organizer
  organizer: DEFAULT_ORGANIZER,

  // Communication
  reminders: DEFAULT_REMINDERS,

  // Social
  social: {
    hashtags: ['KINN', 'AI', 'PromptEngineering', 'Innsbruck'],
    twitterHandle: '@KINNat',
    ogImage: 'https://kinn.at/events/prompt-engineering.jpg'
  },

  // Status
  status: EventStatus.SCHEDULED,
  published: true,

  // Admin metadata
  metadata: {
    id: 'kinn-stammtisch-2025-02',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    createdBy: 'admin@kinn.at',
    creatorEmail: 'admin@kinn.at',
    tags: ['stammtisch', 'monthly', 'ai', 'prompt-engineering'],
    privacy: 'public',
    publishedAt: '2025-01-15T10:00:00Z',
    externalIds: {
      googleCalendarEventId: 'abc123...'
    }
  }
};
```

### 3. Updating an Event

```typescript
import { EventUpdateInput } from '@/lib/schemas/event.schema';

const updates: EventUpdateInput = {
  status: EventStatus.RESCHEDULED,
  previousStartDate: '2025-02-20T18:30:00+01:00',
  startDate: '2025-02-27T18:30:00+01:00',
  endDate: '2025-02-27T21:00:00+01:00',
  cancellationReason: 'Room booking conflict'
};
```

### 4. Working with Helper Functions

```typescript
import {
  formatEventDate,
  formatEventTime,
  formatAddress,
  isUpcomingEvent,
  getEventDurationHours
} from '@/lib/schemas/event.schema';

// Format for display
const dateString = formatEventDate(event);              // "Donnerstag, 20. Februar 2025"
const timeString = formatEventTime(event);              // "18:30 - 21:00"
const addressString = formatAddress(event.location);    // "Dreiheiligenstraße 21a, 6020 Innsbruck"

// Status checks
if (isUpcomingEvent(event)) {
  console.log('Event is in the future');
}

// Calculate duration
const hours = getEventDurationHours(event);  // 2.5
```

---

## API Examples

### 1. Get Event

**Request:**
```bash
GET /api/events/kinn-stammtisch-2025-02
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "kinn-stammtisch-2025-02",
    "title": "KINN KI Treff Innsbruck: Prompt Engineering",
    "startDate": "2025-02-20T18:30:00+01:00",
    "endDate": "2025-02-20T21:00:00+01:00",
    ...
  }
}
```

### 2. List Upcoming Events

**Request:**
```bash
GET /api/events?upcoming=true&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "...", "title": "..." },
    { "id": "...", "title": "..." }
  ],
  "count": 2,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "hasMore": false
  }
}
```

### 3. Create Event

**Request:**
```bash
POST /api/events
Content-Type: application/json

{
  "title": "KINN KI Treff Innsbruck: Prompt Engineering",
  "description": "Monatlicher KI-Austausch...",
  "startDate": "2025-02-20T18:30:00+01:00",
  "endDate": "2025-02-20T21:00:00+01:00",
  "location": {
    "streetAddress": "Dreiheiligenstraße 21a",
    "addressLocality": "Innsbruck",
    "postalCode": "6020",
    "addressCountry": "AT"
  },
  "topic": "Prompt Engineering",
  "registrationRequired": true,
  "registrationUrl": "https://kinn.at/register"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "kinn-stammtisch-2025-02",
    "title": "KINN KI Treff Innsbruck: Prompt Engineering",
    ...
  }
}
```

### 4. Export as ICS

**Request:**
```bash
GET /api/events/kinn-stammtisch-2025-02/download.ics
```

**Response:**
```
Content-Type: text/calendar
Content-Disposition: attachment; filename="kinn-stammtisch-2025-02.ics"

BEGIN:VCALENDAR
VERSION:2.0
...
END:VCALENDAR
```

### 5. Structured Data (JSON-LD)

**Request:**
```bash
GET /api/events/kinn-stammtisch-2025-02/schema
```

**Response:**
```json
{
  "@context": "https://schema.org/",
  "@type": "Event",
  "name": "KINN KI Treff Innsbruck: Prompt Engineering",
  ...
}
```

---

## Structured Data Formats

### Converting to Google Calendar API Format

```typescript
function toGoogleCalendarFormat(event: CompleteKINNEvent): any {
  return {
    summary: event.title,
    description: event.fullDescription || event.description,
    location: formatAddress(event.location),
    start: {
      dateTime: new Date(event.startDate).toISOString(),
      timeZone: event.timezone
    },
    end: {
      dateTime: new Date(event.endDate).toISOString(),
      timeZone: event.timezone
    },
    attendees: event.attendees.map(a => ({ email: a.email })),
    reminders: {
      useDefault: false,
      overrides: event.reminders.map(r => ({
        method: r.method,
        minutes: r.minutes
      }))
    },
    recurrence: event.recurrenceRule ? [event.recurrenceRule] : undefined,
    conferenceData: event.conferenceData ? {
      conferenceType: event.conferenceData.conferenceType,
      entryPoints: event.conferenceData.entryPoints
    } : undefined
  };
}
```

### Converting to JSON-LD

```typescript
function toJsonLd(event: CompleteKINNEvent): any {
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
    offers: event.offers?.map(o => ({
      '@type': 'Offer',
      url: o.url,
      price: o.price,
      priceCurrency: o.priceCurrency,
      availability: `https://schema.org/${o.availability || 'InStock'}`
    }))
  };
}
```

### Converting to ICS (iCalendar)

```typescript
function toICS(event: CompleteKINNEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KINN//KINN KI Treff Innsbruck//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${event.id}@kinn.at`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;TZID=${event.timezone}:${new Date(event.startDate).toISOString().replace(/[-:]/g, '').split('.')[0]}`,
    `DTEND;TZID=${event.timezone}:${new Date(event.endDate).toISOString().replace(/[-:]/g, '').split('.')[0]}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description}`,
    `LOCATION:${formatAddress(event.location)}`,
    `ORGANIZER;CN=${event.organizer.name}:mailto:${event.organizer.email}`,
    ...event.attendees.map(a => `ATTENDEE;CN=${a.name}:mailto:${a.email}`),
    ...event.reminders.map(r => `\nBEGIN:VALARM\nACTION:DISPLAY\nTRIGGER:-PT${r.minutes}M\nDESCRIPTION:${event.title}\nEND:VALARM`),
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return lines.join('\r\n');
}
```

---

## Database Schema

### Recommended MongoDB Structure

```typescript
// events collection
db.events.insertOne({
  _id: ObjectId(),

  // Identity
  id: 'kinn-stammtisch-2025-02',
  uuid: 'uuid-v4-here',
  slug: 'stammtisch-feb-2025',

  // Content
  title: 'KINN KI Treff Innsbruck: Prompt Engineering',
  description: 'Short description...',
  fullDescription: 'Full markdown content...',

  // Timing
  startDate: ISODate('2025-02-20T18:30:00+01:00'),
  endDate: ISODate('2025-02-20T21:00:00+01:00'),
  timezone: 'Europe/Vienna',
  recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=20',
  previousStartDate: ISODate('2025-01-20T18:30:00+01:00'),

  // Location
  location: {
    name: 'Die Bäckerei',
    streetAddress: 'Dreiheiligenstraße 21a',
    addressLocality: 'Innsbruck',
    postalCode: '6020',
    addressCountry: 'AT',
    addressRegion: 'Tyrol',
    latitude: 47.2652,
    longitude: 11.3945,
    url: 'https://maps.google.com/?q=47.2652,11.3945'
  },

  // Event Details
  format: 'meetup',
  attendanceMode: 'offline',
  status: 'scheduled',

  // Content
  aiMetadata: {
    topics: ['Prompt Engineering', 'LLMs'],
    technologies: ['ChatGPT', 'Claude'],
    skillLevel: 'intermediate',
    learningOutcomes: ['...'],
    resourceLinks: [{ title: '...', url: '...' }]
  },

  // Speakers
  speakers: [
    {
      name: 'Thomas Speaker',
      email: 'thomas@example.com',
      title: 'AI Engineer',
      organization: 'TechCorp',
      avatarUrl: 'https://...'
    }
  ],

  // Attendance
  attendees: [
    {
      email: 'user@example.com',
      name: 'John Doe',
      responseStatus: 'accepted'
    }
  ],

  // Registration
  registrationRequired: true,
  registration: {
    required: true,
    url: 'https://kinn.at/register',
    deadline: ISODate('2025-02-19T18:30:00+01:00'),
    capacity: { maximum: 50, current: 35 }
  },

  // Offers
  isFree: true,
  offers: [
    {
      name: 'Free Admission',
      price: 0,
      priceCurrency: 'EUR'
    }
  ],

  // Organization
  organizer: {
    name: 'KINN',
    email: 'treff@kinn.at',
    url: 'https://kinn.at'
  },

  sponsors: [...],
  partners: [...],

  // Images/Media
  image: {
    url: 'https://...',
    width: 1200,
    height: 630
  },
  media: [...],

  // Communication
  reminders: [
    { method: 'email', minutes: 1440 },
    { method: 'popup', minutes: 60 }
  ],

  // Social
  social: {
    hashtags: ['KINN', 'AI'],
    ogImage: 'https://...'
  },

  // Admin
  createdAt: ISODate('2025-01-15T10:00:00Z'),
  updatedAt: ISODate('2025-01-15T10:00:00Z'),
  createdBy: 'admin@kinn.at',
  tags: ['stammtisch', 'monthly'],
  privacy: 'public',
  published: true,
  publishedAt: ISODate('2025-01-15T10:00:00Z'),

  // External IDs
  externalIds: {
    googleCalendarEventId: 'abc123...',
    eventbriteId: null,
    meetupId: null
  },

  // Analytics
  analytics: {
    views: 42,
    clicks: 15,
    registrations: 35
  }
});

// Create indexes
db.events.createIndex({ slug: 1 }, { unique: true });
db.events.createIndex({ startDate: 1 });
db.events.createIndex({ status: 1 });
db.events.createIndex({ published: 1 });
db.events.createIndex({ 'aiMetadata.topics': 1 });
db.events.createIndex({ createdAt: 1 });
```

### Recommended PostgreSQL Structure

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kinn_id VARCHAR(255) UNIQUE NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,

  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT,
  full_description TEXT,

  -- Timing
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Europe/Vienna',
  recurrence_rule VARCHAR(255),
  previous_start_date TIMESTAMP WITH TIME ZONE,

  -- Location
  location_name VARCHAR(255),
  location_street_address VARCHAR(255),
  location_locality VARCHAR(100),
  location_postal_code VARCHAR(20),
  location_country VARCHAR(2),
  location_region VARCHAR(100),
  location_latitude DECIMAL(10,8),
  location_longitude DECIMAL(11,8),

  -- Event Details
  format VARCHAR(50),
  attendance_mode VARCHAR(50),
  status VARCHAR(50) DEFAULT 'scheduled',
  is_free BOOLEAN DEFAULT true,

  -- Attendance
  registration_required BOOLEAN DEFAULT false,
  registration_url VARCHAR(255),
  registration_deadline TIMESTAMP WITH TIME ZONE,
  max_attendees INTEGER,
  current_attendees INTEGER,

  -- Organization
  organizer_name VARCHAR(255),
  organizer_email VARCHAR(255),
  organizer_url VARCHAR(255),

  -- Admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  tags TEXT[],
  privacy VARCHAR(50) DEFAULT 'public',
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,

  -- External IDs
  google_calendar_event_id VARCHAR(255),
  eventbrite_id VARCHAR(255),
  meetup_id VARCHAR(255),

  -- Metadata (JSON)
  ai_metadata JSONB,
  speakers JSONB[],
  attendees JSONB[],
  offers JSONB[],
  reminders JSONB[],
  social JSONB,
  image JSONB,
  media JSONB[],
  analytics JSONB
);

CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_published ON events(published);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_ai_topics ON events USING GIN(ai_metadata);
```

---

## Best Practices

### 1. Always Include Timezone

```typescript
// Good: Clear timezone
{ startDate: '2025-02-20T18:30:00+01:00' }

// Also good: With timezone field
{
  startDate: '2025-02-20T18:30:00',
  timezone: 'Europe/Vienna'
}

// Avoid: Ambiguous
{ startDate: '2025-02-20T18:30:00' }
```

### 2. Validate Data Before Saving

```typescript
// Use Zod, Joi, or similar for validation
import { z } from 'zod';

const EventSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(10),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  location: AddressSchema,
});

const validatedEvent = EventSchema.parse(eventData);
```

### 3. Use Defaults for Standard Events

```typescript
// KINN Stammtisch template
function createStammtisch(
  topic: string,
  date: Date,
  speakers?: Speaker[]
): EventCreateInput {
  return {
    title: `KINN KI Treff Innsbruck: ${topic}`,
    description: 'Monatlicher KI-Austausch in Innsbruck',
    startDate: date,
    endDate: new Date(date.getTime() + 2.5 * 60 * 60 * 1000),
    location: DEFAULT_LOCATION,
    format: EventFormat.MEETUP,
    attendanceMode: EventAttendanceMode.OFFLINE,
    topic,
    speakers,
    registrationRequired: false
  };
}
```

### 4. Maintain Consistency Across Platforms

```typescript
// Sync across multiple platforms
async function createEventEverywhereOld(event: EventCreateInput) {
  // Store in database
  const saved = await db.events.create(event);

  // Create Google Calendar event
  const calEvent = toGoogleCalendarFormat(saved);
  const googleEvent = await google.calendar.events.insert(calEvent);

  // Update with Google ID
  await db.events.update(saved.id, {
    externalIds: {
      googleCalendarEventId: googleEvent.id
    }
  });

  // Generate ICS for attachment
  const icsContent = toICS(saved);

  // Send invitations
  await sendEventInvitations(saved, icsContent);
}
```

### 5. Handle Recurring Events

```typescript
// RRULE for monthly on 20th
const stammtischRule = 'FREQ=MONTHLY;BYMONTHDAY=20;UNTIL=20251231';

// RRULE for weekly on Thursday
const workshopRule = 'FREQ=WEEKLY;BYDAY=TH;COUNT=10';

// Store in event
event.recurrenceRule = stammtischRule;

// Use when creating Google Calendar events
const calEvent = toGoogleCalendarFormat(event);
calEvent.recurrence = [event.recurrenceRule];
```

### 6. Track External Event URLs

```typescript
// Store links to external services
metadata.externalIds = {
  googleCalendarEventId: 'calendar.google.com/...',
  eventbriteUrl: 'eventbrite.com/e/...',
  meetupUrl: 'meetup.com/en-US/events/...',
  linkedinEventUrl: 'linkedin.com/events/...',
  facebookEventUrl: 'facebook.com/events/...'
};
```

### 7. Use Type-Safe Operations

```typescript
// Bad: String concatenation
const address = event.location.streetAddress + ', ' +
                event.location.postalCode + ' ' +
                event.location.addressLocality;

// Good: Use helper function
import { formatAddress } from '@/lib/schemas/event.schema';
const address = formatAddress(event.location);

// Good: Type-safe
const { streetAddress, postalCode, addressLocality } = event.location;
const address = `${streetAddress}, ${postalCode} ${addressLocality}`;
```

### 8. Handle Cancellations Properly

```typescript
// When cancelling, preserve original details
const cancelledEvent: EventUpdateInput = {
  status: EventStatus.CANCELLED,
  cancellationReason: 'Venue booking conflict. We apologize for the short notice.',
  published: false  // Remove from public listings
};

// Notify attendees
await sendCancellationNotice(event, cancelledEvent.cancellationReason);

// Update Google Calendar
await updateGoogleCalendarEvent(event, {
  status: 'cancelled',
  description: `CANCELLED: ${cancelledEvent.cancellationReason}`
});
```

### 9. Privacy and Data Protection

```typescript
// Public events
const publicEvent: PublicEvent = {
  id: event.id,
  title: event.title,
  description: event.description,
  startDate: event.startDate,
  location: event.location,
  speakers: event.speakers,  // Redacted bio if needed
  organizer: event.organizer
  // No internal notes, no attendee emails, etc.
};

// Admin events (includes sensitive data)
const adminEvent: AdminEvent = event;  // Full event with everything
```

### 10. Performance Optimization

```typescript
// Paginate when listing events
const page = 1;
const limit = 20;
const events = await db.events
  .find({ published: true, status: 'scheduled' })
  .sort({ startDate: 1 })
  .skip((page - 1) * limit)
  .limit(limit);

// Create indexes for common queries
db.events.createIndex({ startDate: 1 });
db.events.createIndex({ published: 1 });
db.events.createIndex({ 'aiMetadata.topics': 1 });

// Cache computed values
const eventDuration = getEventDurationHours(event);  // Calculate once, reuse
```

---

## Migration Guide

### From Legacy Event Format

If you have existing events in a different format:

```typescript
function migrateEventFromLegacy(legacyEvent: any): CompleteKINNEvent {
  return {
    id: legacyEvent.eventId || generateId(),
    title: legacyEvent.title,
    description: legacyEvent.shortDesc || legacyEvent.title,
    fullDescription: legacyEvent.description,
    startDate: new Date(legacyEvent.dateTime).toISOString(),
    endDate: new Date(legacyEvent.dateTime).getTime() + (2.5 * 60 * 60 * 1000),
    timezone: 'Europe/Vienna',
    location: {
      name: legacyEvent.venueName || 'Die Bäckerei',
      streetAddress: legacyEvent.address?.street || 'Dreiheiligenstraße 21a',
      addressLocality: legacyEvent.address?.city || 'Innsbruck',
      postalCode: legacyEvent.address?.zip || '6020',
      addressCountry: 'AT'
    },
    format: EventFormat.MEETUP,
    attendanceMode: EventAttendanceMode.OFFLINE,
    organizer: DEFAULT_ORGANIZER,
    speakers: legacyEvent.speakers?.map(s => ({
      name: s.name,
      email: s.email,
      title: s.role
    })) || [],
    attendees: [],
    isFree: true,
    registrationRequired: legacyEvent.requiresRsvp || false,
    reminders: DEFAULT_REMINDERS,
    metadata: {
      id: legacyEvent.eventId || generateId(),
      createdAt: legacyEvent.createdAt || new Date().toISOString(),
      updatedAt: legacyEvent.updatedAt || new Date().toISOString(),
      privacy: 'public',
      published: true
    },
    status: EventStatus.SCHEDULED,
    published: true,
    social: {
      hashtags: ['KINN', 'AI']
    }
  };
}
```

---

## Conclusion

This comprehensive event schema provides:

✅ **Standards Compliance** - Schema.org, Google Calendar, iCalendar
✅ **Type Safety** - Full TypeScript support
✅ **Flexibility** - From minimal to complete events
✅ **Reusability** - Helpers and defaults for common patterns
✅ **Integration** - Easy conversion to multiple formats
✅ **Scalability** - Database-agnostic structure
✅ **Best Practices** - Following industry standards

For questions or updates, refer to this document and the TypeScript types in `/lib/schemas/event.schema.ts`.
