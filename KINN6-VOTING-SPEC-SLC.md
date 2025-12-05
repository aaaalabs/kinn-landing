# KINN #6 Voting Widget - SLC Implementation

> **SLC = Simple, Lovable, Complete**
> *"The best implementations feel inevitable."* - Jony Ive

## Was wir bauen

Ein minimales Voting-Widget wo KINN'der Themen vorschlagen und upvoten können.
Die Top 6 werden Thementische bei KINN #6.

**User Story:**
*"Als KINN'der will ich Themen vorschlagen und sehen was andere interessiert."*

## Technische Entscheidungen

- **Auth**: Bestehende JWT Tokens (30 Tage)
- **Storage**: Redis Array - that's it
- **Frontend**: 150 Zeilen Vanilla JS
- **Updates**: 5-Sekunden Polling
- **Moderation**: Keine - Community-Vertrauen

## Datenmodell (Ultra-Simple)

```javascript
// Ein Topic
{
  id: "topic-1733424523456",
  title: "Voice AI für KMU",
  authorEmail: "martin@example.com",
  authorName: "Martin",
  votes: 14,
  voterEmails: ["martin@example.com", "anna@example.com", ...],
  createdAt: "2024-12-05T18:00:00Z"
}

// Redis: Ein einziger Key
"voting:kinn-6:topics" → Array<Topic>
```

## API Endpoints (Nur 3)

```javascript
// 1. Topics holen
GET /api/voting/topics
Headers: Authorization: Bearer {token}
Response: {
  topics: Topic[],
  userVotes: string[] // Topic IDs die der User gevotet hat
}

// 2. Topic erstellen
POST /api/voting/topics
Headers: Authorization: Bearer {token}
Body: { title: "Mein Thema" }
Response: { topic: Topic }

// 3. Vote togglen
POST /api/voting/toggle
Headers: Authorization: Bearer {token}
Body: { topicId: "topic-123" }
Response: { voted: boolean, voteCount: number }
```

## Frontend Widget

### HTML Struktur
```html
<div class="voting-widget">
  <header>
    <h3>Themen für KINN #6</h3>
    <span class="total">47 Votes</span>
  </header>

  <div class="topics">
    <!-- Topic Cards -->
  </div>

  <form class="add-topic">
    <input type="text" placeholder="Neues Thema..." maxlength="80">
    <button type="submit">+</button>
  </form>
</div>
```

### CSS (KINN Brand)
```css
.voting-widget {
  max-width: 400px;
  font-family: 'Work Sans', sans-serif;
}

.topic-card {
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.topic-card.voted {
  background: rgba(94, 217, 166, 0.08);
  border: 1px solid rgba(94, 217, 166, 0.3);
}

.topic-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
```

### JavaScript (Komplett)
```javascript
// voting-widget.js
export function initVotingWidget(container, token) {
  let topics = [];
  let userVotes = new Set();

  // Fetch & Render
  async function refresh() {
    try {
      const res = await fetch('/api/voting/topics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      topics = data.topics;
      userVotes = new Set(data.userVotes);
      render();
    } catch (e) {
      console.error('[VOTING]', e);
    }
  }

  // Toggle Vote
  async function toggleVote(topicId) {
    // Optimistic Update
    const wasVoted = userVotes.has(topicId);
    if (wasVoted) {
      userVotes.delete(topicId);
      topics.find(t => t.id === topicId).votes--;
    } else {
      userVotes.add(topicId);
      topics.find(t => t.id === topicId).votes++;
    }
    render();

    // Server Sync
    try {
      const res = await fetch('/api/voting/toggle', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ topicId })
      });
      const data = await res.json();
      topics.find(t => t.id === topicId).votes = data.voteCount;
      render();
    } catch (e) {
      // Revert on error
      if (wasVoted) {
        userVotes.add(topicId);
        topics.find(t => t.id === topicId).votes++;
      } else {
        userVotes.delete(topicId);
        topics.find(t => t.id === topicId).votes--;
      }
      render();
    }
  }

  // Add Topic
  async function addTopic(title) {
    if (!title.trim()) return;

    try {
      const res = await fetch('/api/voting/topics', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      topics.unshift(data.topic);
      userVotes.add(data.topic.id);
      render();
      document.querySelector('.add-topic input').value = '';
    } catch (e) {
      console.error('[VOTING]', e);
    }
  }

  // Render
  function render() {
    const sorted = [...topics].sort((a, b) => b.votes - a.votes);
    const total = sorted.reduce((sum, t) => sum + t.votes, 0);

    container.innerHTML = `
      <div class="voting-widget">
        <header>
          <h3>Themen für KINN #6</h3>
          <span class="total">${total} Votes</span>
        </header>

        <div class="topics">
          ${sorted.map(topic => `
            <div class="topic-card ${userVotes.has(topic.id) ? 'voted' : ''}"
                 onclick="votingWidget.toggle('${topic.id}')">
              <div>
                <div class="title">${topic.title}</div>
                <div class="author">${topic.authorName}</div>
              </div>
              <div class="votes">${topic.votes}</div>
            </div>
          `).join('')}
          ${!sorted.length ? '<p class="empty">Sei der Erste!</p>' : ''}
        </div>

        <form class="add-topic" onsubmit="votingWidget.add(event)">
          <input type="text" placeholder="Neues Thema..." maxlength="80">
          <button type="submit">+</button>
        </form>
      </div>
    `;
  }

  // Public API
  window.votingWidget = {
    toggle: toggleVote,
    add: (e) => {
      e.preventDefault();
      addTopic(e.target.querySelector('input').value);
    }
  };

  // Start
  refresh();
  setInterval(refresh, 5000);
}
```

## Backend Implementation

### `/api/voting/topics.js`
```javascript
import { verifyAuthToken } from '../utils/tokens.js';
import { getRedisClient } from '../utils/redis.js';

const redis = getRedisClient();
const TOPICS_KEY = 'voting:kinn-6:topics';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  const email = verifyAuthToken(token);
  if (!email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Get all topics
    const topics = await redis.json.get(TOPICS_KEY, '$') || [];
    const userVotes = topics
      .filter(t => t.voterEmails.includes(email))
      .map(t => t.id);

    return res.json({ topics, userVotes });
  }

  if (req.method === 'POST') {
    // Create new topic
    const { title } = req.body;

    if (!title?.trim() || title.length > 80) {
      return res.status(400).json({ error: 'Invalid title' });
    }

    // Get user name from profile
    const profile = await redis.json.get(`profile:${email}`, '$');
    const authorName = profile?.identity?.name || email.split('@')[0];

    const topic = {
      id: `topic-${Date.now()}`,
      title: title.trim(),
      authorEmail: email,
      authorName,
      votes: 1,
      voterEmails: [email],
      createdAt: new Date().toISOString()
    };

    // Add to Redis
    const topics = await redis.json.get(TOPICS_KEY, '$') || [];
    topics.push(topic);
    await redis.json.set(TOPICS_KEY, '$', topics);

    return res.json({ topic });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

### `/api/voting/toggle.js`
```javascript
import { verifyAuthToken } from '../utils/tokens.js';
import { getRedisClient } from '../utils/redis.js';

const redis = getRedisClient();
const TOPICS_KEY = 'voting:kinn-6:topics';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  const email = verifyAuthToken(token);
  if (!email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { topicId } = req.body;
  if (!topicId) {
    return res.status(400).json({ error: 'Topic ID required' });
  }

  // Get topics
  const topics = await redis.json.get(TOPICS_KEY, '$') || [];
  const topicIndex = topics.findIndex(t => t.id === topicId);

  if (topicIndex === -1) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  const topic = topics[topicIndex];
  const wasVoted = topic.voterEmails.includes(email);

  if (wasVoted) {
    // Remove vote
    topic.voterEmails = topic.voterEmails.filter(e => e !== email);
    topic.votes--;
  } else {
    // Add vote
    topic.voterEmails.push(email);
    topic.votes++;
  }

  // Save to Redis
  await redis.json.set(TOPICS_KEY, '$', topics);

  return res.json({
    voted: !wasVoted,
    voteCount: topic.votes
  });
}
```

## Integration in Profile Page

In `/pages/profil.html` einen neuen Tab hinzufügen:

```html
<!-- Tab Button -->
<button class="tab-button" onclick="showTab('kinn6')">KINN #6</button>

<!-- Tab Content -->
<div class="tab-content" id="kinn6-content" style="display:none;">
  <div id="voting-container"></div>
</div>

<script type="module">
  // Load widget when tab is shown
  window.loadVoting = async () => {
    const { initVotingWidget } = await import('/js/voting-widget.js');
    const container = document.getElementById('voting-container');
    const token = localStorage.getItem('authToken');
    initVotingWidget(container, token);
  };
</script>
```

## Seed Data (Optional für Demo)

```javascript
// Einmalig in Redis Console ausführen
const seedTopics = [
  {
    id: "topic-seed-1",
    title: "Voice AI für KMU - Telefon-Bots die funktionieren",
    authorEmail: "demo@kinn.at",
    authorName: "Demo User",
    votes: 14,
    voterEmails: ["demo@kinn.at"],
    createdAt: new Date().toISOString()
  },
  // ... mehr Topics
];

await redis.json.set('voting:kinn-6:topics', '$', seedTopics);
```

## Testing Checklist

- [ ] User kann Topic erstellen
- [ ] User kann voten/unvoten
- [ ] Topics sortieren nach Votes
- [ ] Updates alle 5 Sekunden
- [ ] Funktioniert auf Mobile
- [ ] Max 80 Zeichen pro Topic

## Was wir NICHT bauen

❌ Rate Limiting
❌ Moderation
❌ Export Features
❌ Email Notifications
❌ History/Archive
❌ Admin Panel
❌ Offline Support
❌ WebSockets
❌ Gamification

## Deployment

```bash
# Lokal testen
vercel dev

# Deploy
vercel --prod
```

## Zeit-Estimate

- Backend: 2 Stunden ✅
- Frontend: 2 Stunden ✅
- Integration: 1 Stunde ✅
- **Total: 5 Stunden**

---

*"Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away."* - Antoine de Saint-Exupéry