# KINN API Contracts

**Purpose:** Document all API endpoints' request/response formats to ensure backward compatibility during restructuring.

**CRITICAL:** When refactoring, response formats MUST NOT CHANGE. This document defines the contract.

---

## Public Endpoints

### POST /api/signup

Email signup with double opt-in.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Check deine Inbox für den Login-Link.",
  "isReturningUser": false  // true if already subscribed
}
```

**Error Responses:**
```json
// 400 - Invalid Email
{
  "error": "Invalid email",
  "message": "Please provide a valid email address"
}

// 429 - Rate Limit
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}

// 500 - Server Error
{
  "error": "Email delivery failed",
  "message": "Die Anmeldung konnte nicht verarbeitet werden. Bitte versuche es später erneut."
}
```

**CORS Headers:**
- `Access-Control-Allow-Origin`: (request origin if whitelisted)
- `Access-Control-Allow-Methods`: POST, OPTIONS
- `Access-Control-Allow-Headers`: Content-Type
- `Access-Control-Allow-Credentials`: true

---

### GET /api/confirm

Email confirmation via token.

**Request:**
```
GET /api/confirm?token=<JWT_TOKEN>
```

**Success Response:**
- **Status:** 302 Redirect
- **Location:** `/pages/success.html?email=<EMAIL>`

**Error Response:**
- **Status:** 200 OK (displays branded error page as HTML)
- **Content-Type:** text/html
- Contains: "Link abgelaufen" or "Ungültige Anfrage"

---

### GET /api/calendar.ics

iCal feed for calendar apps.

**Request:**
```
GET /api/calendar.ics
```

**Success Response:**
- **Status:** 200 OK
- **Content-Type:** text/calendar; charset=utf-8
- **Headers:**
  - `Content-Disposition`: attachment; filename="kinn-events.ics"
  - `Cache-Control`: public, max-age=3600

**Body Format:**
```ical
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//KINN//Event Calendar//DE
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:KINN Events
X-WR-TIMEZONE:Europe/Vienna
X-WR-CALDESC:KINN KI Treff Innsbruck Events

BEGIN:VEVENT
UID:kinn-treff-12-1730123456@kinn.at
DTSTART:20250215T180000Z
DTEND:20250215T200000Z
DTSTAMP:20250101T120000Z
SUMMARY:KINN Treff #12
DESCRIPTION:...
LOCATION:...
CONFERENCE:https://meet.google.com/xyz
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT

END:VCALENDAR
```

---

### GET /api/events

Get upcoming public events.

**Request:**
```
GET /api/events
```

**Success Response (200):**
```json
{
  "success": true,
  "events": [
    {
      "id": "kinn-treff-12-1730123456",
      "type": "hybrid",
      "title": "KINN Treff #12",
      "description": "...",
      "location": "Coworking Space Innsbruck",
      "meetingLink": "https://meet.google.com/xyz",
      "maxCapacity": 30,
      "date": "2025-02-15",
      "startTime": "18:00",
      "endTime": "20:00",
      "start": "2025-02-15T18:00:00.000Z",
      "end": "2025-02-15T20:00:00.000Z",
      "status": "confirmed",
      "rsvps": {
        "yes": ["user1@example.com", ...],
        "no": [],
        "maybe": []
      },
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  ],
  "total": 3
}
```

---

### GET /api/rsvp

RSVP for an event.

**Request:**
```
GET /api/rsvp?token=<JWT>&event=<EVENT_ID>&response=<yes|no|maybe>
```

**Success Response:**
- **Status:** 302 Redirect
- **Location:** `/pages/success.html?rsvp=yes&event=kinn-12`

**Error Response (400):**
```json
{
  "error": "Invalid request",
  "message": "Missing required parameters: token, event, response"
}
```

---

### GET /api/profile

Get user preferences.

**Request:**
```
GET /api/profile?token=<JWT_TOKEN>
```

**Success Response (200):**
```json
{
  "success": true,
  "profile": {
    "email": "user@example.com",
    "identity": {
      "name": "Thomas Seiger",
      "linkedIn": "...",
      "github": "...",
      "location": "in-person"
    },
    "supply": {
      "skills": ["react", "python", "machine-learning"],
      "experience": "senior",
      "availability": "freelancer",
      "canOffer": ["mentoring", "code-review"]
    },
    "demand": {
      "seeking": ["freelance", "collaboration"],
      "activeSearch": "passive",
      "interests": "..."
    },
    "preferences": {
      "privacy": {
        "showInDirectory": true,
        "allowMatching": true
      }
    },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  },
  "matches": {
    "count": 15,
    "hints": [
      "25 andere KINN'der mit React",
      "18 KINN'der in Tirol",
      "12 Senior+ Devs im Netzwerk"
    ]
  }
}
```

---

### PUT /api/profile/update

Update basic user preferences.

**Request:**
```json
{
  "token": "<JWT_TOKEN>",
  "phone": "+43 664 123 4567",
  "whatsappReminders": true,
  "notifications": {
    "enabled": true
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Einstellungen erfolgreich gespeichert",
  "preferences": {
    "email": "user@example.com",
    "phone": "+43 664 123 4567",
    "whatsappReminders": true,
    "notifications": {
      "enabled": true
    },
    "subscribedAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### PUT /api/profile/update-extended

Update full profile with supply/demand.

**Request:**
```json
{
  "token": "<JWT_TOKEN>",
  "identity": {
    "name": "Thomas Seiger",
    "linkedIn": "https://linkedin.com/in/...",
    "location": "in-person"
  },
  "supply": {
    "skills": ["react", "typescript"],
    "experience": "senior",
    "availability": "freelancer",
    "canOffer": ["mentoring"]
  },
  "demand": {
    "seeking": ["freelance", "collaboration"],
    "activeSearch": "active",
    "interests": "AI projects"
  },
  "preferences": {
    "privacy": {
      "showInDirectory": true,
      "allowMatching": true
    }
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profil erfolgreich aktualisiert",
  "profile": { /* Full profile object */ },
  "matches": {
    "count": 18,
    "hints": [...]
  }
}
```

---

### POST /api/profile/unsubscribe

Complete unsubscribe and data deletion.

**Request:**
```json
{
  "token": "<JWT_TOKEN>"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Du wurdest erfolgreich abgemeldet. Deine Daten wurden gelöscht."
}
```

---

## Admin Endpoints

**Authentication:** All admin endpoints require Bearer token:
```
Authorization: Bearer <ADMIN_PASSWORD>
```

### GET /api/admin/events

List all events (admin view).

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "events": [{ /* Event objects */ }],
    "defaults": {
      "timezone": "Europe/Vienna",
      "organizer": "thomas@kinn.at",
      "categories": ["KI", "AI", "Networking", "Innsbruck"],
      "reminder": "24h"
    }
  }
}
```

---

### PUT /api/admin/events

Bulk update events config.

**Request:**
```json
{
  "events": [{ /* Event objects */ }],
  "defaults": { /* Config */ }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Events updated successfully",
  "data": { /* Full config */ }
}
```

---

### POST /api/events/create

Create single event.

**Request:**
```json
{
  "type": "hybrid",
  "summary": "KINN Treff #13",
  "description": "...",
  "location": "Coworking Space",
  "meetingLink": "https://meet.google.com/abc",
  "maxCapacity": 30,
  "start": "2025-03-15T18:00:00.000Z",
  "end": "2025-03-15T20:00:00.000Z",
  "status": "confirmed"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "event": { /* Created event */ },
    "stats": {
      "totalEvents": 5
    }
  }
}
```

**Error Response (400):**
```json
{
  "error": "Missing required fields",
  "message": "summary, description, start, and end are required"
}
```

---

### GET /api/admin/subscribers

Get filtered subscribers.

**Request:**
```
GET /api/admin/subscribers?event=kinn-12&filter=yes&format=text
```

**Query Params:**
- `event`: Event ID (required if filter != 'all')
- `filter`: `all` | `yes` | `no` | `maybe` | `yes_maybe` | `none`
- `format`: `json` (default) | `text` (comma-separated)

**Success Response (200 - JSON):**
```json
{
  "success": true,
  "subscribers": ["user1@example.com", "user2@example.com"],
  "count": 2,
  "filter": "yes",
  "event": "kinn-12"
}
```

**Success Response (200 - Text):**
```
user1@example.com, user2@example.com, user3@example.com
```

---

### POST /api/admin/whatsapp-template

Generate WhatsApp reminder messages.

**Request:**
```json
{
  "eventId": "kinn-12",
  "templateType": "1day",
  "rsvpFilter": "yes"
}
```

**Success Response (200):**
```json
{
  "success": true,
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

---

## Error Response Standards

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "User-friendly error message in German",
  "details": "Technical details (development only)"
}
```

### Common HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created (events) |
| 302 | Redirect | After confirmation, RSVP |
| 400 | Bad Request | Invalid input, missing fields |
| 401 | Unauthorized | Invalid/missing auth token |
| 405 | Method Not Allowed | Wrong HTTP method |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error |

---

## CORS Configuration

**Whitelisted Origins:**
- `https://kinn.at`
- `https://www.kinn.at`
- `http://localhost:8000` (development)
- `http://localhost:3000` (development)

**Allowed Methods:**
- GET, POST, PUT, DELETE, OPTIONS

**Allowed Headers:**
- Content-Type, Authorization

---

## Rate Limits

| Endpoint | Max Requests | Window | Key Prefix |
|----------|-------------|---------|------------|
| `/api/signup` | 3 | 1 minute | `ratelimit:signup` |
| `/api/admin/*` | 5 | 1 minute | `ratelimit:admin` |
| Public endpoints | 10 | 1 minute | `ratelimit:public` |

**Rate Limit Response:**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

---

## Backward Compatibility Rules

When refactoring:

1. ✅ **DO:**
   - Keep exact same response format
   - Keep same HTTP status codes
   - Keep same error messages
   - Add new optional fields (backward compatible)
   - Improve performance

2. ❌ **DON'T:**
   - Change response structure
   - Remove fields (even if unused)
   - Change status codes
   - Change error message wording
   - Break CORS headers

---

## Testing Contracts

Use this document to create integration tests:

```javascript
// tests/integration/signup.test.js
describe('POST /api/signup', () => {
  it('should return exact contract format', async () => {
    const response = await fetch('/api/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@kinn.at' })
    });

    const data = await response.json();

    // Verify contract
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('isReturningUser');
  });
});
```

---

**Last Updated:** 2025-11-05
**Version:** 1.0 (Pre-Restructuring Baseline)
