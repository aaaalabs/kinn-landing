# Event Creation - Admin Guide

Anleitung für die Erstellung von KI Treff Events die automatisch in alle verbundenen Google Kalender hinzugefügt werden.

## Übersicht

**Was passiert:**
1. Admin erstellt Event via Admin Dashboard
2. System holt alle User mit OAuth tokens aus Redis
3. Event wird parallel in alle Kalender eingetragen
4. User sehen Event automatisch in Google Calendar

**Keine Emails nötig** - Events erscheinen direkt im Kalender!

---

## Admin Dashboard

**URL:** https://kinn.at/pages/admin.html

### Zugang

**Admin API Key:**
```
LDDnwzVkB0nZu3EKDkOuiR46T28udQWGeCsjLM7dxo8=
```

⚠️ **Wichtig**: Diesen Key sicher aufbewahren! Jeder mit diesem Key kann Events erstellen.

### Event erstellen

**1. Öffne:** https://kinn.at/pages/admin.html

**2. API Key eingeben:**
```
LDDnwzVkB0nZu3EKDkOuiR46T28udQWGeCsjLM7dxo8=
```

**3. Event Details ausfüllen:**
- **Event Titel**: z.B. "KINN KI Treff #12: Prompt Engineering Workshop"
- **Beschreibung**: Details zum Event (optional)
- **Location**: z.B. "KINN Office, Maria-Theresien-Straße 18, Innsbruck"
- **Start**: Datum + Zeit (z.B. 15.02.2025 18:00)
- **Ende**: Datum + Zeit (z.B. 15.02.2025 20:00)

**4. "Event für alle Kalender erstellen" klicken**

**5. Ergebnis prüfen:**
```json
{
  "success": true,
  "message": "Events created for 15 users",
  "stats": {
    "total": 15,
    "successful": 15,
    "failed": 0
  },
  "results": [...]
}
```

---

## API Endpoint (für Entwickler)

Falls du Events programmatisch erstellen willst:

### Request

```bash
POST https://kinn.at/api/events/create
Content-Type: application/json
Authorization: Bearer LDDnwzVkB0nZu3EKDkOuiR46T28udQWGeCsjLM7dxo8=

{
  "summary": "KINN KI Treff #12: Prompt Engineering Workshop",
  "description": "Ein interaktiver Workshop über fortgeschrittene Prompt Engineering Techniken...",
  "location": "KINN Office, Maria-Theresien-Straße 18, Innsbruck",
  "start": "2025-02-15T18:00:00.000Z",
  "end": "2025-02-15T20:00:00.000Z"
}
```

### Response (Success)

```json
{
  "success": true,
  "message": "Events created for 15 users",
  "stats": {
    "total": 15,
    "successful": 15,
    "failed": 0
  },
  "results": [
    {
      "email": "user1@example.com",
      "success": true,
      "eventId": "abc123...",
      "htmlLink": "https://calendar.google.com/calendar/event?eid=..."
    },
    ...
  ]
}
```

### Response (Error)

```json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

---

## Technische Details

### Token Refresh

Access tokens expiren nach ~1 Stunde. Das System refreshed automatisch:

```javascript
// Prüft ob token expired (mit 5min buffer)
if (Date.now() >= tokens.expiry_date - 5 * 60 * 1000) {
  // Refresh mit refresh_token
  const newTokens = await refreshAccessToken(tokens.refresh_token)
  // Re-encrypt und speichern
  await storeOAuthTokens(email, encryptTokens(newTokens))
}
```

### Event Structure

Google Calendar Events werden erstellt mit:

```javascript
{
  summary: "Event Titel",
  description: "Event Beschreibung",
  location: "Innsbruck, Tirol",
  start: {
    dateTime: "2025-02-15T18:00:00.000Z",
    timeZone: "Europe/Vienna"
  },
  end: {
    dateTime: "2025-02-15T20:00:00.000Z",
    timeZone: "Europe/Vienna"
  },
  reminders: {
    useDefault: false,
    overrides: [
      { method: 'email', minutes: 1440 },  // 1 Tag vorher
      { method: 'popup', minutes: 30 }     // 30 Min vorher
    ]
  }
}
```

### Parallel Processing

Events werden parallel für alle User erstellt:

```javascript
// Promise.allSettled für robustes error handling
const results = await Promise.allSettled(
  users.map(email => createCalendarEvent(email, eventData))
)
```

**Performance:**
- 15 Users: ~2-3 Sekunden
- 100 Users: ~5-8 Sekunden

### Rate Limiting

Google Calendar API:
- **Quota**: 1,000,000 requests/day
- **Per-user limit**: 500 requests/100 seconds

Für KINN (erwartete ~100-200 users):
- Kein Rate Limiting nötig
- Bei >1000 users: Batch-Processing implementieren

---

## Troubleshooting

### "Invalid API key"

**Problem:** API Key falsch oder nicht konfiguriert

**Fix:**
- Prüfe dass Key exakt ist: `LDDnwzVkB0nZu3EKDkOuiR46T28udQWGeCsjLM7dxo8=`
- Keine Leerzeichen am Anfang/Ende

### "No users with OAuth tokens found"

**Problem:** Noch keine User haben Google Kalender verbunden

**Fix:**
- Teste zuerst OAuth Flow mit deiner eigenen Email
- Prüfe Redis: `KEYS oauth:tokens:*`

### Einzelne Events failed

**Typische Gründe:**
1. **Refresh token invalid**: User muss OAuth erneut authorizen
2. **User revoked access**: User hat Zugriff in Google widerrufen
3. **Network timeout**: Retry automatisch

**Logs prüfen:**
```bash
vercel logs --follow
# Suche nach: [CALENDAR] Failed for <email>
```

### Events erscheinen nicht im Kalender

**Check 1:** Event ID in Response?
```json
{
  "eventId": "abc123...",
  "htmlLink": "https://calendar.google.com/..."
}
```

**Check 2:** Kalender Sync
- Google Calendar App öffnen
- "Refresh" oder neu laden
- Event sollte erscheinen

**Check 3:** Zeitzone
- Events werden mit `Europe/Vienna` erstellt
- User in anderen Zeitzonen sehen angepasste Zeit

---

## Best Practices

### Event Titel

✅ **Gut:**
- "KINN KI Treff #12: Prompt Engineering Workshop"
- "KINN Networking: KI in der Medizin"

❌ **Schlecht:**
- "Treff" (zu kurz, unklar)
- "KINN Event am Donnerstag" (redundant, Datum ist im Event)

### Beschreibung

**Template:**
```
🧠 KINN KI Treff Innsbruck

[Kurze Beschreibung des Themas]

📍 Location: [Adresse]
🕐 Zeit: [Zeit]

Was dich erwartet:
- [Punkt 1]
- [Punkt 2]
- [Punkt 3]

Anmeldung: [Falls nötig]
Kontakt: thomas@kinn.at
```

### Timing

**Vorlaufzeit:**
- Events mindestens 1 Woche im Voraus erstellen
- Reminder: 1 Tag + 30 Min vorher

**Event Dauer:**
- Typisch: 2 Stunden (18:00 - 20:00)
- Networking: 1.5 Stunden
- Workshops: 2-3 Stunden

---

## Statistiken

**Aktueller Stand:**
```bash
# Prüfe Anzahl OAuth Users
curl -X POST https://kinn.at/api/events/create \
  -H "Authorization: Bearer LDDnwzVkB0nZu3EKDkOuiR46T28udQWGeCsjLM7dxo8=" \
  -H "Content-Type: application/json" \
  -d '{"summary":"Test","start":"2025-02-01T18:00:00Z","end":"2025-02-01T20:00:00Z"}' \
| jq '.stats.total'
```

**Expected Growth:**
- Launch: ~10-20 users
- 1 Monat: ~50-100 users
- 3 Monate: ~100-200 users

---

## Security

**API Key Rotation:**

Falls der API Key kompromittiert wurde:

1. Generiere neuen Key:
```bash
openssl rand -base64 32
```

2. Update in Vercel:
```bash
vercel env rm ADMIN_API_KEY production --yes
vercel env add ADMIN_API_KEY production
# Paste neuen Key
```

3. Update diese Dokumentation

4. Informiere andere Admins

---

## Support

Bei Problemen:
- Vercel Logs: `vercel logs --follow`
- Google Calendar API Status: https://status.cloud.google.com/
- KINN: thomas@kinn.at
