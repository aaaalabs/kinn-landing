# Redis Schema Optimierung - Detaillierter Plan

**Ziel:** Effiziente, konsistente und skalierbare Datenstruktur für KINN User-Matching

**Status:** Breaking Changes OK - Datenstruktur muss optimal sein (SLC Principle)

---

## 📊 IST-Zustand Analyse

### Aktuelle Datenstruktur

```
┌─────────────────────────────────────────────────────────┐
│ Profile Data (JSON Storage)                            │
├─────────────────────────────────────────────────────────┤
│ profile:{email} → {                                     │
│   email: "user@example.com",                            │
│   identity: {                                           │
│     name, linkedIn, github, portfolio,                  │
│     location: "ibk" | "tirol" | "remote" | "hybrid"    │
│   },                                                    │
│   supply: {                                             │
│     skills: ["python", "react", ...],                   │
│     experience: "junior" | "mid" | "senior" | "lead",   │
│     availability: "employed" | "freelancer" | ...,      │
│     canOffer: ["mentoring", "code-review", ...]         │
│   },                                                    │
│   demand: {                                             │
│     seeking: ["job", "freelance", ...],                 │
│     activeSearch: true | false,                         │
│     interests: "..."                                    │
│   },                                                    │
│   preferences: { ... }                                  │
│ }                                                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Reverse Indexes (Sets für schnelles Matching)          │
├─────────────────────────────────────────────────────────┤
│ skill:python           → Set{user1@, user2@, ...}      │
│ skill:react            → Set{user1@, user3@, ...}      │
│ demand:job             → Set{user2@, user4@, ...}      │
│ demand:freelance       → Set{user1@, ...}              │
│ supply:mentoring       → Set{user3@, ...}              │
│ supply:code-review     → Set{user1@, user3@, ...}      │
│ supply:senior+         → Set{user1@, user3@, ...}      │ ⚠️
│ location:ibk           → Set{user1@, user2@, ...}      │ ⚠️
│ location:remote        → Set{user3@, ...}              │ ⚠️
└─────────────────────────────────────────────────────────┘
```

---

## 🚨 Identifizierte Probleme

### Problem 1: Inkonsistente Namenskonvention

```
✅ skill:python           // Kategorie:Wert
❌ supply:senior+         // "senior+" ist KEIN "supply offer"!
                          // Experience Level != Supply Offer
                          // Sollte sein: experience:senior+

✅ supply:mentoring       // DAS ist ein Offer
❌ supply:senior+         // DAS ist Experience Level
```

**Warum problematisch:**
- Vermischt zwei verschiedene Konzepte (Experience vs. Offers)
- "supply" wird für zwei Dinge verwendet
- Nicht intuitiv querybar

---

### Problem 2: Fehlende Granularität

```
Aktuell indexed:
  supply:senior+  → Set{user1@, user2@, ...}  // Nur Gruppe!

NICHT indexed:
  - experience:junior   ❌ "Finde alle Junior Devs" → UNMÖGLICH!
  - experience:mid      ❌ "Finde alle Mid-Level"   → UNMÖGLICH!
  - experience:senior   ❌ Nur als Teil von "senior+"
  - experience:lead     ❌ Nur als Teil von "senior+"
```

**Use Cases die NICHT funktionieren:**
```javascript
// ❌ "Finde alle Junior Devs die Learning suchen"
// ❌ "Finde alle Mid-Level mit Python"
// ❌ "Finde nur Lead Devs"
```

---

### Problem 3: Fehlende Indexes

**Aktuell NICHT indexed:**
- ❌ Experience Level (außer `senior+` Gruppe)
- ❌ Availability (employed, freelancer, student, ...)
- ❌ ActiveSearch Level (active, passive, networking-only)

**Beispiel:**
```javascript
// User Profil:
availability: "freelancer"
activeSearch: "active"

// In Redis:
// ❌ Keine Index-Einträge für diese Werte!

// Query "Finde aktiv suchende Freelancer" → UNMÖGLICH!
```

---

### Problem 4: Keine Cleanup-Logik

```
┌──────────────────────────────────────────────────────────┐
│ Szenario: User ändert Skills                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Alte Skills: ["Python", "React"]                         │
│   → skill:python  = {user@, ...}                         │
│   → skill:react   = {user@, ...}                         │
│                                                          │
│ User updated zu: ["TypeScript", "Go"]                    │
│   → skill:typescript = {user@, ...}  ✅ ADDED            │
│   → skill:go         = {user@, ...}  ✅ ADDED            │
│   → skill:python     = {user@, ...}  ❌ NICHT ENTFERNT!  │
│   → skill:react      = {user@, ...}  ❌ NICHT ENTFERNT!  │
│                                                          │
│ Problem: Ghost-Einträge!                                 │
│ User wird bei "Python" Suche gefunden, obwohl er         │
│ Python gar nicht mehr in Skills hat!                     │
└──────────────────────────────────────────────────────────┘
```

**Code (aktuell):**
```javascript
// api/utils/redis.js, Zeile 290-295
if (profile.supply?.skills && Array.isArray(profile.supply.skills)) {
  for (const skill of profile.supply.skills) {
    await redis.sadd(`skill:${skill.toLowerCase()}`, normalizedEmail);
    // ⚠️ Nur SADD, kein SREM für alte Skills!
  }
}
```

---

### Problem 5: Hardcoded Legacy Values

**Code-Beispiel (redis.js, Zeile 349):**
```javascript
if (locationMatches > 1 && profile.identity.location === 'ibk') {
  hints.push(`${locationMatches - 1} AI Devs in Innsbruck`);
}
```

**Probleme:**
- ❌ Hardcoded Check für alten Wert `"ibk"`
- ❌ Neue Werte (`in-person`, `online`, `all`) werden nicht erkannt
- ❌ Match-Hint erscheint nur für Legacy-User

**Migration-Mapping:**
```
Old Values          New Values
──────────────────────────────
ibk, tirol       →  in-person
remote           →  online
hybrid           →  all
```

---

## ✨ SOLL-Zustand: Optimale Datenstruktur

### Neue Architektur - Konsistente Kategorien

```
┌──────────────────────────────────────────────────────────────┐
│ PROFILE DATA (JSON) - Bleibt weitgehend gleich              │
├──────────────────────────────────────────────────────────────┤
│ profile:{email} → {                                          │
│   email: "user@example.com",                                 │
│   identity: {                                                │
│     name, linkedIn, github, portfolio,                       │
│     location: "in-person" | "online" | "all"  ← NEUE VALUES │
│   },                                                         │
│   supply: {                                                  │
│     skills: ["python", "react", ...],                        │
│     experience: "junior" | "mid" | "senior" | "lead",        │
│     availability: "employed" | "freelancer" | ...,           │
│     canOffer: ["mentoring", "code-review", ...]              │
│   },                                                         │
│   demand: {                                                  │
│     seeking: ["job", "freelance", "learning", ...],          │
│     activeSearch: "active" | "passive" | "networking-only",  │
│                   ← STRING statt Boolean!                    │
│     interests: "..."                                         │
│   },                                                         │
│   preferences: { ... },                                      │
│   createdAt, updatedAt                                       │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ REVERSE INDEXES (Sets) - NEUE STRUKTUR                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Category 1: Location (Event Preference)               │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ location:in-person  → Set{user1@, user2@, ...}        │  │
│ │ location:online     → Set{user3@, ...}                │  │
│ │ location:all        → Set{user4@, user5@, ...}        │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Category 2: Experience Level (GRANULAR!)              │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ experience:junior   → Set{user2@, user5@, ...}        │  │
│ │ experience:mid      → Set{user1@, user4@, ...}        │  │
│ │ experience:senior   → Set{user3@, user6@, ...}        │  │
│ │ experience:lead     → Set{user7@, ...}                │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Category 3: Availability (Current Situation)          │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ availability:employed      → Set{user1@, user3@, ...} │  │
│ │ availability:freelancer    → Set{user2@, ...}         │  │
│ │ availability:student       → Set{user5@, ...}         │  │
│ │ availability:between-jobs  → Set{user6@, ...}         │  │
│ │ availability:side-projects → Set{user4@, ...}         │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Category 4: Skills (What I CAN do)                    │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ skill:python            → Set{user1@, user2@, ...}    │  │
│ │ skill:react             → Set{user1@, user3@, ...}    │  │
│ │ skill:machine-learning  → Set{user2@, ...}            │  │
│ │ ... (95 skills total)                                 │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Category 5: Offers (What I OFFER to share)            │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ offer:mentoring     → Set{user1@, user3@, ...}        │  │
│ │ offer:code-review   → Set{user1@, user4@, ...}        │  │
│ │ offer:workshop      → Set{user3@, ...}                │  │
│ │ offer:projects      → Set{user2@, user4@, ...}        │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Category 6: Seeking (What I'm LOOKING for)            │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ seeking:job           → Set{user2@, user6@, ...}      │  │
│ │ seeking:freelance     → Set{user1@, user4@, ...}      │  │
│ │ seeking:cofounder     → Set{user3@, ...}              │  │
│ │ seeking:collaboration → Set{user1@, user5@, ...}      │  │
│ │ seeking:learning      → Set{user5@, ...}              │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Category 7: Search Intensity                          │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ search:active          → Set{user2@, user6@, ...}     │  │
│ │ search:passive         → Set{user1@, user4@, ...}     │  │
│ │ search:networking-only → Set{user3@, user5@, ...}     │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ INDEXED STATE (für Cleanup) - NEU!                          │
├──────────────────────────────────────────────────────────────┤
│ profile:{email}:indexed → {                                  │
│   skills: ["python", "react"],                               │
│   experience: "senior",                                      │
│   availability: "freelancer",                                │
│   canOffer: ["mentoring"],                                   │
│   seeking: ["collaboration"],                                │
│   activeSearch: "passive",                                   │
│   location: "in-person"                                      │
│ }                                                            │
│                                                              │
│ → Snapshot der indexed Values                               │
│ → Verwendet für SREM bei Updates                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Verbesserungen im Detail

### 1. Konsistente Namenskonvention

**Regel:** `{category}:{value}` - IMMER!

```
VORHER (inkonsistent):
  skill:python        ✅ category:value
  demand:job          ✅ category:value
  supply:mentoring    ✅ category:value
  supply:senior+      ❌ senior+ ist kein "supply"!

NACHHER (konsistent):
  skill:python        ✅ category:value
  seeking:job         ✅ category:value (renamed from "demand")
  offer:mentoring     ✅ category:value (renamed from "supply")
  experience:senior   ✅ category:value (NEW!)
  experience:lead     ✅ category:value (NEW!)
```

**Benefits:**
- Selbsterklärend
- Keine Spezialfälle
- Einfach zu querien

---

### 2. Vollständige Granularität

**VORHER:**
```
supply:senior+  → Set{senior devs + lead devs}  // Nur Gruppe

Query: "Finde alle Junior Devs"
→ ❌ UNMÖGLICH! Kein Index vorhanden.
```

**NACHHER:**
```
experience:junior  → Set{...}
experience:mid     → Set{...}
experience:senior  → Set{...}
experience:lead    → Set{...}

Query: "Finde alle Junior Devs"
→ ✅ redis.smembers('experience:junior')

Query: "Finde Senior+ Devs" (Gruppe on-the-fly)
→ ✅ redis.sunion('experience:senior', 'experience:lead')
```

**Principle:** Index JEDE mögliche Query, nicht nur Gruppen!

---

### 3. Klare Semantik: offer vs seeking

**Verwirrung vermeiden:**

```
VORHER:
  demand:job          // "Ich suche einen Job"
  supply:mentoring    // "Ich biete Mentoring an"

  → demand/supply sind abstrakt
  → nicht sofort klar was "demand" vs "supply" ist

NACHHER:
  seeking:job         // "Ich suche einen Job"      ← KLAR!
  offer:mentoring     // "Ich biete Mentoring an"   ← KLAR!

  → seeking/offer sind selbsterklärend
  → Matching-Logic wird intuitiv
```

**Matching wird explizit:**
```javascript
// User sucht Learning → Match mit Mentoring-Angeboten
if (seeking:learning) {
  const matches = await redis.smembers('offer:mentoring');
}
```

---

### 4. Cleanup-Mechanismus

**Problem: Ghost Entries**

```
┌────────────────────────────────────────────────────┐
│ User A hat Skills: ["Python", "React"]             │
│   skill:python  = {userA@, ...}                    │
│   skill:react   = {userA@, ...}                    │
├────────────────────────────────────────────────────┤
│ User A updated zu: ["TypeScript", "Go"]            │
│                                                    │
│ OHNE Cleanup:                                      │
│   skill:python     = {userA@, ...}  ← GHOST!       │
│   skill:react      = {userA@, ...}  ← GHOST!       │
│   skill:typescript = {userA@, ...}  ✅             │
│   skill:go         = {userA@, ...}  ✅             │
│                                                    │
│ MIT Cleanup:                                       │
│   skill:python     = {...}          ← ENTFERNT!    │
│   skill:react      = {...}          ← ENTFERNT!    │
│   skill:typescript = {userA@, ...}  ✅             │
│   skill:go         = {userA@, ...}  ✅             │
└────────────────────────────────────────────────────┘
```

**Lösung: State Tracking**

```javascript
// 1. Speichere "indexed state" pro User
"profile:userA@:indexed" → {
  skills: ["python", "react"],
  experience: "mid",
  ...
}

// 2. Bei Update: Load old state
const oldState = await redis.get('profile:userA@:indexed');
// → { skills: ["python", "react"], ... }

// 3. Compare old vs new
const removedSkills = ["python", "react"] - ["typescript", "go"]
// → ["python", "react"]

// 4. SREM from old indexes
for (const skill of ["python", "react"]) {
  await redis.srem(`skill:${skill}`, 'userA@');
}

// 5. SADD to new indexes
for (const skill of ["typescript", "go"]) {
  await redis.sadd(`skill:${skill}`, 'userA@');
}

// 6. Save new state
await redis.set('profile:userA@:indexed', {
  skills: ["typescript", "go"],
  ...
});
```

---

### 5. Vollständige Index-Abdeckung

**VORHER (indexed):**
- ✅ Skills
- ✅ Seeking (als "demand")
- ✅ Offers (als "supply")
- ✅ Location
- ⚠️ Experience (nur `senior+` Gruppe)
- ❌ Availability
- ❌ ActiveSearch

**NACHHER (indexed):**
- ✅ Skills
- ✅ Seeking
- ✅ Offers
- ✅ Location
- ✅ Experience (ALLE Levels granular)
- ✅ Availability (NEU!)
- ✅ Search Intensity (NEU!)

**Result:** JEDE Query-Kombination wird möglich!

---

## 🔍 Matching Examples (Vorher vs. Nachher)

### Example 1: "Junior Devs die Learning suchen"

**VORHER:**
```javascript
// ❌ UNMÖGLICH!
// Kein Index für experience:junior
// Müsste alle Profile laden und in App filtern:
const allProfiles = await getAllProfiles();
const juniors = allProfiles.filter(p =>
  p.supply?.experience === 'junior' &&
  p.demand?.seeking?.includes('learning')
);
// → Sehr langsam bei vielen Usern!
```

**NACHHER:**
```javascript
// ✅ Redis-native Set-Operation (ultra-schnell)
const juniors = await redis.sinter(
  'experience:junior',
  'seeking:learning'
);
// → [userA@, userB@, ...]
// → Millisekunden statt Sekunden!
```

---

### Example 2: "Senior Python Devs in Tirol die Mentoring anbieten"

**VORHER:**
```javascript
// ⚠️ Teilweise möglich, aber umständlich
const pythonDevs = await redis.smembers('skill:python');
const seniorPlus = await redis.smembers('supply:senior+');
const inPerson = await redis.smembers('location:ibk'); // ❌ Hardcoded!
const mentors = await redis.smembers('supply:mentoring');

// App-side Intersection:
const result = pythonDevs
  .filter(e => seniorPlus.includes(e))
  .filter(e => inPerson.includes(e))
  .filter(e => mentors.includes(e));
// → Langsam, alle Sets müssen geladen werden
```

**NACHHER:**
```javascript
// ✅ Redis-native Intersection (ultra-schnell)
const result = await redis.sinter(
  'skill:python',
  'experience:senior',       // ← Granular!
  'location:in-person',      // ← Neue Values!
  'offer:mentoring'          // ← Klare Semantik!
);
// → [userX@, userY@]
// → Redis macht alles server-side!
```

---

### Example 3: "Aktiv suchende Freelancer mit React"

**VORHER:**
```javascript
// ❌ UNMÖGLICH!
// Kein Index für availability:freelancer
// Kein Index für activeSearch:active

// Müsste so implementiert werden:
const reactDevs = await redis.smembers('skill:react');
const profiles = await Promise.all(
  reactDevs.map(email => getProfile(email))
);
const result = profiles.filter(p =>
  p.supply?.availability === 'freelancer' &&
  p.demand?.activeSearch === true  // Boolean!
);
// → Sehr ineffizient!
```

**NACHHER:**
```javascript
// ✅ Redis-native, simpel
const result = await redis.sinter(
  'skill:react',
  'availability:freelancer',  // ← NEU!
  'search:active'             // ← NEU!
);
// → Instant!
```

---

### Example 4: Gruppen on-the-fly (Mid+ Devs)

**NACHHER:**
```javascript
// "Finde alle Mid-Level oder höher"
const midPlus = await redis.sunion(
  'experience:mid',
  'experience:senior',
  'experience:lead'
);

// Kombiniert mit anderen Filtern:
const midPlusPython = await redis.sinter(
  await redis.sunion('experience:mid', 'experience:senior', 'experience:lead'),
  'skill:python'
);
```

**Flexibility:** Gruppen bei Bedarf bilden, nicht vorab hardcoden!

---

## 📐 Schema Comparison Table

| Kategorie | OLD Key | NEW Key | Improvement |
|-----------|---------|---------|-------------|
| **Experience** | `supply:senior+` (nur Gruppe) | `experience:junior`<br>`experience:mid`<br>`experience:senior`<br>`experience:lead` | ✅ Granular queryable |
| **Availability** | ❌ Nicht indexed | `availability:employed`<br>`availability:freelancer`<br>`availability:student`<br>`availability:between-jobs`<br>`availability:side-projects` | ✅ Neue Queries möglich |
| **Search Intensity** | ❌ Nicht indexed | `search:active`<br>`search:passive`<br>`search:networking-only` | ✅ Intention trackbar |
| **Location** | `location:ibk`<br>`location:remote`<br>`location:hybrid` | `location:in-person`<br>`location:online`<br>`location:all` | ✅ Klare Semantik |
| **Seeking** | `demand:job`<br>`demand:freelance` | `seeking:job`<br>`seeking:freelance`<br>`seeking:learning`<br>... | ✅ Selbsterklärend |
| **Offers** | `supply:mentoring`<br>`supply:code-review` | `offer:mentoring`<br>`offer:code-review`<br>... | ✅ Klare Semantik |
| **Skills** | `skill:python`<br>`skill:react` | `skill:python`<br>`skill:react` | ✅ Bleibt gleich |

---

## 🚀 Migration Strategy

### Phase 1: Code Deployment (Dual Write)

**Ziel:** Neue Struktur aufbauen ohne Alte zu brechen

```javascript
// updateReverseIndexes() schreibt in BEIDE Strukturen

// OLD (für Backward Compatibility)
await redis.sadd('supply:senior+', email);
await redis.sadd('demand:job', email);

// NEW (neue Struktur)
await redis.sadd('experience:senior', email);
await redis.sadd('seeking:job', email);
```

**Duration:** 1 Deploy

---

### Phase 2: Data Migration Script

**Ziel:** Alle existierenden Profile in neue Struktur migrieren

```javascript
// Migration Script
const subscribers = await redis.smembers('subscribers:confirmed');

for (const email of subscribers) {
  const profile = await redis.get(`profile:${email}`);
  if (profile) {
    // Schreibt in neue Struktur + erstellt indexed state
    await updateReverseIndexes(email, profile);
  }
}

console.log(`Migrated ${subscribers.length} profiles`);
```

**Duration:** Einmaliger Run (ca. 1-2 Sekunden für 100 User)

---

### Phase 3: Cleanup Old Indexes

**Ziel:** Alte Keys löschen

```javascript
// Liste aller alten Keys
const oldKeys = [
  'supply:senior+',
  'location:ibk',
  'location:tirol',
  'location:remote',
  'location:hybrid',
  // ... weitere alte Keys
];

for (const key of oldKeys) {
  await redis.del(key);
}
```

**Duration:** Einmaliger Run

---

### Phase 4: Code Cleanup

**Ziel:** Dual-Write entfernen, nur noch neue Struktur

```javascript
// Entferne alle Backward-Compat Code
// Nur noch:
await redis.sadd('experience:senior', email);
await redis.sadd('seeking:job', email);
// Kein Dual-Write mehr
```

**Duration:** 1 Deploy

---

## 💻 Code Changes Preview

### File: `api/utils/redis.js`

#### Neue Funktion: `updateReverseIndexes()` (mit Cleanup)

```javascript
/**
 * Updates reverse indexes with cleanup of old values
 * @param {string} email - User email
 * @param {Object} profile - Full profile object
 */
export async function updateReverseIndexes(email, profile) {
  const normalizedEmail = email.toLowerCase();

  // 1. Load previous indexed state
  const prevKey = `profile:${normalizedEmail}:indexed`;
  const prevState = await redis.get(prevKey);
  const oldState = prevState || {};

  // 2. Build new state
  const newState = {
    skills: profile.supply?.skills || [],
    experience: profile.supply?.experience || null,
    availability: profile.supply?.availability || null,
    canOffer: profile.supply?.canOffer || [],
    seeking: profile.demand?.seeking || [],
    activeSearch: profile.demand?.activeSearch || null,
    location: profile.identity?.location || null
  };

  // 3. Cleanup: Remove from old indexes
  await cleanupOldIndexes(normalizedEmail, oldState, newState);

  // 4. Add to new indexes
  await addToNewIndexes(normalizedEmail, newState);

  // 5. Save new indexed state
  await redis.set(prevKey, JSON.stringify(newState));

  console.log('[REDIS] Indexes updated with cleanup:', normalizedEmail);
}

/**
 * Helper: Remove email from changed indexes
 */
async function cleanupOldIndexes(email, oldState, newState) {
  // Experience
  if (oldState.experience && oldState.experience !== newState.experience) {
    await redis.srem(`experience:${oldState.experience}`, email);
  }

  // Skills (array diff)
  const removedSkills = (oldState.skills || [])
    .filter(s => !newState.skills.includes(s));
  for (const skill of removedSkills) {
    await redis.srem(`skill:${skill.toLowerCase()}`, email);
  }

  // Availability
  if (oldState.availability && oldState.availability !== newState.availability) {
    await redis.srem(`availability:${oldState.availability}`, email);
  }

  // Offers
  const removedOffers = (oldState.canOffer || [])
    .filter(o => !newState.canOffer.includes(o));
  for (const offer of removedOffers) {
    await redis.srem(`offer:${offer.toLowerCase()}`, email);
  }

  // Seeking
  const removedSeeking = (oldState.seeking || [])
    .filter(s => !newState.seeking.includes(s));
  for (const seek of removedSeeking) {
    await redis.srem(`seeking:${seek.toLowerCase()}`, email);
  }

  // Search intensity
  if (oldState.activeSearch && oldState.activeSearch !== newState.activeSearch) {
    await redis.srem(`search:${oldState.activeSearch}`, email);
  }

  // Location
  if (oldState.location && oldState.location !== newState.location) {
    await redis.srem(`location:${oldState.location}`, email);
  }
}

/**
 * Helper: Add email to new indexes
 */
async function addToNewIndexes(email, state) {
  // Experience
  if (state.experience) {
    await redis.sadd(`experience:${state.experience}`, email);
  }

  // Skills
  for (const skill of state.skills) {
    await redis.sadd(`skill:${skill.toLowerCase()}`, email);
  }

  // Availability
  if (state.availability) {
    await redis.sadd(`availability:${state.availability}`, email);
  }

  // Offers
  for (const offer of state.canOffer) {
    await redis.sadd(`offer:${offer.toLowerCase()}`, email);
  }

  // Seeking
  for (const seek of state.seeking) {
    await redis.sadd(`seeking:${seek.toLowerCase()}`, email);
  }

  // Search intensity
  if (state.activeSearch) {
    await redis.sadd(`search:${state.activeSearch}`, email);
  }

  // Location
  if (state.location) {
    await redis.sadd(`location:${state.location}`, email);
  }
}
```

---

### File: `CLAUDE.md` - Schema Documentation Update

```markdown
## Redis Data Structure

### Profile Data (JSON)
"profile:{email}" → {
  email,
  identity: {
    name, linkedIn, github, portfolio,
    location: "in-person" | "online" | "all"
  },
  supply: {
    skills: [],
    experience: "junior" | "mid" | "senior" | "lead",
    availability: "employed" | "freelancer" | "student" | "between-jobs" | "side-projects",
    canOffer: ["mentoring", "code-review", "workshop", "projects"]
  },
  demand: {
    seeking: ["job", "freelance", "cofounder", "collaboration", "learning"],
    activeSearch: "active" | "passive" | "networking-only",
    interests: string
  },
  preferences: { ... }
}

### Reverse Indexes (for fast matching)
"location:{location}"        → Set<email>  // in-person, online, all
"experience:{level}"         → Set<email>  // junior, mid, senior, lead
"availability:{status}"      → Set<email>  // employed, freelancer, student, etc.
"skill:{skill}"              → Set<email>  // python, react, etc.
"offer:{type}"               → Set<email>  // mentoring, code-review, workshop, projects
"seeking:{type}"             → Set<email>  // job, freelance, cofounder, collaboration, learning
"search:{intensity}"         → Set<email>  // active, passive, networking-only

### Indexed State (for cleanup)
"profile:{email}:indexed" → {
  skills: [],
  experience: "",
  availability: "",
  canOffer: [],
  seeking: [],
  activeSearch: "",
  location: ""
}
```

---

## 📊 Benefits Summary

| Aspect | Before | After | Impact |
|--------|--------|-------|--------|
| **Consistency** | Mixed naming (`supply:senior+`) | Always `category:value` | ✅ Self-documenting |
| **Granularity** | Groups only (`senior+`) | Every value indexed | ✅ All queries possible |
| **Coverage** | 4/7 fields indexed | 7/7 fields indexed | ✅ Complete |
| **Accuracy** | Ghost entries (no cleanup) | Full cleanup on update | ✅ Accurate matches |
| **Performance** | App-side filtering needed | Pure Redis set ops | ✅ 10-100x faster |
| **Semantics** | `demand`/`supply` abstract | `seeking`/`offer` clear | ✅ Intuitive |
| **Maintainability** | Hardcoded checks (`ibk`) | Data-driven | ✅ Flexible |

---

## 🎯 Nächste Schritte

1. **Review dieses Plans** - Feedback/Fragen/Änderungen?
2. **Migration Script schreiben** - `scripts/migrate-redis-schema.js`
3. **Code Updates** - `api/utils/redis.js` refactoren
4. **Testing** - Lokales Testing mit Sample-Daten
5. **Deploy Phase 1** - Dual Write aktivieren
6. **Run Migration** - Einmalig alle User migrieren
7. **Deploy Phase 2** - Alte Struktur entfernen

---

## ❓ Offene Fragen

1. **Backward Compatibility:** Sollen alte Profile-Werte automatisch migriert werden?
   - `location: "ibk"` → `location: "in-person"`
   - `activeSearch: true` → `activeSearch: "active"`

2. **Legacy Keys:** Alte Keys sofort löschen oder für Audit behalten?

3. **Match Hints:** `getMatchHints()` komplett neu schreiben mit neuen Indexes?

4. **Admin Dashboard:** Redis-Inspector für neue Struktur?

---

**Status:** Ready for Implementation 🚀
**Breaking Changes:** Yes, but worth it! (SLC Principle)
**Estimated Effort:** 4-6 hours (Code + Testing + Migration)
