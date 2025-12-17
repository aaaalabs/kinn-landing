# KINN Newsletter System - Unified Strategy

## Status Quo

### Zwei Systeme, zwei Zwecke

**1. Event-Newsletter (`/api/admin/send-newsletter`)**
- Zweck: Event-Einladungen mit RSVP
- Template: Dynamisch generiert via `render-event-email.js`
- Empfänger: KINN Subscribers (Redis)
- Features: RSVP-Buttons, Social Proof, Personalisierung
- Trigger: Admin-Dashboard, pro Event

**2. KINN:LADE (`/lade/01/email.html`)**
- Zweck: Content-Newsletter (Editorial, Stories, Community Updates)
- Template: Statisches HTML (manuell gepflegt)
- Empfänger: Dieselben KINN Subscribers
- Features: Long-form Content, Quellen, Bilder
- Trigger: Monatlich, manuell via API-Call

---

## Das Problem

Die beiden Systeme existieren parallel ohne Integration:

| Aspekt | Event-Newsletter | KINN:LADE |
|--------|------------------|-----------|
| Template | Code-generiert | Statisches HTML |
| Versand | Admin-Dashboard | Manueller curl |
| Tracking | Resend Tags | Keine |
| Empfänger-Filter | ja/notifications/engaged | Keine |
| Abmelde-Link | Dynamisch | Statisch (broken) |
| Personalisierung | Name, RSVP-Links | Keine |

---

## Empfehlung: Unified Newsletter System

### Architektur

```
/lade/
├── 01/
│   ├── email.html       # Content-Template
│   ├── index.html       # Web-Archiv
│   └── images/
├── 02/
│   └── ...
├── metadata.json        # Newsletter-Registry
└── send.js              # ← NEU: Unified Send API

/api/
├── admin/
│   ├── send-newsletter.js       # Event-Newsletter (bleibt)
│   └── send-lade.js             # ← NEU: LADE Newsletter Endpoint
└── lade/
    └── preview.js               # ← NEU: Preview mit Personalisierung
```

### Option A: Minimal (Empfohlen für jetzt)

**Aufwand: 2-3 Stunden**

Neuer Endpoint `/api/admin/send-lade.js`:

```javascript
// POST /api/admin/send-lade
// Body: { newsletterId: "01", testEmail?: string }

1. Lese /lade/{id}/email.html
2. Ersetze Platzhalter:
   - {{unsubscribe_url}} → Magic Link
   - {{web_version_url}} → kinn.at/lade/{id}
3. Sende via Resend mit Tags
4. Update metadata.json (sentAt, recipientCount)
```

**Vorteile:**
- Schnell implementiert
- Statisches HTML bleibt (einfach zu editieren)
- Abmelde-Link funktioniert
- Tracking via Resend

**Nachteile:**
- Keine Personalisierung (Vorname)
- Zwei getrennte Workflows

---

### Option B: Unified Templates

**Aufwand: 1-2 Tage**

Migriere LADE zu React Email Templates wie Event-Newsletter:

```
/emails/
├── render-event-email.js    # Besteht
└── render-lade-email.js     # NEU

/lade/
├── 01/
│   ├── content.json         # Strukturierter Content
│   └── images/
└── metadata.json
```

**Vorteile:**
- Konsistente Design-Sprache
- Personalisierung (Vorname)
- Einheitlicher Workflow
- Automatische Plain-Text-Version

**Nachteile:**
- Mehr Aufwand
- Content-Editing wird technischer
- Verliert "HTML-First" Flexibilität

---

### Option C: Hybrid (Beste Balance)

**Aufwand: 4-6 Stunden**

LADE bleibt HTML-First, aber mit Smart Wrapper:

```javascript
// /api/admin/send-lade.js

async function sendLade(newsletterId, options) {
  const html = await fetch(`/lade/${newsletterId}/email.html`);

  // Wrap mit dynamischem Header/Footer
  const wrapped = wrapWithDynamicElements(html, {
    name: subscriber.name,
    unsubscribeUrl: generateMagicLink(email),
    webVersionUrl: `https://kinn.at/lade/${newsletterId}`
  });

  await resend.send({
    from: "Thomas @ KINN <thomas@kinn.at>",
    to: email,
    subject: metadata.subject,
    html: wrapped,
    tags: [
      { name: 'type', value: 'lade' },
      { name: 'issue', value: newsletterId }
    ]
  });
}
```

**Features:**
- HTML-Content bleibt statisch (einfach zu editieren)
- Header mit Personalisierung: "Hallo Thomas,"
- Footer mit funktionierendem Abmelde-Link
- Tracking via Resend Tags
- Web-Version Link

---

## Empfehlung

**Kurzfristig (jetzt): Option A**
- Implementiere `/api/admin/send-lade.js`
- Fixe den Abmelde-Link in email.html
- Füge Platzhalter hinzu: `{{unsubscribe_url}}`

**Mittelfristig (Q1 2026): Option C**
- Wrapper für dynamische Elemente
- Personalisierung
- Einheitliches Dashboard

**Langfristig (optional): Option B**
- Nur wenn Content-Team mit Code arbeiten will
- Nicht zwingend nötig

---

## Admin Dashboard Integration

### Aktuelles Dashboard (`/admin`)

```
┌─────────────────────────────────────────────┐
│ KINN Admin                                  │
├─────────────────────────────────────────────┤
│ [Events] [Teilnehmer] [Newsletter]          │
│                                             │
│ Events:                                     │
│ ├─ KINN #8 (8.1.2026) → [Send Invite]      │
│ └─ KINN #9 (15.1.2026) → [Send Invite]     │
│                                             │
│ Newsletter: ← NEU                           │
│ ├─ LADE #01 (Dec 2025) → [Preview] [Send]  │
│ └─ LADE #02 (Jan 2026) → [Draft]           │
└─────────────────────────────────────────────┘
```

### Neuer Tab: Newsletter

```html
<div class="newsletter-tab">
  <h3>KINN:LADE Newsletter</h3>

  <table>
    <tr>
      <td>#01 - Das stille Paradoxon</td>
      <td>Dec 2025</td>
      <td>Draft</td>
      <td>
        <a href="/lade/01">Preview</a>
        <button onclick="sendTest('01')">Test</button>
        <button onclick="sendAll('01')">Send All</button>
      </td>
    </tr>
  </table>
</div>
```

---

## Technische Änderungen

### 1. Platzhalter in email.html

Füge am Ende hinzu (vor `</body>`):

```html
<!-- Unsubscribe -->
<table role="presentation" width="600" style="max-width: 600px;">
  <tr>
    <td style="padding: 25px 20px; text-align: center;">
      <p style="font-size: 12px; color: #888888;">
        Du erhältst diese Email, weil du dich für KINN Updates angemeldet hast.
      </p>
      <p style="font-size: 12px;">
        <a href="{{web_version_url}}" style="color: #5ED9A6;">Im Browser ansehen</a>
        <span style="color: #cccccc; margin: 0 8px;">|</span>
        <a href="{{unsubscribe_url}}" style="color: #888888;">Abmelden</a>
      </p>
    </td>
  </tr>
</table>
```

### 2. Neuer API Endpoint

```javascript
// /api/admin/send-lade.js

import { Resend } from 'resend';
import { isAuthenticated } from '../utils/auth.js';
import { getAllSubscribers, getUserPreferences } from '../utils/redis.js';
import { generateAuthToken } from '../utils/tokens.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { newsletterId, testEmail } = req.body;

  // Fetch HTML template
  const baseUrl = process.env.BASE_URL || 'https://kinn.at';
  const htmlResponse = await fetch(`${baseUrl}/lade/${newsletterId}/email.html`);
  let html = await htmlResponse.text();

  // Fetch metadata
  const metaResponse = await fetch(`${baseUrl}/lade/metadata.json`);
  const metadata = await metaResponse.json();
  const newsletter = metadata.newsletters.find(n => n.id === newsletterId);

  if (!newsletter) {
    return res.status(404).json({ error: 'Newsletter not found' });
  }

  // Get recipients
  const recipients = testEmail
    ? [testEmail]
    : await getAllSubscribers();

  const stats = { sent: 0, failed: 0 };

  for (const email of recipients) {
    try {
      const authToken = generateAuthToken(email);
      const unsubscribeUrl = `${baseUrl}/api/auth/login?token=${encodeURIComponent(authToken)}&redirect=settings`;
      const webVersionUrl = `${baseUrl}/lade/${newsletterId}`;

      // Replace placeholders
      let personalizedHtml = html
        .replace(/{{unsubscribe_url}}/g, unsubscribeUrl)
        .replace(/{{web_version_url}}/g, webVersionUrl)
        .replace(/#/g, unsubscribeUrl); // Fix broken # links

      await resend.emails.send({
        from: metadata.defaults.fromEmail,
        to: email,
        subject: testEmail ? `[TEST] ${newsletter.subject}` : newsletter.subject,
        html: personalizedHtml,
        tags: [
          { name: 'type', value: 'lade' },
          { name: 'issue', value: newsletterId }
        ]
      });

      stats.sent++;
    } catch (error) {
      stats.failed++;
      console.error(`Failed to send to ${email}:`, error.message);
    }
  }

  return res.status(200).json({
    success: true,
    message: `Sent to ${stats.sent} recipients`,
    stats
  });
}
```

### 3. Update metadata.json nach Versand

```javascript
// Nach erfolgreichem Versand
newsletter.sentAt = new Date().toISOString();
newsletter.recipientCount = stats.sent;
newsletter.status = 'sent';
```

---

## Workflow: Neuen Newsletter erstellen

### 1. Ordner erstellen
```bash
cp -r lade/01 lade/02
```

### 2. Content bearbeiten
- `lade/02/email.html` anpassen
- Neue Bilder in `lade/02/images/`

### 3. metadata.json aktualisieren
```json
{
  "id": "02",
  "title": "Neuer Titel",
  "subject": "KINN:LADE #02 - Neuer Titel",
  "status": "draft"
}
```

### 4. Preview
- Lokal: `open lade/02/email.html`
- Live: `kinn.at/lade/02`

### 5. Test senden
```bash
curl -X POST https://kinn.at/api/admin/send-lade \
  -H "Authorization: Bearer $ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"newsletterId": "02", "testEmail": "thomas@kinn.at"}'
```

### 6. An alle senden
```bash
curl -X POST https://kinn.at/api/admin/send-lade \
  -H "Authorization: Bearer $ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"newsletterId": "02"}'
```

---

## Anti-Spam Checklist

- [x] Images hosted on HTTPS (kinn.at/lade/01/images/)
- [x] Consistent sender identity (Thomas @ KINN)
- [x] List-Unsubscribe header (via Resend)
- [ ] Working unsubscribe link ← TODO
- [ ] Plain text fallback ← Optional
- [x] No spam trigger words
- [x] Batched sending (10/batch, 1s delay)

---

## Migration Plan

### Phase 1: Quick Fix (heute)
1. ✅ Test-Email funktioniert (manuell via curl)
2. Fixe Abmelde-Link in email.html (Platzhalter)
3. Implementiere `/api/admin/send-lade.js`

### Phase 2: Dashboard Integration (nächste Woche)
1. Neuer Tab im Admin-Dashboard
2. Preview/Test/Send Buttons
3. Status-Tracking (draft/sent)

### Phase 3: Personalisierung (Q1 2026)
1. Wrapper für dynamische Elemente
2. "Hallo {{name}}," Header
3. Engagement-basierte Segmentierung

---

---

## Option D: LADE + Events Hybrid (Beste UX)

**Aufwand: 4-6 Stunden (aufbauend auf Option A/C)**

KINN:LADE wird zum "Master-Newsletter" mit automatisch angehängten Events.

### Konzept

```
┌─────────────────────────────────────────────┐
│ KINN:LADE #01 - Das stille Paradoxon        │
├─────────────────────────────────────────────┤
│                                             │
│  [Hero Image]                               │
│                                             │
│  Editorial Content...                       │
│  - Das Gefühl                               │
│  - Die Zahlen                               │
│  - KI-Begleiter                             │
│  - Was 2026 passiert                        │
│  - etc.                                     │
│                                             │
├─────────────────────────────────────────────┤
│  KOMMENDE KINN TREFFS           ← AUTO      │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Do 8.1. | WIFI LernBar | 8-9 Uhr    │   │
│  │ [Ja ✓] [Vielleicht ?] [Nein ✗]      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Do 15.1. | SOHO2.0 | 8-9 Uhr        │   │
│  │ [Ja ✓] [Vielleicht ?] [Nein ✗]      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  → Alle Events im Kalender abonnieren       │
│                                             │
└─────────────────────────────────────────────┘
```

### Vorteile

1. **Ein Newsletter statt zwei** - User bekommt nicht separat Event-Invite + LADE
2. **RSVP direkt im Content-Newsletter** - Höhere Conversion
3. **Weniger Email-Fatigue** - Monatlich statt pro Event
4. **Kontext** - Events passen zum Editorial-Thema

### Implementierung

```javascript
// /api/admin/send-lade.js (erweitert)

async function sendLade(newsletterId, options) {
  // 1. Lade LADE HTML
  let html = await fetchLadeHtml(newsletterId);

  // 2. Hole kommende Events (nächste 4 Wochen)
  const events = await getUpcomingEvents({ weeks: 4 });

  // 3. Generiere Event-Block HTML
  const eventsHtml = renderEventsBlock(events, {
    subscriberEmail: email,
    includeRsvp: true  // RSVP-Buttons pro Event
  });

  // 4. Injiziere vor Footer
  html = html.replace(
    '<!-- EVENTS_PLACEHOLDER -->',
    eventsHtml
  );

  // Alternativ: Automatisch vor </body> einfügen
  // html = html.replace('</body>', `${eventsHtml}</body>`);

  await resend.send({ ... });
}
```

### Event-Block Template

```html
<!-- Wird automatisch eingefügt -->
<table role="presentation" width="100%" style="margin: 40px 0; border-top: 1px solid #e0e0e0; padding-top: 40px;">
  <tr>
    <td>
      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 0 0 25px 0;">
        Kommende KINN Treffs
      </h2>
    </td>
  </tr>

  <!-- Event 1 -->
  <tr>
    <td style="padding: 20px; background: #f9f9f9; border-radius: 8px; margin-bottom: 15px;">
      <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
        Donnerstag, 8. Jänner 2026
      </p>
      <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">
        8-9 Uhr | WIFI LernBar, Innsbruck
      </p>
      <table role="presentation">
        <tr>
          <td style="padding-right: 10px;">
            <a href="{{rsvp_yes_1}}" style="display: inline-block; padding: 10px 20px; background: #5ED9A6; color: #1a1a1a; text-decoration: none; border-radius: 4px; font-weight: 500;">Dabei</a>
          </td>
          <td style="padding-right: 10px;">
            <a href="{{rsvp_maybe_1}}" style="display: inline-block; padding: 10px 20px; background: #f0f0f0; color: #666; text-decoration: none; border-radius: 4px;">Vielleicht</a>
          </td>
          <td>
            <a href="{{rsvp_no_1}}" style="display: inline-block; padding: 10px 20px; background: transparent; color: #888; text-decoration: none;">Nicht dabei</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Event 2 -->
  <tr>
    <td style="padding: 20px; background: #f9f9f9; border-radius: 8px; margin-top: 15px;">
      ...
    </td>
  </tr>

  <!-- Calendar Link -->
  <tr>
    <td style="padding-top: 20px; text-align: center;">
      <a href="https://kinn.at/api/calendar.ics" style="color: #5ED9A6; font-size: 14px;">
        → Alle Events im Kalender abonnieren
      </a>
    </td>
  </tr>
</table>
```

### Workflow-Änderung

**Alt (2 Emails):**
1. LADE Newsletter (Content)
2. Event-Invite (pro Event)

**Neu (1 Email):**
1. LADE Newsletter mit eingebetteten Events + RSVP

### Wann separate Event-Invites noch sinnvoll sind

- **Kurzfristige Events** (< 1 Woche) - Reminder
- **Änderungen** (Location, Absage)
- **Spezial-Events** (nicht wöchentlicher Treff)

### Konfiguration

```json
// metadata.json
{
  "newsletters": [{
    "id": "01",
    "includeEvents": true,           // Events anhängen?
    "eventsLookahead": 4,            // Wochen voraus
    "eventsMaxCount": 3,             // Max Events anzeigen
    "eventsIncludeRsvp": true        // RSVP-Buttons?
  }]
}
```

---

## Option D.1: LinkedIn Event-Integration

### Kontext

Jedes KINN Event hat aktuell einen **LinkedIn Event-Link** für maximale Reichweite. Zusätzlich gibt es **exklusive Events** nur für ehemalige Teilnehmer.

### Event-Typen

| Event-Typ | Zielgruppe | Anmeldung | Sichtbarkeit |
|-----------|------------|-----------|--------------|
| **Öffentlich** | Alle | LinkedIn Event | Im Newsletter + LinkedIn |
| **Exklusiv (members-only)** | Ehemalige Teilnehmer | Eigene RSVP | Nur im Newsletter |

### LinkedIn vs. Eigene RSVP

| Aspekt | LinkedIn Event | Eigene RSVP |
|--------|----------------|-------------|
| **Reichweite** | Hoch (LinkedIn Algo) | Nur Subscriber |
| **Sichtbarkeit** | Im Feed der Teilnehmer | Nur in Email |
| **Daten** | Bei LinkedIn | In Redis (eigene) |
| **Reminder** | LinkedIn automatisch | Manuell/WhatsApp |
| **Networking** | Teilnehmer sichtbar | Privat |
| **Branding** | LinkedIn-Design | KINN-Design |

**Empfehlung: Hybrid-Ansatz**
- LinkedIn Event = Primär (für Reichweite & Discovery)
- Eigene RSVP = Sekundär (für Daten & Reminder)
- Members-only Events = Nur eigene RSVP

### Zukünftiges Event-Schema

```javascript
// Event-Schema Erweiterung
{
  ...existingFields,
  visibility: "public" | "members-only",
  externalLinks: {
    linkedin?: string,    // https://linkedin.com/events/...
    meetup?: string,
    eventbrite?: string
  },
  primaryRegistration: "linkedin" | "internal" | "both"
}
```

### Newsletter-Darstellung

```
┌─────────────────────────────────────────────┐
│  KOMMENDE KINN TREFFS                       │
├─────────────────────────────────────────────┤
│  ÖFFENTLICH                                 │
│  Do 8.1. | WIFI LernBar | 8-9 Uhr           │
│  [Auf LinkedIn anmelden]                    │
├─────────────────────────────────────────────┤
│  NUR FÜR KINN'DER                           │
│  Fr 17.1. | Special Workshop                │
│  [Dabei] [Vielleicht] [Nein]                │
│  (Du bist eingeladen weil du dabei warst)   │
└─────────────────────────────────────────────┘
```

### Berechtigungsprüfung für Exklusive Events

```javascript
// Beim Senden des Newsletters
const profile = await getProfile(email);
const hasAttended = profile?.engagement?.stats?.totalAttended > 0;

// Exklusive Events nur an Berechtigte senden
if (event.visibility === "members-only" && !hasAttended) {
  // Event nicht anzeigen für diesen User
  continue;
}
```

### Wann LinkedIn-First vs. Eigene RSVP?

**LinkedIn-First sinnvoll wenn:**
- Community < 100 Subscriber
- Reichweite wichtiger als Daten
- Kein eigener Reminder-Workflow

**Eigene RSVP-First sinnvoll wenn:**
- Community > 200 Subscriber
- WhatsApp-Reminder gewünscht
- Datenhoheit wichtig
- LinkedIn-Algo ändert sich negativ

---

## Option E: Luma als Event-Plattform

### Was ist Luma?

[lu.ma](https://lu.ma) ist eine Event-Plattform speziell für Community Events. Vorteile gegenüber eigener Lösung:

### Vergleich: Eigene Lösung vs. Luma

| Aspekt | Eigene Lösung (Redis) | Luma |
|--------|----------------------|------|
| **Setup** | Selbst gebaut | Sofort nutzbar |
| **RSVP** | Eigene Buttons | Luma-Formular |
| **Reminder** | Manuell/WhatsApp | Automatisch (Email) |
| **Waitlist** | Nicht implementiert | Built-in |
| **Check-in** | Nicht implementiert | QR-Code App |
| **Calendar Sync** | iCal-Feed | Google/Apple/Outlook |
| **Teilnehmer-Liste** | Nur für Admin | Öffentlich (optional) |
| **Branding** | Voll custom | Luma-Design + Logo |
| **Kosten** | Hosting (minimal) | Kostenlos (Basis) |
| **API** | Volle Kontrolle | Luma API verfügbar |
| **Datenhoheit** | 100% eigen | Bei Luma |

### Luma-Vorteile

1. **Automatische Reminder** - 24h + 1h vor Event
2. **Waitlist** - Bei limitierten Plätzen
3. **Recurring Events** - Wöchentliche Serie anlegen
4. **Check-in App** - QR-Code scannen
5. **Teilnehmer sichtbar** - Networking vor Event
6. **Calendar Integration** - 1-Click Add to Calendar
7. **Mobile-optimiert** - Native App-Feeling
8. **Analytics** - Attendance-Rate, No-Shows

### Luma-Nachteile

1. **Kein LinkedIn-Algo** - Weniger Discovery als LinkedIn Events
2. **Daten bei Luma** - Export möglich, aber nicht in Redis
3. **Design-Einschränkungen** - Luma-Look, nicht 100% KINN-Branding
4. **Abhängigkeit** - Platform-Risk

### Hybrid-Strategie mit Luma

```
┌─────────────────────────────────────────────┐
│  Event-Ökosystem                            │
├─────────────────────────────────────────────┤
│                                             │
│  LinkedIn Event ──────┐                     │
│  (Reichweite)         │                     │
│                       ▼                     │
│                   [Luma Event] ◄── Primary  │
│                       │                     │
│                       ▼                     │
│              Luma handles:                  │
│              - RSVP                         │
│              - Reminder                     │
│              - Waitlist                     │
│              - Check-in                     │
│                                             │
│  KINN Newsletter ─────┘                     │
│  (Link zu Luma)                             │
│                                             │
└─────────────────────────────────────────────┘
```

### Newsletter-Integration mit Luma

```
┌─────────────────────────────────────────────┐
│  KOMMENDE KINN TREFFS                       │
├─────────────────────────────────────────────┤
│  Do 8.1. | WIFI LernBar | 8-9 Uhr           │
│                                             │
│  [Auf lu.ma anmelden]  ← Luma Event-Link    │
│                                             │
│  23 Zusagen · 5 auf Warteliste              │
└─────────────────────────────────────────────┘
```

### Schema-Erweiterung für Luma

```javascript
{
  ...existingFields,
  externalLinks: {
    linkedin?: string,
    luma?: string,        // https://lu.ma/kinn-treff-8
    meetup?: string,
    eventbrite?: string
  },
  primaryPlatform: "luma" | "linkedin" | "internal"
}
```

### Wann Luma nutzen?

**Luma sinnvoll wenn:**
- Recurring Events (wöchentlich/monatlich)
- Limitierte Plätze (Waitlist nötig)
- Check-in gewünscht
- Automatische Reminder wichtig
- Weniger Dev-Aufwand gewünscht

**Eigene Lösung sinnvoll wenn:**
- Volle Datenhoheit nötig
- Custom RSVP-Flow (z.B. mit Profil-Fragen)
- Members-only Events (Luma hat keine Auth)
- Integration mit eigenem CRM

### Empfohlene Architektur: iCal + Luma Hybrid

**Prinzip:** Events selbst verwalten (iCal), aber Luma für Anmeldung nutzen.

```
┌─────────────────────────────────────────────┐
│  Event-Flow                                 │
├─────────────────────────────────────────────┤
│                                             │
│  1. Event in Redis anlegen                  │
│     (Datum, Location, Beschreibung)         │
│                                             │
│  2. Luma-Event erstellen                    │
│     → Link speichern in externalLinks.luma  │
│                                             │
│  3. iCal-Feed generieren                    │
│     → /api/calendar.ics (abonnierbar)       │
│     → Enthält Luma-Link in Beschreibung     │
│                                             │
│  4. Newsletter versenden                    │
│     → Event-Block mit Luma-Anmeldelink      │
│                                             │
└─────────────────────────────────────────────┘
```

**Vorteile:**
- **iCal bleibt** - Subscriber können Kalender abonnieren
- **Luma für RSVP** - Keine eigene Anmelde-Logik nötig
- **Datenhoheit** - Events in Redis, nur Anmeldung bei Luma
- **Flexibilität** - Kann jederzeit Luma ersetzen

### iCal mit Luma-Link

```javascript
// /api/calendar.ics - Erweitert

VEVENT
SUMMARY:KINN Treff #8
DTSTART:20260108T070000Z
DTEND:20260108T080000Z
LOCATION:WIFI LernBar, Innsbruck
DESCRIPTION:Wöchentlicher KI-Treff in Tirol.\n\n
  Anmeldung: https://lu.ma/kinn-treff-8\n
  Mehr Infos: https://kinn.at
URL:https://lu.ma/kinn-treff-8
END:VEVENT
```

### Newsletter Event-Block

```
┌─────────────────────────────────────────────┐
│  KOMMENDE KINN TREFFS                       │
├─────────────────────────────────────────────┤
│  Do 8.1. | WIFI LernBar | 8-9 Uhr           │
│                                             │
│  [Auf lu.ma anmelden]                       │
│                                             │
│  [+ Zum Kalender] ← Add-to-Calendar Links   │
└─────────────────────────────────────────────┘
```

### Schema

```javascript
{
  id: "kinn-treff-8",
  title: "KINN Treff #8",
  date: "2026-01-08",
  startTime: "08:00",
  location: "WIFI LernBar, Innsbruck",

  // Luma für Anmeldung
  externalLinks: {
    luma: "https://lu.ma/kinn-treff-8",
    linkedin: "https://linkedin.com/events/..."  // Optional für Reichweite
  },

  // iCal-Feed generiert aus diesen Daten
  // Subscriber können /api/calendar.ics abonnieren
}
```

### Migration zu Luma

**Phase 1: Parallel betreiben**
1. Events weiterhin in Redis anlegen
2. Luma-Events parallel erstellen
3. iCal-Feed enthält Luma-Link
4. Newsletter verlinkt auf Luma

**Phase 2: Luma als Primary Anmeldung**
1. Alle öffentlichen Events mit Luma-Link
2. LinkedIn Event verlinkt auf Luma
3. Eigene RSVP-Buttons entfernen
4. iCal bleibt für Kalender-Abo

**Phase 3: Optional - Luma API Integration**
1. Events via Luma API in Newsletter ziehen
2. Teilnehmer-Zahlen live anzeigen
3. Automatische Event-Blöcke generieren

### Luma API Möglichkeiten

```javascript
// Luma API (https://docs.lu.ma/reference/getting-started)

// Events abrufen
GET /api/public/v1/calendar/events

// Response
{
  "entries": [{
    "api_id": "evt-xxx",
    "name": "KINN Treff #8",
    "start_at": "2026-01-08T07:00:00Z",
    "end_at": "2026-01-08T08:00:00Z",
    "url": "https://lu.ma/kinn-treff-8",
    "geo_address_info": { "city": "Innsbruck" },
    "guest_count": 23,
    "waitlist_count": 5
  }]
}
```

---

## Fazit

Die beiden Newsletter-Typen haben unterschiedliche Zwecke und sollten **koexistieren**:

| Newsletter | Zweck | Frequenz | Trigger |
|------------|-------|----------|---------|
| Event-Invite | RSVP für Events | Pro Event | Admin nach Event-Erstellung |
| KINN:LADE | Content/Community | Monatlich | Manuell/Editorial |

Die Integration erfolgt über:
1. **Gemeinsame Subscriber-Basis** (Redis)
2. **Einheitliches Admin-Dashboard**
3. **Konsistente Branding-Sprache**
4. **Tracking via Resend Tags**
5. **LinkedIn für öffentliche Events** (Reichweite)
6. **Eigene RSVP für members-only Events** (Exklusivität)

Der wichtigste nächste Schritt: `/api/admin/send-lade.js` implementieren.
