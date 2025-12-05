# KINN #6 Topic Voting Widget - Implementation Spec v2.0

## Kontext

Voting-Widget für kinn.at Dashboard. User können KI-Themen für das nächste KINN Meetup vorschlagen und upvoten. Top 6 Themen werden Thementische beim Event.

## Integration mit bestehender Codebase

### Vorhandene Strukturen nutzen

- **Auth-System**: JWT-basierte Auth-Tokens (30 Tage Gültigkeit)
- **Redis**: Upstash KV mit `@upstash/redis` Client
- **API Pattern**: Serverless Functions in `/api/voting/`
- **Design System**: KINN Brand Styleguide
- **Frontend**: Vanilla JS (kein Framework nötig)

## Anforderungen

### Funktional

- Themen vorschlagen (Freitext, max 80 Zeichen)
- Themen upvoten (Toggle - Klick = Vote, nochmal Klick = Unvote)
- Keine Vote-Limitierung pro User (beliebig viele Themen voten)
- Echtzeit-Updates (neue Themen + Votes sichtbar für alle)
- Sortierung nach Votes (höchste oben)
- Token-basierter Zugang (verwendet bestehende Auth-Tokens)

### UI/UX

- KINN Brand Styleguide konform (kein Emojis, Work Sans Font)
- Kompaktes Widget (max 400px breit, ~380px hoch)
- Inline-vertical scroll für Themenliste
- Sticky bottom input für neue Themen
- Integration in `/pages/profil.html` Dashboard

## Datenmodell

```typescript
// Nutzt bestehende User-Struktur
interface AuthenticatedUser {
  email: string  // Aus verifyAuthToken()
  name?: string  // Aus profile:{email}
}

interface Topic {
  id: string              // Format: "topic-{timestamp}"
  title: string           // max 80 chars
  authorEmail: string     // User email
  authorName: string      // Display name (aus Profile oder Email-Prefix)
  votes: number
  voterEmails: string[]   // Array of emails who voted
  createdAt: string       // ISO timestamp
}

interface VotingState {
  phase: 'voting' | 'locked' | 'closed'
  eventId: string         // z.B. "kinn-6"
  endsAt: string          // ISO timestamp
}
```

## Redis Struktur

```javascript
// Voting State für KINN #6
"voting:kinn-6:state" → {
  phase: 'voting',
  eventId: 'kinn-6',
  endsAt: '2025-01-15T18:00:00.000Z'
}

// Topics Collection für KINN #6
"voting:kinn-6:topics" → Array<Topic>

// User Votes Index (für schnelles Lookup)
"voting:kinn-6:uservotes:{email}" → Set<topicId>
```

## API Endpoints

### Bestehende Auth nutzen

Alle Endpoints nutzen `verifyAuthToken()` aus `/api/utils/tokens.js`:

```javascript
import { verifyAuthToken } from '../utils/tokens.js';

// In jedem Handler:
const token = req.headers.authorization?.replace('Bearer ', '');
const email = verifyAuthToken(token);
if (!email) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Neue Endpoints

```
GET  /api/voting/topics
     Headers: Authorization: Bearer {token}
     → { topics: Topic[], state: VotingState, userVotes: string[] }

POST /api/voting/topics
     Headers: Authorization: Bearer {token}
     Body: { title: string }
     → { topic: Topic }

POST /api/voting/vote
     Headers: Authorization: Bearer {token}
     Body: { topicId: string }
     → { success: boolean, newVoteCount: number }

DELETE /api/voting/vote
     Headers: Authorization: Bearer {token}
     Body: { topicId: string }
     → { success: boolean, newVoteCount: number }
```

## Widget Integration

### Einbindung in Profil-Dashboard

In `/pages/profil.html` - Neuer Tab "KINN #6":

```html
<div class="tab-content" id="kinn6-content">
  <div id="voting-widget-container">
    <!-- Widget wird dynamisch geladen -->
  </div>
</div>

<script>
  // Widget nur laden wenn KINN #6 Tab aktiv
  function loadVotingWidget() {
    const container = document.getElementById('voting-widget-container');
    // Dynamisch laden um Hauptseite nicht zu verlangsamen
    import('/js/voting-widget.js').then(module => {
      module.initVotingWidget(container, authToken);
    });
  }
</script>
```

## Widget Struktur (KINN Design konform)

```
┌─────────────────────────────────────┐
│ Themen für KINN #6          47 ▸   │ ← Header mit Vote-Count
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Voice AI für KMU           14  │ │ ← Voted (Mint #5ED9A6)
│ │ Martin H.                      │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Agentic AI                 11  │ │ ← Not voted (Gray)
│ │ Sherin G.                      │ │
│ └─────────────────────────────────┘ │
│         ... scrollable ...          │
├─────────────────────────────────────┤
│ [Neues Thema...              ] [+]  │ ← Sticky input
└─────────────────────────────────────┘
```

## Interaktionen

**Vote/Unvote:**
- Klick auf Card togglet Vote
- Optimistic UI update (sofort visuell, dann Server-Sync)
- Bei Fehler: Revert zu vorherigem Zustand
- Liste re-sortiert automatisch nach Votes

**Neues Thema:**
- Input + Submit Button
- Nach Submit: Input cleared, Liste scrollt nach oben
- Neues Thema startet mit 1 Vote (eigener)
- Server-Validation: Max 80 Zeichen, nicht leer

**Realtime:**
- Polling alle 5 Sekunden (wie bestehende Profile-Updates)
- Vote-Counts und neue Themen aktualisieren sich
- Optimistic Updates für eigene Aktionen

## Design Specs (KINN Brand konform)

**Farben (aus Brand Styleguide):**
```css
/* Primary - Bold Mint */
--mint-primary: #5ED9A6;
--mint-hover: #4EC995;
--mint-active: #3EB885;

/* Text */
--text-primary: #3A3A3A;
--text-heading: #2C3E50;
--text-subtitle: #6B6B6B;
--text-meta: #999;

/* Backgrounds */
--bg-white: #ffffff;
--bg-subtle: #fafcfb;

/* Voted State */
--bg-voted: rgba(94, 217, 166, 0.08);
--border-voted: rgba(94, 217, 166, 0.3);
```

**Typography (Work Sans):**
```css
/* Bereits im Hauptdokument geladen */
Font: 'Work Sans', system-ui, -apple-system, sans-serif
Header: 16px, font-weight 600
Topic Title: 14px, font-weight 500
Author: 12px, font-weight 400
Vote Count: 18px, font-weight 700
```

**Spacing & Styling:**
```css
Container: border-radius: 16px (rounded-2xl)
Cards: border-radius: 12px (rounded-xl), padding 12px, gap 8px
Buttons: border-radius: 10px, 36x36px (vote), 40x40px (submit)
Shadows: box-shadow: 0 2px 8px rgba(0,0,0,0.04)
Hover: box-shadow: 0 4px 16px rgba(0,0,0,0.08)
```

**Transitions:**
```css
transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
/* Gleiche Easing-Funktion wie im Hauptprojekt */
```

## Component Implementation

```javascript
// /js/voting-widget.js
export function initVotingWidget(container, authToken) {
  const state = {
    topics: [],
    userVotes: new Set(),
    votingState: null
  };

  async function fetchTopics() {
    try {
      const response = await fetch('/api/voting/topics', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch topics');

      const data = await response.json();
      state.topics = data.topics;
      state.userVotes = new Set(data.userVotes);
      state.votingState = data.state;

      render();
    } catch (error) {
      console.error('[VOTING] Fetch error:', error);
      // User-friendly error display
      showError('Konnte Themen nicht laden. Bitte versuche es später nochmal.');
    }
  }

  async function handleVote(topicId) {
    const isVoted = state.userVotes.has(topicId);
    const method = isVoted ? 'DELETE' : 'POST';

    // Optimistic update
    if (isVoted) {
      state.userVotes.delete(topicId);
      updateTopicVotes(topicId, -1);
    } else {
      state.userVotes.add(topicId);
      updateTopicVotes(topicId, 1);
    }
    render();

    try {
      const response = await fetch('/api/voting/vote', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ topicId })
      });

      if (!response.ok) throw new Error('Vote failed');

      // Server response bestätigt neuen Count
      const data = await response.json();
      updateTopicVotesExact(topicId, data.newVoteCount);
      render();

    } catch (error) {
      console.error('[VOTING] Vote error:', error);
      // Revert optimistic update
      if (isVoted) {
        state.userVotes.add(topicId);
        updateTopicVotes(topicId, 1);
      } else {
        state.userVotes.delete(topicId);
        updateTopicVotes(topicId, -1);
      }
      render();
      showError('Vote konnte nicht gespeichert werden.');
    }
  }

  async function handleSubmit(title) {
    if (!title.trim() || title.length > 80) {
      showError('Thema muss 1-80 Zeichen lang sein.');
      return;
    }

    try {
      const response = await fetch('/api/voting/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ title })
      });

      if (!response.ok) throw new Error('Submit failed');

      const data = await response.json();
      state.topics.unshift(data.topic);
      state.userVotes.add(data.topic.id);
      render();

      // Clear input & scroll to top
      document.getElementById('new-topic-input').value = '';
      document.getElementById('topic-list').scrollTop = 0;

    } catch (error) {
      console.error('[VOTING] Submit error:', error);
      showError('Thema konnte nicht hinzugefügt werden.');
    }
  }

  function render() {
    // Sort by votes (highest first)
    const sorted = [...state.topics].sort((a, b) => b.votes - a.votes);
    const totalVotes = sorted.reduce((sum, t) => sum + t.votes, 0);

    container.innerHTML = `
      <div class="voting-widget">
        <header class="voting-header">
          <h3>Themen für KINN #6</h3>
          <span class="vote-count">${totalVotes} ▸</span>
        </header>
        <div id="topic-list" class="topic-list">
          ${sorted.map(topic => renderTopic(topic)).join('')}
        </div>
        <form class="topic-input" onsubmit="handleSubmitForm(event)">
          <input
            type="text"
            id="new-topic-input"
            placeholder="Neues Thema..."
            maxlength="80"
          />
          <button type="submit" class="btn-add">+</button>
        </form>
      </div>
    `;
  }

  function renderTopic(topic) {
    const isVoted = state.userVotes.has(topic.id);
    const className = isVoted ? 'topic-card voted' : 'topic-card';

    return `
      <div class="${className}" onclick="handleVoteClick('${topic.id}')">
        <div class="topic-content">
          <div class="topic-title">${escapeHtml(topic.title)}</div>
          <div class="topic-author">${escapeHtml(topic.authorName)}</div>
        </div>
        <div class="topic-votes">${topic.votes}</div>
      </div>
    `;
  }

  // Initial load & polling
  fetchTopics();
  setInterval(fetchTopics, 5000);

  // Expose handlers to window for onclick
  window.handleVoteClick = handleVote;
  window.handleSubmitForm = (e) => {
    e.preventDefault();
    handleSubmit(document.getElementById('new-topic-input').value);
  };
}

// Helper functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateTopicVotes(topicId, delta) {
  const topic = state.topics.find(t => t.id === topicId);
  if (topic) topic.votes += delta;
}

function updateTopicVotesExact(topicId, count) {
  const topic = state.topics.find(t => t.id === topicId);
  if (topic) topic.votes = count;
}

function showError(message) {
  // Reuse existing toast system from main page
  if (window.showToast) {
    window.showToast(message, 'error');
  } else {
    console.error('[VOTING]', message);
  }
}
```

## Edge Cases & Validierung

### Client-Side
- Leere Liste: "Noch keine Themen - sei der Erste!"
- Langer Titel: Input maxlength="80", Text truncate mit ellipsis
- Offline: Cache letzte Version, zeige Offline-Warnung
- Phase locked: Input disabled, "Voting beendet" Nachricht

### Server-Side
- Token ungültig: 401 Unauthorized
- Voting geschlossen: 403 Forbidden mit Nachricht
- Titel zu lang: 400 Bad Request
- Duplicate Prevention: Gleicher Titel innerhalb 5 Min = Error
- Rate Limiting: Max 10 Topics pro User pro Stunde

## Seed Data für Development

```javascript
// Initial seed für KINN #6
const seedTopics = [
  { title: "Voice AI für KMU - Telefon-Bots die funktionieren", votes: 14 },
  { title: "Agentic AI - Wenn KI selbstständig handelt", votes: 11 },
  { title: "Vibe Coding - Die neue Art zu programmieren", votes: 8 },
  { title: "KI-Automatisierung für Kleinunternehmen", votes: 7 },
  { title: "KI & Compliance - NIS2, DORA, AI Act", votes: 5 }
];
```

## Implementierungs-Reihenfolge

### Phase 1: Backend (Tag 1)
1. ✅ Redis Struktur definieren
2. API Endpoints in `/api/voting/` implementieren
3. Auth-Integration testen
4. Seed Data für Tests

### Phase 2: Frontend Widget (Tag 1-2)
1. Widget Component in `/js/voting-widget.js`
2. CSS Styles (KINN konform)
3. Integration in `/pages/profil.html`
4. Optimistic UI Updates

### Phase 3: Polish & Testing (Tag 2)
1. Error Handling verfeinern
2. Loading States
3. Mobile Testing
4. Performance (Debouncing, Caching)
5. Admin-View für Ergebnisse

## Risiken & Mitigationen

### Technische Risiken
- **Redis Limits**: Bei >1000 Topics → Pagination implementieren
- **Polling-Last**: Bei >50 Users → WebSockets oder SSE evaluieren
- **Spam**: Rate Limiting + Duplicate Detection

### UX Risiken
- **Onboarding**: Klare CTAs, Beispiel-Themen als Inspiration
- **Mobile**: Touch-optimierte Buttons (min 44x44px)
- **Feedback**: Visuelles Feedback für alle Aktionen

## Monitoring & Analytics

```javascript
// Track wichtige Events
console.log('[VOTING] Event:', {
  action: 'vote|unvote|submit|view',
  topicId: id,
  userId: email,
  timestamp: new Date().toISOString()
});
```

## Admin Dashboard Erweiterung

In `/admin/index.html` neuer Tab für Voting-Resultate:
- Top 6 Themen highlighten
- Export als CSV
- Themen moderieren (löschen/editieren)
- Voting-Phase steuern (open/locked/closed)

## Success Metrics

- **Engagement**: >50% der angemeldeten User voten
- **Vielfalt**: >20 verschiedene Themen vorgeschlagen
- **Qualität**: Top 6 Themen bekommen je >10 Votes
- **Performance**: Widget lädt in <500ms
- **Mobile**: 40% Usage von Mobile Devices

## Deployment Checklist

- [ ] Environment Variables gesetzt (JWT_SECRET)
- [ ] Redis Keys mit Prefix "voting:kinn-6:"
- [ ] Auth-Token Validierung funktioniert
- [ ] CORS Headers korrekt
- [ ] Error Logging aktiviert
- [ ] Mobile Testing abgeschlossen
- [ ] Admin kann Voting-Phase ändern
- [ ] Seed Data nur in Development

## Notes zur Integration

- Widget nutzt bestehende Auth-Infrastruktur (kein neues Token-System)
- Styling 100% KINN Brand konform (keine Emojis!)
- Performance: Lazy Loading des Widgets (nicht auf Hauptseite)
- Wiederverwendbare Components für zukünftige Votings
- API generisch genug für KINN #7, #8, etc.

## Offene Fragen für Klärung

1. **Moderation**: Sollen Topics vor Anzeige geprüft werden?
2. **Notifications**: Email wenn eigenes Topic viele Votes bekommt?
3. **Gamification**: Badges für aktive Voter?
4. **Historie**: Alte Votings archivieren und anzeigen?
5. **Export**: Resultate als PDF für Event-Doku?