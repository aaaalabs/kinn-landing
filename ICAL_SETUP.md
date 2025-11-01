# KINN iCal Calendar Feed Documentation

## Overview

KINN uses the universal **iCal (ICS)** format to provide a subscribable calendar feed for KI Treff Innsbruck events. Users can subscribe to `webcal://kinn.at/api/calendar.ics` and receive automatic updates in any calendar application.

## Why iCal Instead of OAuth?

**Privacy & Trust:**
- iCal requires NO permissions or access to user calendars
- OAuth scope `calendar.events` would allow reading/editing ALL user events
- Users retain full control over their calendar data

**Universal Compatibility:**
- Works with Google Calendar, Apple Calendar, Outlook, and all major calendar apps
- No vendor lock-in
- No authentication flow required

**Simplicity:**
- No OAuth tokens to manage, refresh, or encrypt
- No Google Cloud Console configuration
- Single endpoint: `/api/calendar.ics`
- ~2200 lines of code removed vs. OAuth implementation

**Maximum Value:**
- Balance between flexibility (events can change location) and reliability (automatic updates)
- Users subscribe once, receive updates automatically
- Event changes reflected within 1 hour (cache TTL)

## Architecture

### Core Components

1. **Redis Event Configuration**
   - Key: `events:config`
   - Stores event array and default settings
   - Dynamic - no code changes needed for new events

2. **iCal Feed Endpoint**
   - `/api/calendar.ics`
   - Generates RFC 5545 compliant ICS file
   - Cache-Control: 1 hour
   - Content-Type: `text/calendar; charset=utf-8`

3. **User Subscription**
   - Protocol: `webcal://kinn.at/api/calendar.ics`
   - Updates automatically based on refresh interval
   - Works across all devices once subscribed

### Data Flow

```
Redis (events:config)
  ↓
calendar.ics.js (generates ICS)
  ↓
User's Calendar App (1 hour refresh)
  ↓
Automatic event updates
```

## Event Configuration Structure

### Redis Key: `events:config`

```json
{
  "events": [
    {
      "id": "kinn-2025-02",
      "title": "KINN - KI Treff Innsbruck",
      "date": "2025-02-06",
      "startTime": "18:00",
      "endTime": "20:00",
      "location": "Coworkingspace Innsbruck, Musterstraße 42",
      "description": "Monatlicher KI-Austausch in Innsbruck. Netzwerken, Diskutieren, Lernen.",
      "url": "https://kinn.at",
      "status": "confirmed"
    },
    {
      "id": "kinn-2025-03",
      "title": "KINN - KI Treff Innsbruck",
      "date": "2025-03-06",
      "startTime": "18:00",
      "endTime": "20:00",
      "location": "Café Central, Altstadt",
      "description": "Monatlicher KI-Austausch - diesmal im Café Central!",
      "url": "https://kinn.at",
      "status": "tentative"
    }
  ],
  "defaults": {
    "timezone": "Europe/Vienna",
    "organizer": "thomas@kinn.at",
    "categories": ["KI", "AI", "Networking", "Innsbruck"],
    "reminder": "24h"
  }
}
```

### Event Object Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `id` | Yes | Unique event identifier | `"kinn-2025-02"` |
| `title` | Yes | Event summary | `"KINN - KI Treff Innsbruck"` |
| `date` | Yes | Event date (ISO 8601) | `"2025-02-06"` |
| `startTime` | Yes | Start time (24h format) | `"18:00"` |
| `endTime` | Yes | End time (24h format) | `"20:00"` |
| `location` | Yes | Event location | `"Coworkingspace Innsbruck"` |
| `description` | Yes | Event description | `"Monatlicher KI-Austausch..."` |
| `url` | No | Event website | `"https://kinn.at"` |
| `status` | No | Event status | `"confirmed"` or `"tentative"` |

**Alternative Date Format:**
```json
{
  "start": "2025-02-06T18:00:00",
  "end": "2025-02-06T20:00:00"
}
```

### Default Configuration

| Field | Description | Default Value |
|-------|-------------|---------------|
| `timezone` | IANA timezone identifier | `"Europe/Vienna"` |
| `organizer` | Organizer email | `"thomas@kinn.at"` |
| `categories` | Event categories | `["KI", "AI", "Networking", "Innsbruck"]` |
| `reminder` | Reminder time (not yet implemented) | `"24h"` |

## Managing Events

### Current Method: Direct Redis Access

Until an admin interface is built, events must be updated directly in Upstash Redis:

1. Go to Upstash Console: https://console.upstash.com
2. Select KINN Redis database
3. Navigate to Data Browser
4. Find key: `events:config`
5. Edit JSON directly

**Important:** Validate JSON before saving to avoid breaking the feed.

### Future: Admin Interface

Planned features:
- Web UI for event management
- Add/edit/delete events
- Preview generated iCal
- Validation and error checking

### Newsletter Integration Workflow

When adding a new event:
1. Update `events:config` in Redis (at least 1 week before event if location changes)
2. iCal feed updates automatically
3. Send newsletter via Resend API with:
   - Next event details
   - Location information (especially if changed)
   - Interesting AI topics
4. All subscribed calendars refresh within 1 hour

## User Subscription Instructions

### Subscription URL

**Protocol:** `webcal://kinn.at/api/calendar.ics`
**Alternative:** `https://kinn.at/api/calendar.ics`

### Google Calendar

1. Open Google Calendar
2. Click "+" next to "Other calendars"
3. Select "From URL"
4. Paste: `https://kinn.at/api/calendar.ics`
5. Click "Add calendar"

### Apple Calendar (macOS/iOS)

1. Open Calendar app
2. File → New Calendar Subscription (macOS) or Settings → Accounts → Add Account → Other → Add Subscribed Calendar (iOS)
3. Paste: `webcal://kinn.at/api/calendar.ics`
4. Click Subscribe
5. Set refresh frequency (recommended: hourly)

### Outlook

1. Open Outlook Calendar
2. Add Calendar → From Internet
3. Paste: `https://kinn.at/api/calendar.ics`
4. Click OK

### Other Calendar Apps

Most calendar applications support iCal subscriptions via "Add Calendar by URL" or similar options.

## Technical Details

### iCal Format (RFC 5545)

Generated ICS file structure:

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//KINN//KI Treff Innsbruck//DE
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:KINN - KI Treff Innsbruck
X-WR-CALDESC:Monatlicher KI-Austausch in Innsbruck
X-WR-TIMEZONE:Europe/Vienna
REFRESH-INTERVAL;VALUE=DURATION:PT1H

BEGIN:VEVENT
UID:kinn-2025-02@kinn.at
DTSTAMP:20250101T120000
DTSTART;TZID=Europe/Vienna:20250206T180000
DTEND;TZID=Europe/Vienna:20250206T200000
SUMMARY:KINN - KI Treff Innsbruck
DESCRIPTION:Monatlicher KI-Austausch...
LOCATION:Coworkingspace Innsbruck
URL:https://kinn.at
ORGANIZER;CN=KINN:mailto:thomas@kinn.at
CATEGORIES:KI,AI,Networking,Innsbruck
STATUS:CONFIRMED
SEQUENCE:0

BEGIN:VALARM
TRIGGER:-PT24H
ACTION:DISPLAY
DESCRIPTION:KINN Event morgen um 18:00 Uhr
END:VALARM

END:VEVENT

END:VCALENDAR
```

### Key iCal Components

- **VCALENDAR:** Calendar container
- **VEVENT:** Individual event
- **UID:** Unique identifier (format: `{event.id}@kinn.at`)
- **DTSTAMP:** Calendar generation timestamp
- **DTSTART/DTEND:** Event start/end with timezone
- **VALARM:** 24-hour reminder
- **REFRESH-INTERVAL:** Suggests hourly refresh to clients

### Caching

**HTTP Headers:**
```http
Content-Type: text/calendar; charset=utf-8
Content-Disposition: inline; filename=kinn-events.ics
Cache-Control: public, max-age=3600
```

- CDN/browser cache: 1 hour
- User calendar apps typically refresh: 1-24 hours (app-dependent)
- Changes propagate: Within 1 hour to most users

### Character Escaping

Special characters in text fields (SUMMARY, DESCRIPTION, LOCATION) are escaped:
- Backslash: `\` → `\\`
- Semicolon: `;` → `\;`
- Comma: `,` → `\,`
- Newline: `\n` → `\\n`

## Testing

### Manual Test

1. Visit: https://kinn.at/api/calendar.ics
2. Browser should download `kinn-events.ics` file
3. Verify file format and content

### Test with Calendar App

1. Subscribe to: `webcal://kinn.at/api/calendar.ics`
2. Verify events appear in calendar
3. Check event details (time, location, description)
4. Verify 24-hour reminder is set

### Test Event Updates

1. Update event in Redis (e.g., change location)
2. Clear cache: Wait 1 hour or use cache-busting `?t={timestamp}`
3. Verify updated event appears in subscribed calendars

### Validation

Use online iCal validators:
- https://icalendar.org/validator.html
- https://ical.marudot.com

## Troubleshooting

### Events Not Appearing

**Check Redis connection:**
```javascript
// In calendar.ics.js handler
console.log('[CALENDAR.ICS] Generating feed for', events.length, 'events');
```

**Verify Redis data:**
- Console: https://console.upstash.com
- Key: `events:config`
- Ensure JSON is valid

### Calendar Not Updating

**Cache issues:**
- Wait up to 1 hour for cache expiration
- Some calendar apps refresh less frequently
- Try unsubscribe/resubscribe

**URL issues:**
- Ensure using `webcal://` or `https://`
- Some apps don't support `webcal://` - use `https://`

### Invalid iCal Format

**Common issues:**
- Invalid date format in Redis
- Special characters not escaped
- Missing required fields

**Error response:**
```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//KINN//KI Treff Innsbruck//DE
X-ERROR:Internal server error
END:VCALENDAR
```

**Check server logs:**
```bash
# Vercel logs
vercel logs [deployment-url]
```

### Time Zone Issues

- Always use `Europe/Vienna` for Innsbruck events
- Times are stored in 24-hour format
- Calendar apps convert to user's local timezone

## Environment Variables

**Required:**
```env
KINNST_KV_REST_API_URL=https://...upstash.io
KINNST_KV_REST_API_TOKEN=...
```

**Not needed (removed with OAuth):**
- ~~`GOOGLE_CLIENT_ID`~~
- ~~`GOOGLE_CLIENT_SECRET`~~
- ~~`ENCRYPTION_KEY`~~

## API Reference

### GET /api/calendar.ics

**Description:** Generates iCal feed from Redis event configuration

**Request:**
```http
GET /api/calendar.ics HTTP/1.1
Host: kinn.at
```

**Response Success (200):**
```http
HTTP/1.1 200 OK
Content-Type: text/calendar; charset=utf-8
Content-Disposition: inline; filename=kinn-events.ics
Cache-Control: public, max-age=3600

BEGIN:VCALENDAR
...
END:VCALENDAR
```

**Response Error (500):**
```http
HTTP/1.1 500 Internal Server Error
Content-Type: text/calendar; charset=utf-8

BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//KINN//KI Treff Innsbruck//DE
X-ERROR:Internal server error
END:VCALENDAR
```

**Query Parameters:** None

**Rate Limiting:** None (cached via CDN)

## Redis Functions Reference

### getEventsConfig()

**Location:** `/api/utils/redis.js`

**Returns:** `Promise<Object>`

```javascript
{
  events: Array<EventObject>,
  defaults: {
    timezone: string,
    organizer: string,
    categories: string[],
    reminder: string
  }
}
```

**Default fallback:** Returns empty events array and default config if key not found

**Error handling:** Catches errors, logs to console, returns default structure

### updateEventsConfig(config)

**Location:** `/api/utils/redis.js`

**Parameters:**
- `config` (Object): Event configuration object

**Returns:** `Promise<void>`

**Throws:** Database errors with message `Database error: ${error.message}`

**Logging:** Logs successful updates with event count

## Future Enhancements

### Recurring Events

Add `rrule` field to event configuration:

```json
{
  "id": "kinn-monthly",
  "title": "KINN - KI Treff Innsbruck",
  "rrule": "FREQ=MONTHLY;BYMONTHDAY=6;COUNT=12"
}
```

### Multi-Language Support

Add `lang` field and localized content:

```json
{
  "title": {
    "de": "KINN - KI Treff Innsbruck",
    "en": "KINN - AI Meetup Innsbruck"
  }
}
```

### Rich Metadata

- Geographic coordinates (GEO property)
- Event images (ATTACH property)
- Attendee management (ATTENDEE property)

### Admin Interface

Planned features:
- Web UI at `/admin/events`
- Authentication required
- CRUD operations for events
- Preview generated iCal
- Bulk import/export
- Event templates

### Integration with Google Sheets

Alternative to Redis for non-technical event management:
- Google Sheet as event source
- Public readonly access
- Automatic sync to Redis
- No coding required for event updates

## Resources

- **RFC 5545:** iCalendar specification
  https://tools.ietf.org/html/rfc5545

- **iCal Validator:**
  https://icalendar.org/validator.html

- **IANA Time Zones:**
  https://www.iana.org/time-zones

- **Upstash Redis Docs:**
  https://docs.upstash.com/redis

## Support

For issues or questions:
- GitHub: https://github.com/aaaalabs/kinn-landing
- Email: thomas@kinn.at

---

**Last Updated:** 2025-01-01
**Version:** 1.0.0
**Authors:** KINN Team + Claude Code
