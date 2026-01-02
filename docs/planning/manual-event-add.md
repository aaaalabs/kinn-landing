# Manual Event Add via URL Scraping

## Übersicht

**Feature**: Eingabefeld im Admin-Dashboard, in das ein beliebiger Event-Link eingefügt werden kann. Firecrawl scraped die Seite, Groq KI extrahiert das Event, und es wird als "Manuelle Quelle" im RADAR gespeichert.

**Motivation**: Nicht alle Events kommen von konfigurierten Quellen. Manchmal findet man ein interessantes Event auf LinkedIn, einer unbekannten Webseite, oder bekommt einen Link zugeschickt.

---

## Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│  Admin Dashboard (/admin)                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  📎 Quick Add via URL                                     │   │
│  │  ┌──────────────────────────────────────────────────────┐ │   │
│  │  │ https://example.com/event/ai-workshop-2026          │ │   │
│  │  └──────────────────────────────────────────────────────┘ │   │
│  │  [Scrapen & Hinzufügen]                                   │   │
│  │                                                            │   │
│  │  Status: ✓ Event extrahiert: "AI Workshop Innsbruck"     │   │
│  │  → Zur Review in der Liste hinzugefügt                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ RADAR Events ──────────────────────────────────────────────┐│
│  │  [Kalender] [Liste]                                         ││
│  │  Filter: [Status▾] [Quelle▾] [Kategorie▾]                   ││
│  │                                                              ││
│  │  ● AI Workshop Innsbruck  │ 15.01.2026 │ Manual │ pending  ││
│  │  ● KINN#27                │ 20.01.2026 │ KINN   │ approved ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## User Flow

### 1. Admin findet Event-Link
- LinkedIn Post mit Event-Ankündigung
- Newsletter-Forward ohne Email-Webhook
- Meetup.com Link
- Unbekannte Webseite mit Event-Details

### 2. Admin fügt URL ein
```
https://www.meetup.com/innsbruck-ai/events/299123456/
```

### 3. System verarbeitet
1. **URL Validierung** - Gültige URL, erreichbar
2. **Firecrawl Scrape** - JS-Rendering, Markdown-Extraktion
3. **Groq KI Analyse** - Event-Details extrahieren
4. **Preview anzeigen** - Admin bestätigt oder korrigiert
5. **Speichern** - Event mit `source: "Manual"` in Redis

### 4. Event erscheint in RADAR
- Status: `pending` (erfordert Review)
- Quelle: `Manual` (eigene Farbe im Kalender)
- Kann dann approved/rejected werden wie alle anderen

---

## Technische Implementierung

### 1. API Endpoint: `/api/radar/extract-url.js`

```javascript
// POST /api/radar/extract-url
// Body: { url: "https://..." }
// Auth: Bearer ADMIN_PASSWORD

export default async function handler(req, res) {
  // 1. Auth Check
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. URL Validation
  const { url } = req.body;
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // 3. Scrape with Firecrawl
  const scrapeResult = await scrapeWithFirecrawl(url, 3000);
  if (!scrapeResult.success) {
    return res.status(422).json({
      error: 'Scraping failed',
      details: scrapeResult.error
    });
  }

  // 4. Extract with Groq
  const event = await extractSingleEventWithAI(
    scrapeResult.markdown,
    url
  );

  if (!event) {
    return res.status(422).json({
      error: 'No event found on page',
      hint: 'The page might not contain event information'
    });
  }

  // 5. Store as pending
  const eventId = await storeManualEvent(event, url);

  return res.status(200).json({
    success: true,
    event: { ...event, id: eventId },
    message: 'Event zur Review hinzugefügt'
  });
}
```

### 2. Groq Prompt für Single-Event Extraction

```javascript
async function extractSingleEventWithAI(content, sourceUrl) {
  const prompt = `
You are extracting a SINGLE event from a webpage.

URL: ${sourceUrl}

CONTENT:
${content.slice(0, 15000)}

RULES:
1. Extract exactly ONE event from this page
2. If the page contains multiple events, extract the MAIN/PRIMARY one
3. If no clear event is found, return {"event": null}
4. Dates must be in YYYY-MM-DD format
5. Times in HH:MM 24-hour format
6. Default time to 18:00 if not specified
7. Default city to "Innsbruck" if in Tirol

CATEGORIZATION:
- "AI" if about AI/ML/KI/LLM/Data Science
- "Tech" if about programming/software
- "Startup" if about entrepreneurship/founding
- "Workshop" if hands-on learning
- "Networking" if primarily social/meetup
- "Other" if none of the above

Return JSON:
{
  "event": {
    "title": "Event name",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "endTime": "HH:MM or null",
    "location": "Venue name",
    "city": "City name",
    "category": "AI|Tech|Startup|Workshop|Networking|Other",
    "description": "Brief description (max 200 chars)",
    "registrationUrl": "URL for registration if different from source",
    "detailUrl": "${sourceUrl}",
    "isFree": true/false,
    "thumbnail": "Image URL if found"
  }
}

If no event is found, return:
{"event": null, "reason": "Why no event was found"}
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "Extract event details from webpage content." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 1000,
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(response.choices[0]?.message?.content || '{}');
  return result.event;
}
```

### 3. Store Function

```javascript
async function storeManualEvent(event, sourceUrl) {
  const location = event.location || event.city || 'unknown';
  const eventId = `${event.title}-${event.date}-${location}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  // Check for duplicates
  const exists = await kv.exists(`radar:event:${eventId}`);
  if (exists) {
    throw new Error('Event already exists');
  }

  const eventData = createPendingEvent({
    id: eventId,
    ...event,
    source: 'Manual',  // Special source for manual adds
    sourceUrl: sourceUrl,
    addedBy: 'admin',
    addedAt: new Date().toISOString()
  });

  await kv.hset(`radar:event:${eventId}`, eventData);
  await kv.sadd('radar:events', eventId);
  await kv.sadd(`radar:events:by-date:${event.date}`, eventId);

  return eventId;
}
```

### 4. Frontend Component im Admin Dashboard

```html
<!-- In admin/index.html, im RADAR Tab oben einfügen -->

<div id="radar-quick-add" style="
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
">
  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
    <span style="font-size: 1.1rem;">📎</span>
    <h3 style="font-size: 0.9rem; font-weight: 600; color: #1F2937;">
      Quick Add via URL
    </h3>
  </div>

  <div style="display: flex; gap: 0.75rem; align-items: stretch;">
    <input
      type="url"
      id="radar-quick-add-url"
      placeholder="https://... (Event-Link einfügen)"
      style="
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.875rem;
        font-family: inherit;
      "
    >
    <button
      id="radar-quick-add-btn"
      onclick="handleQuickAddUrl()"
      style="
        padding: 10px 20px;
        background: #5ED9A6;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        font-size: 0.875rem;
        cursor: pointer;
        white-space: nowrap;
      "
    >
      Scrapen
    </button>
  </div>

  <div id="radar-quick-add-status" style="
    margin-top: 0.75rem;
    font-size: 0.8rem;
    display: none;
  "></div>
</div>
```

### 5. JavaScript für Quick Add

```javascript
async function handleQuickAddUrl() {
  const urlInput = document.getElementById('radar-quick-add-url');
  const statusEl = document.getElementById('radar-quick-add-status');
  const btn = document.getElementById('radar-quick-add-btn');

  const url = urlInput.value.trim();

  if (!url) {
    showStatus('Bitte URL eingeben', 'error');
    return;
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    showStatus('Ungültige URL', 'error');
    return;
  }

  // Disable button, show loading
  btn.disabled = true;
  btn.textContent = 'Scrape...';
  showStatus('🔄 Seite wird analysiert...', 'loading');

  try {
    const res = await fetch('/api/radar/extract-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ url })
    });

    const data = await res.json();

    if (!res.ok) {
      showStatus(`❌ ${data.error}${data.hint ? ' - ' + data.hint : ''}`, 'error');
      return;
    }

    // Success!
    showStatus(
      `✅ Event extrahiert: "${data.event.title}" (${data.event.date})
       <br><small>→ Zur Review hinzugefügt (Status: pending)</small>`,
      'success'
    );

    // Clear input
    urlInput.value = '';

    // Refresh RADAR events list
    await loadRadarEvents();

  } catch (error) {
    showStatus(`❌ Fehler: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Scrapen';
  }

  function showStatus(message, type) {
    statusEl.style.display = 'block';
    statusEl.innerHTML = message;
    statusEl.style.color = type === 'error' ? '#ef4444' :
                           type === 'success' ? '#10b981' : '#6B7280';
  }
}
```

---

## Source Config für "Manual"

In `source-configs.js` ergänzen:

```javascript
'Manual': {
  url: null,  // Keine feste URL
  active: true,
  extraction: {
    method: 'manual-url',
    instructions: `
      Manual URL submissions from admin dashboard.
      These are one-off event URLs that don't fit into regular sources.

      Common origins:
      - LinkedIn posts
      - Meetup.com events
      - Unknown/new event platforms
      - Direct links from newsletters
      - Forwarded event announcements
    `,
    autoApprove: false,  // Always requires review
    maxChars: 15000
  },
  // Visual config for calendar
  color: '#9333EA',  // Purple - distinct from regular sources
  label: 'Manuell'
}
```

---

## Kalender-Farben Update

Die "Manual" Quelle braucht eine eigene Farbe im RADAR Kalender.

In `api/radar/calendar.js` (oder wo die Source-Farben definiert sind):

```javascript
const SOURCE_COLORS = {
  'KINN': '#5ED9A6',        // KINN Mint (owned)
  'InnCubator': '#3B82F6',  // Blue
  'Startup.Tirol': '#F59E0B', // Orange
  'WKO Tirol': '#EF4444',   // Red
  'AI Austria': '#8B5CF6',  // Violet
  'Uni Innsbruck': '#14B8A6', // Teal
  'MCI': '#EC4899',         // Pink
  'Manual': '#9333EA',      // Purple - für manuelle Einträge
  // ... andere
  'default': '#6B7280'      // Gray fallback
};
```

---

## Edge Cases & Error Handling

### 1. URL nicht erreichbar
```json
{
  "error": "Scraping failed",
  "details": "Page returned 404"
}
```

### 2. Keine Event-Infos gefunden
```json
{
  "error": "No event found on page",
  "hint": "The page might not contain event information"
}
```

### 3. Event bereits vorhanden
```json
{
  "error": "Event already exists",
  "existingId": "ai-workshop-innsbruck-2026-01-15-inncubator"
}
```

### 4. Nicht-deutsche/englische Seite
- Groq kann die meisten Sprachen, aber Extraktion könnte ungenauer sein
- Status-Meldung: "Event extrahiert (Sprache: [detected])"

### 5. Kostenpflichtiges Event
- Groq erkennt `isFree: false`
- Warning anzeigen: "⚠️ Event ist kostenpflichtig - trotzdem hinzufügen?"
- Admin entscheidet

---

## Optional: Preview vor dem Speichern

Erweiterter Flow mit Bestätigung:

```
[URL eingeben] → [Scrapen] → [Preview Modal] → [Bestätigen/Korrigieren] → [Speichern]
```

### Preview Modal

```html
<div id="radar-preview-modal" class="modal">
  <div class="modal-content">
    <h3>Event Preview</h3>

    <div class="preview-fields">
      <label>Titel</label>
      <input id="preview-title" value="AI Workshop Innsbruck">

      <label>Datum</label>
      <input type="date" id="preview-date" value="2026-01-15">

      <label>Uhrzeit</label>
      <input type="time" id="preview-time" value="18:00">

      <label>Location</label>
      <input id="preview-location" value="InnCubator">

      <label>Kategorie</label>
      <select id="preview-category">
        <option value="AI" selected>AI</option>
        <option value="Tech">Tech</option>
        <option value="Startup">Startup</option>
        ...
      </select>

      <label>Beschreibung</label>
      <textarea id="preview-description">...</textarea>

      <label>
        <input type="checkbox" id="preview-is-free" checked>
        Kostenlos
      </label>
    </div>

    <div class="modal-actions">
      <button onclick="cancelPreview()" class="btn-secondary">Abbrechen</button>
      <button onclick="confirmAndSave()" class="btn">Speichern</button>
    </div>
  </div>
</div>
```

---

## Implementierungsschritte

### Phase 1: Backend (30 min)
1. [ ] Neuer Endpoint `/api/radar/extract-url.js` erstellen
2. [ ] Firecrawl + Groq Integration (Copy von `extract-firecrawl.js`)
3. [ ] Single-Event Extraction Prompt
4. [ ] Store-Funktion mit `source: "Manual"`
5. [ ] Error Handling

### Phase 2: Frontend Basic (20 min)
1. [ ] Quick Add Box im RADAR Tab einfügen
2. [ ] Input + Button + Status-Anzeige
3. [ ] JavaScript Fetch-Handler
4. [ ] Auto-Refresh der Event-Liste nach Add

### Phase 3: Source Color (10 min)
1. [ ] "Manual" Source in `source-configs.js` ergänzen
2. [ ] Farbe (#9333EA Purple) in Calendar definieren
3. [ ] Filter-Dropdown um "Manual" erweitern

### Phase 4: Optional - Preview Modal (30 min)
1. [ ] Modal HTML/CSS
2. [ ] Two-Step Flow: Scrape → Preview → Confirm
3. [ ] Editable Fields im Preview
4. [ ] API anpassen für `dryRun` Option

---

## Testing

### Test-URLs für Development

```
# Meetup Event
https://www.meetup.com/innsbruck-tech-meetup/events/...

# Luma Event
https://lu.ma/...

# Eventbrite
https://www.eventbrite.com/e/...

# LinkedIn Event
https://www.linkedin.com/events/...

# Unknown Site
https://some-random-blog.com/events/ai-workshop-2026
```

### API Test mit cURL

```bash
curl -X POST https://kinn.at/api/radar/extract-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_PASSWORD" \
  -d '{"url": "https://lu.ma/example-event"}'
```

---

## Kosten-Analyse

### Pro URL-Scrape
- **Firecrawl**: ~$0.001 - $0.003 (je nach Seite)
- **Groq**: ~$0.0005 - $0.001 (llama-3.3-70b)
- **Total**: ~$0.002 - $0.004 pro URL

### Bei ~50 manuellen Adds/Monat
- Monthly Cost: ~$0.10 - $0.20
- **Vernachlässigbar** im Vergleich zum Zeitgewinn

---

## Future Extensions

### 1. Batch URL Import
```
[Textarea mit mehreren URLs]
↓
[Alle auf einmal scrapen]
↓
[Liste der extrahierten Events reviewen]
```

### 2. Browser Extension
- Rechtsklick auf Event-Link → "Zu KINN RADAR hinzufügen"
- Sendet URL an API

### 3. Telegram/WhatsApp Bot
- Link an Bot senden → Event wird extrahiert
- Bestätigung per Chat

### 4. Smart Duplicate Detection
- Nicht nur title+date+location
- Auch URL-basiert: Gleiche detailUrl → Skip
- Fuzzy Title Matching

---

## Zusammenfassung

| Aspekt | Details |
|--------|---------|
| **Aufwand** | ~1-2h für Basic, +30min für Preview |
| **Nutzen** | Ad-hoc Events ohne Source-Config hinzufügen |
| **Kosten** | ~$0.002-0.004 pro Scrape |
| **Risk** | Gering - nutzt bestehende Infrastruktur |
| **Dependencies** | Firecrawl + Groq (bereits vorhanden) |

**Empfehlung**: Phase 1-3 zuerst implementieren (Basic Flow). Preview Modal später ergänzen wenn nötig.
