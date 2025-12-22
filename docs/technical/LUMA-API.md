# Luma API Integration

**Stand:** 22. Dezember 2025
**Voraussetzung:** Luma Plus Subscription

## Übersicht

Die Luma API ermöglicht programmgesteuerten Zugriff auf Events, Gäste und Kalender. Mögliche Use Cases für KINN:

1. **Event-Anmeldungen auf kinn.at anzeigen** (Gästeliste, Teilnehmerzahl)
2. **Automatische Synchronisation** neuer Events von Luma nach KINN
3. **Webhooks** für Echtzeit-Updates bei neuen Anmeldungen
4. **Gäste importieren/exportieren** zwischen Systemen

---

## Authentifizierung

```bash
# Header für alle Requests
x-luma-api-key: YOUR_API_KEY
```

**API Key generieren:**
1. https://lu.ma/personal/settings
2. Settings → Options → API keys

**Achtung:** Der API Key gibt vollen Zugriff auf den Luma Account!

---

## Base URLs

| Variante | URL |
|----------|-----|
| Public API (offiziell) | `https://public-api.luma.com` |
| Legacy API | `https://lu.ma/api/v1/` |
| Alternative | `https://api.lu.ma` |

---

## Rate Limits

- **300 Requests pro Minute** über alle Endpoints
- Bei Überschreitung: 1 Minute Sperre
- Retry-Logic implementieren empfohlen

---

## Verfügbare Endpoints

### Events (11 Endpoints)

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/v1/event/get` | GET | Event-Details abrufen |
| `/v1/event/create` | POST | Neues Event erstellen |
| `/v1/event/update` | POST | Event bearbeiten |
| `/v1/event/get-guest` | GET | Einzelnen Gast abrufen |
| `/v1/event/get-guests` | GET | Alle Gäste eines Events |
| `/v1/event/add-guests` | POST | Gäste hinzufügen |
| `/v1/event/send-invites` | POST | Einladungen versenden |
| `/v1/event/update-guest-status` | POST | Gast-Status ändern |
| `/v1/event/add-host` | POST | Host hinzufügen |
| `/v1/event/list-ticket-types` | GET | Ticket-Typen auflisten |
| `/v1/event/create-coupon` | POST | Gutscheincode erstellen |

### Kalender (12 Endpoints)

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/v1/calendar/list-events` | GET | Alle Events des Kalenders |
| `/v1/calendar/lookup-event` | GET | Event suchen |
| `/v1/calendar/list-people` | GET | Alle Personen im Kalender |
| `/v1/calendar/import-people` | POST | Personen importieren |
| `/v1/calendar/list-person-tags` | GET | Tags auflisten |
| `/v1/calendar/create-person-tag` | POST | Tag erstellen |
| `/v1/calendar/apply-person-tag` | POST | Tag zuweisen |
| `/v1/calendar/add-event` | POST | Event zu Kalender hinzufügen |

### Memberships (3 Endpoints)

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/v1/membership/list-tiers` | GET | Mitgliedschaftsstufen |
| `/v1/membership/add-member` | POST | Mitglied hinzufügen |
| `/v1/membership/update-status` | POST | Mitgliedstatus ändern |

### Webhooks (5 Endpoints)

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/v1/webhook/list` | GET | Alle Webhooks auflisten |
| `/v1/webhook/get` | GET | Webhook-Details |
| `/v1/webhook/create` | POST | Webhook erstellen |
| `/v1/webhook/update` | POST | Webhook bearbeiten |
| `/v1/webhook/delete` | POST | Webhook löschen |

### Sonstige

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/v1/user/get-self` | GET | Eigene User-Infos |
| `/v1/lookup-entity` | GET | Entity suchen |
| `/v1/create-upload-url` | POST | Upload-URL generieren |

---

## Webhook Event Types

Webhooks für Echtzeit-Benachrichtigungen:

| Event Type | Beschreibung | Use Case für KINN |
|------------|--------------|-------------------|
| `event.created` | Neues Event angelegt | Automatisch auf kinn.at anzeigen |
| `event.updated` | Event geändert | Details synchronisieren |
| `guest.registered` | Neue Anmeldung | Teilnehmerzahl aktualisieren |
| `guest.updated` | Gast-Status geändert | Absagen tracken |
| `ticket.registered` | Ticket gekauft | (falls kostenpflichtig) |
| `calendar.event_added` | Event zu Kalender hinzugefügt | - |
| `calendar.person_subscribed` | Person hat Kalender abonniert | - |

---

## Beispiel-Requests

### Test: API Key validieren

```bash
curl -H "x-luma-api-key: $LUMA_API_KEY" \
  https://public-api.luma.com/v1/user/get-self
```

### Events auflisten

```bash
curl -H "x-luma-api-key: $LUMA_API_KEY" \
  https://public-api.luma.com/v1/calendar/list-events
```

### Gäste eines Events abrufen

```bash
curl -H "x-luma-api-key: $LUMA_API_KEY" \
  "https://public-api.luma.com/v1/event/get-guests?event_api_id=evt_xxx"
```

---

## Python Integration

```python
import requests

LUMA_API_KEY = "your_api_key"
BASE_URL = "https://public-api.luma.com"

headers = {
    "x-luma-api-key": LUMA_API_KEY
}

# Events abrufen
response = requests.get(f"{BASE_URL}/v1/calendar/list-events", headers=headers)
events = response.json()

# Gäste eines Events
event_id = "evt_xxx"
response = requests.get(
    f"{BASE_URL}/v1/event/get-guests",
    headers=headers,
    params={"event_api_id": event_id}
)
guests = response.json()
```

---

## Node.js / Vercel Integration

```javascript
// api/luma/events.js
export default async function handler(req, res) {
  const response = await fetch(
    'https://public-api.luma.com/v1/calendar/list-events',
    {
      headers: {
        'x-luma-api-key': process.env.LUMA_API_KEY
      }
    }
  );

  const events = await response.json();
  res.json(events);
}
```

---

## Mögliche KINN Integrationen

### 1. Event-Widget auf kinn.at (Read-Only)

**Aufwand:** Gering
**Nutzen:** Events + Teilnehmerzahl direkt auf kinn.at anzeigen

```
GET /v1/calendar/list-events → Nächste Events
GET /v1/event/get-guests → Teilnehmerzahl
```

### 2. Gästeliste im Admin Dashboard

**Aufwand:** Mittel
**Nutzen:** Anmeldungen direkt in /admin sehen

```
GET /v1/event/get-guests → Namen, E-Mails, RSVP-Status
```

### 3. Webhook für Echtzeit-Updates

**Aufwand:** Mittel
**Nutzen:** Sofortige Benachrichtigung bei neuen Anmeldungen

```
POST /v1/webhook/create → Webhook auf /api/luma/webhook registrieren
→ Bei guest.registered: Slack-Notification / Counter aktualisieren
```

### 4. Automatische Subscriber-Sync

**Aufwand:** Hoch
**Nutzen:** Luma-Anmeldungen automatisch in KINN Newsletter übernehmen

```
Webhook guest.registered → E-Mail in Redis speichern
```

---

## Einschränkungen

- **Kein inkrementelles Laden** - Immer volle Listen
- **Rate Limit 300/min** - Bei vielen Requests beachten
- **Luma Plus erforderlich** - Kostet ~$29/Monat
- **Keine öffentliche Event-API** - Nur eigene Events/Kalender

---

## Kosten

| Plan | Preis | API-Zugang |
|------|-------|------------|
| Free | $0 | Nein |
| Plus | ~$29/Monat | Ja |
| Enterprise | Auf Anfrage | Ja + höhere Rate Limits |

---

## Ressourcen

- [Luma API Dokumentation](https://docs.luma.com/reference/getting-started-with-your-api)
- [Luma Help: API](https://help.luma.com/p/luma-api)
- [API Key generieren](https://lu.ma/personal/settings)

---

## Strategische Entscheidungen

### Newsletter via Luma vs. Eigenes System (Resend)

#### Pro Luma Newsletter

| Vorteil | Details |
|---------|---------|
| **Eine Plattform** | Subscriber, Events, Newsletter an einem Ort |
| **Automatische Reminder** | Event-Erinnerungen ohne eigenen Code |
| **Bessere Deliverability** | Luma hat etablierte Sender-Reputation |
| **Weniger Maintenance** | Kein eigener E-Mail-Code zu pflegen |
| **Built-in Analytics** | Öffnungsraten, Klicks direkt in Luma |
| **RSVP-Integration** | Newsletter → Event → Anmeldung nahtlos |

#### Contra Luma Newsletter

| Nachteil | Details |
|----------|---------|
| **Vendor Lock-in** | Subscriber-Daten primär bei Luma |
| **Weniger Kontrolle** | Template-Anpassung eingeschränkt |
| **Kosten** | Plus Plan erforderlich (~$29/Monat) |
| **Keine eigene Domain** | E-Mails kommen von Luma, nicht @kinn.at |
| **Export-Aufwand** | Bei Plattformwechsel müssen Daten migriert werden |
| **Kein Custom Branding** | Luma Footer/Branding in E-Mails |

#### Empfehlung

**Für jetzt:** Luma Newsletter nutzen - weniger Aufwand, schneller Ergebnis.

**Aber:** Regelmäßig Subscriber exportieren und in Redis/Backup speichern, um Lock-in zu vermeiden.

---

### lu.ma Links vs. kinn.at - Domain-Strategie

#### Das Problem

Wenn Event-Anmeldungen direkt auf `lu.ma/kinn-7` passieren:
- Traffic geht an Luma, nicht kinn.at
- SEO-Wert bleibt bei Luma
- Markenwahrnehmung: "KINN nutzt Luma" statt "kinn.at ist KINN"
- Bei Plattformwechsel: Alle geteilten Links sind tot

#### Langfristige Risiken

| Risiko | Impact |
|--------|--------|
| **Kein SEO-Aufbau** | kinn.at gewinnt keine Domain Authority |
| **Link-Rot** | lu.ma Links funktionieren nicht mehr bei Wechsel |
| **Abhängigkeit** | Luma-Preisänderungen/Shutdown = Problem |
| **Marken-Dilution** | Leute erinnern sich an "lu.ma" nicht "kinn.at" |

#### Optimierungsstrategien

**Option A: Redirect-Strategie (Empfohlen)**

```
kinn.at/event/7 → Redirect zu lu.ma/kinn-7
```

Vorteile:
- Eigene URLs teilen (`kinn.at/event/7`)
- Bei Plattformwechsel: nur Redirect ändern
- Marke bleibt "kinn.at"
- SEO: Minimal, aber Link bleibt unter Kontrolle

Implementation:
```javascript
// vercel.json
{
  "redirects": [
    { "source": "/event/7", "destination": "https://lu.ma/kinn-7", "permanent": false }
  ]
}
```

**Option B: Embed + Native Registration**

Luma-Embed auf kinn.at + eigene Anmelde-Logik:

```
kinn.at/event/7 → Eigene Seite mit Luma-Embed
→ Anmeldung passiert auf kinn.at
→ API sync zu Luma
```

Vorteile:
- Volle Kontrolle über UX
- Traffic bleibt auf kinn.at
- SEO-Wert für eigene Domain

Nachteile:
- Braucht Luma Plus für API
- Mehr Entwicklungsaufwand
- Doppelte Datenhaltung

**Option C: Luma Custom Domain (Plus Feature)**

Luma Plus erlaubt Custom Domains:
```
events.kinn.at → Luma-gehostet
```

Vorteile:
- Marken-URL
- Luma übernimmt Hosting
- Kein eigener Code

Nachteile:
- Subdomain, nicht Hauptdomain
- Immer noch Luma-abhängig
- Plus-Kosten

#### Empfohlene Strategie für KINN

**Kurzfristig (Jetzt):**
1. **Immer kinn.at/event/X teilen**, nie lu.ma direkt
2. Redirects in vercel.json für aktuelle Events
3. Landingpage bleibt auf kinn.at (SEO, Branding)

**Mittelfristig (Bei Wachstum):**
1. Luma Plus für API-Zugang
2. Event-Seiten auf kinn.at mit Luma-Embed
3. Eigene Subscriber-Liste parallel führen

**Langfristig (100+ Subscriber):**
1. Evaluieren: Luma vs. eigene Lösung
2. Optionen: Cal.com, Eventbrite, eigenes System
3. Subscriber-Export als Backup immer aktuell halten

---

### URL-Schema für Events

```
kinn.at/event/7          → Redirect zu lu.ma/kinn-7
kinn.at/event/8          → Redirect zu lu.ma/kinn-8
kinn.at/events           → Übersichtsseite (optional)
```

Implementation in `vercel.json`:
```json
{
  "redirects": [
    { "source": "/event/7", "destination": "https://lu.ma/kinn-7", "permanent": false },
    { "source": "/event/8", "destination": "https://lu.ma/kinn-8", "permanent": false },
    { "source": "/e/:id", "destination": "https://lu.ma/kinn-:id", "permanent": false }
  ]
}
```

**Wichtig:** `permanent: false` (302) statt `permanent: true` (301), damit bei Plattformwechsel keine Browser-Caches im Weg sind.

---

## Empfehlung für KINN

**Phase 1 (Jetzt - Quick Win):**
- Event-Redirects einrichten (`kinn.at/event/X`)
- Luma Newsletter nutzen (weniger Aufwand)
- Subscriber regelmäßig exportieren als Backup

**Phase 2 (Bei 50+ Subscribern):**
- Luma Plus evaluieren
- Event-Widget auf kinn.at (Teilnehmerzahl)
- Webhook für Slack-Notifications

**Phase 3 (Bei 100+ Subscribern):**
- Eigene Event-Seiten mit Luma-Embed
- Parallele Subscriber-Liste in Redis
- Newsletter: Hybrid (Luma für Events, Resend für Community-Updates)
