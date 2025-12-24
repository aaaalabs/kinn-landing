# Coding Agent System Prompt
## KINN Dashboard: KI Praxis Report 2026 - Subtle Teaser Element

---

## Context

Du bist ein Frontend-Entwickler, der ein dezentes, neugierig machendes UI-Element in das bestehende KINN Dashboard (kinn.at) integriert. Das Element soll den "KI Praxis Report Tirol 2026" bewerben, ohne aufdringlich zu sein oder wertvollen Screen-Space von den Haupt-Features (Events, Profil) wegzunehmen.

**Ziel:** Nur jene erreichen, die es betrifft. Alle anderen nicht stören.

**Psychologisches Prinzip:** Curiosity Gap + Exclusivity + Progressive Disclosure

---

## Design-Philosophie

### ❌ Was wir NICHT wollen:
- Großes Widget das Platz wegnimmt
- "JETZT EINREICHEN!" Schreien
- Banner-Blindness auslösen
- User vom eigentlichen Dashboard-Zweck ablenken

### ✅ Was wir wollen:
- Dezent aber nicht unsichtbar
- Belohnt Neugier (wer hinschaut, erfährt mehr)
- Fühlt sich wie Insider-Info an, nicht wie Werbung
- Respektiert den User-Flow
- Erzeugt FOMO ohne Druck

---

## UI Specification: "The Whisper"

### Element-Typ: Floating Pill / Badge

**Position:** Fixed Top-Right - AUSSERHALB von allem, sticky
(Nicht im Content, nicht im Header - komplett eigenständig, scrollt nicht mit)

```
┌─────────────────────────────────────────────────────────────┐
│                                          ┌────────────────┐ │
│                                          │ KI Report · 14 ●│ │ ← Fixed top-4 right-4
│                                          └────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  KINN                                                 │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  Dashboard    Mein Profil    ⚙ Einstellungen          │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  Kommende KINN Events                                 │  │
│  │  ┌──────────┐ ┌──────────┐                            │  │
│  │  │  Event   │ │  Event   │                            │  │
│  │  └──────────┘ └──────────┘                            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**CSS Position:**
```css
.teaser-pill {
  position: fixed;
  top: 1rem;      /* top-4 */
  right: 1rem;    /* right-4 */
  z-index: 50;    /* above content, below modals */
}
```

---

## Element States

### State 1: Collapsed (Default) - DYNAMISCH JE NACH PIPELINE

**Layout:**
```
┌──────────────────┐
│  KI Report · 14 ●│
└──────────────────┘
```

**Specs:**
- Size: ~140px x 36px (variiert mit Text)
- Background: `bg-white/90 backdrop-blur-md` (frosted glass)
- Border: `border border-gray-200/50`
- Border-radius: 9999px (full pill)
- Shadow: `shadow-sm`, on hover `shadow-lg`
- Position: Fixed top-4 right-4, z-50

**Dynamisches Wording je nach Pipeline-Zustand:**

| Cases | Collapsed Text | Dot Color | Hover CTA |
|-------|---------------|-----------|-----------|
| 0 | `KI Report 2026 ●` | green | "Erster Case sein →" |
| 1-9 | `KI Report · 3 ●` | green | "Deinen Case teilen →" |
| 10-39 | `KI Report · 14 ●` | green | "Deiner fehlt noch →" |
| 40-49 | `KI Report · 42 ●` | orange | "Letzte Chance →" |
| 50 | `KI Report · 50 ✓` | - | "Report kommt bald" |

**Logik:**
```javascript
function getTeaserContent(verifiedCount, goal) {
  if (verifiedCount === 0) {
    return {
      collapsed: "KI Report 2026",
      dotColor: "emerald",
      subtitle: "Wir starten gerade",
      cta: "Erster Case sein →"
    };
  } else if (verifiedCount < 10) {
    return {
      collapsed: `KI Report · ${verifiedCount}`,
      dotColor: "emerald", 
      subtitle: "Echte Cases. Echte Zahlen. Verifiziert.",
      cta: "Deinen Case teilen →"
    };
  } else if (verifiedCount < 40) {
    return {
      collapsed: `KI Report · ${verifiedCount}`,
      dotColor: "emerald",
      subtitle: `${verifiedCount} Tiroler KI-Cases dokumentiert`,
      cta: "Deiner fehlt noch →"
    };
  } else if (verifiedCount < goal) {
    const remaining = goal - verifiedCount;
    return {
      collapsed: `KI Report · ${verifiedCount}`,
      dotColor: "orange", // Urgency!
      subtitle: `Fast komplett! Noch ${remaining} Plätze`,
      cta: "Letzte Chance →"
    };
  } else {
    return {
      collapsed: `KI Report · ${verifiedCount} ✓`,
      dotColor: null,
      subtitle: "Report komplett!",
      cta: "Bald verfügbar"
    };
  }
}
```

**Why "KI Report · 14" statt "14/50":**
- "14/50" alleine ist zu kryptisch
- "KI Report" gibt sofort Kontext
- Die Zahl erscheint erst wenn's was zu zeigen gibt (>0)
- Der Punkt (·) trennt elegant ohne zu schreien

---

### State 2: Hover (Expanded Preview)

```
┌─────────────────────────────┐
│  ○ KI Praxis Report 2026    │
│  ━━━━━━━━━━━━━━━━━━━━░░░░░  │  ← Progress bar
│  14 verifiziert · Ziel: 50  │
│                             │
│  Hast du einen Case?  →     │
└─────────────────────────────┘
```

**Specs:**
- Size: ~240px x ~100px
- Transition: Smooth expand (200-300ms ease-out)
- Same position, expands leftward and downward
- Subtle shadow increase on hover

**Content:**
- Small icon (○ or subtle report icon)
- Title: "KI Praxis Report 2026"
- Visual progress bar (14/50 = 28% filled)
- Subtext: "14 verifiziert · Ziel: 50"
- CTA: "Hast du einen Case? →" (not a button, just linked text)

**Why this works:**
- Rewards curiosity with context
- Progress bar creates FOMO ("I want to be part of this")
- "Hast du einen Case?" is a question, not a command
- Arrow suggests "there's more" without being pushy

---

### State 3: Click → Modal Opens

On click anywhere in the expanded element → Open the full Use Case Submission Modal (as specified in the other briefing).

**Transition:**
- Element fades slightly
- Modal slides in from right or fades in center
- Element remains visible behind modal (z-index below)

---

## Alternative Designs (Pick One)

### Option A: "The Counter" (Recommended)

```
Default:    [ 14/50 ● ]
Hover:      [ KI Report 2026 ━━━━░░░ 14/50 | Einreichen → ]
```
Pure numbers, maximum curiosity gap.

### Option B: "The Badge"

```
Default:    [ 🎙 Report ]  (with subtle notification dot)
Hover:      [ 14 Cases verifiziert · Du auch? → ]
```
More context upfront, less mysterious.

### Option C: "The Progress Ring"

```
Default:    [ ◐ ] (circular progress, 28% filled)
Hover:      [ KI Report · 14/50 · Mitmachen → ]
```
Visual-first, very minimal footprint.

### Option D: "The Whisper" (Most Subtle)

```
Default:    [ ● ] (just a pulsing dot, top-right corner)
Hover:      [ 14 KI Cases gesammelt · Deiner fehlt noch → ]
```
Maximum subtlety, only the curious will notice.

---

## Micro-Interactions

### Pulse Animation (for the dot)

```css
@keyframes subtle-pulse {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1); 
  }
  50% { 
    opacity: 0.7; 
    transform: scale(1.1); 
  }
}

.pulse-dot {
  animation: subtle-pulse 3s ease-in-out infinite;
}
```

**Important:** 
- Slow pulse (3-4 seconds) = calming, not urgent
- Fast pulse = annoying, triggers banner blindness
- The goal is "alive" not "LOOK AT ME"

### Hover Expansion

```css
.teaser-pill {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.teaser-pill:hover {
  /* Expand width */
  /* Show additional content */
  /* Slight shadow increase */
}
```

### Progress Bar Fill

```css
.progress-bar {
  background: linear-gradient(90deg, 
    var(--kinn-green) 0%, 
    var(--kinn-green) var(--progress), 
    var(--gray-200) var(--progress), 
    var(--gray-200) 100%
  );
}
```

---

## Behavioral Logic

### Show/Hide Rules

```javascript
const shouldShowTeaser = () => {
  // Always show if:
  // - User is logged in
  // - User has NOT dismissed it permanently
  // - Deadline not passed (before March 31, 2026)
  
  // Hide if:
  // - User has already submitted a use case (show different state instead)
  // - User explicitly dismissed (localStorage flag)
  // - Report deadline passed
  
  return isLoggedIn && !hasDismissed && !deadlinePassed;
};
```

### For Users Who Already Submitted

```
Default:    [ ✓ 1 Case ]
Hover:      [ Dein Case: In Review · Noch einen? → ]
```

Show them their status, invite additional submissions.

### Dismiss Option

On expanded hover, show tiny "×" in corner.
Click × → Hide for this session (or permanently with localStorage).

**Important:** Make dismiss easy but not prominent. 
We're not trying to trap anyone.

---

## Copy Variations (A/B Test These)

### Counter Text
- "14/50" (pure numbers - most mysterious)
- "14 Cases" (slightly more context)
- "14 ✓" (checkmarks imply validation)

### Hover CTA
- "Hast du einen Case?" (question - soft)
- "Deiner fehlt noch" (FOMO - medium)
- "Einreichen →" (direct - hard)
- "Mitmachen" (community - soft)

### Progress Framing
- "14 verifiziert · Ziel: 50" (goal-oriented)
- "14 Tiroler Cases gesammelt" (regional pride)
- "14 Praktiker haben geteilt" (social proof)
- "Noch 36 Plätze" (scarcity)

---

## Technical Implementation Notes

### Positioning Strategy

```css
/* Option 1: Fixed to viewport */
.teaser-element {
  position: fixed;
  top: 120px; /* Below header */
  right: 24px;
}

/* Option 2: Absolute to content container */
.dashboard-content {
  position: relative;
}
.teaser-element {
  position: absolute;
  top: 16px;
  right: 16px;
}

/* Option 3: Sticky (scrolls with content initially, then sticks) */
.teaser-element {
  position: sticky;
  top: 80px;
  float: right;
  margin-left: auto;
}
```

**Recommendation:** Option 2 (absolute to content) - stays in context, doesn't feel like an ad overlay.

### Responsive Behavior

```
Desktop (>768px):  Show full teaser element
Tablet (768px):    Show full teaser element  
Mobile (<640px):   Hide teaser OR show minimal version at bottom
```

On mobile, screen real estate is precious. Consider:
- Hiding completely (rely on other entry points)
- Bottom sheet teaser on scroll-up
- Minimal fab-style button

### Accessibility

```html
<button 
  class="teaser-pill"
  aria-label="KI Praxis Report 2026: 14 von 50 Use Cases verifiziert. Klicken zum Einreichen."
  aria-expanded="false"
  aria-haspopup="dialog"
>
  <span class="teaser-counter">14/50</span>
  <span class="teaser-dot pulse" aria-hidden="true"></span>
</button>
```

- Full context in aria-label
- Keyboard accessible (Tab + Enter)
- Screen reader announces purpose

### Data Requirements

```typescript
interface TeaserData {
  verified: number;      // Current verified count
  goal: number;          // Target (50)
  userSubmissions: number; // How many has this user submitted
  deadlineDate: Date;    // March 31, 2026
  userDismissed: boolean; // localStorage flag
}

// Fetch from: GET /api/use-cases/stats
// Or embed in initial page load
```

---

## The Psychology Behind It

### 1. Curiosity Gap
"14/50" without context forces the brain to ask "14 of 50 WHAT?"
This is the same trick news headlines use. Incomplete information demands completion.

### 2. Progress & Completion
Seeing 14/50 (28%) triggers the Zeigarnik Effect - we remember incomplete tasks.
Users subconsciously want to help "complete" the progress bar.

### 3. Social Proof
"14 verifiziert" implies 14 other people have done this.
"If others are doing it, maybe I should too."

### 4. Exclusivity
Small, subtle placement says "this isn't for everyone."
Those who notice feel like they discovered something.

### 5. Respect = Trust
By NOT being a giant banner, we signal:
"We trust you to be interested or not. We're not desperate."
This builds brand respect.

---

## What Success Looks Like

### Metrics to Track

```
- Hover rate: % of dashboard visits that hover on teaser
- Click-through rate: % of hovers that click to modal
- Completion rate: % of modal opens that submit
- Dismiss rate: % that click × to hide
```

### Target Benchmarks

```
- Hover rate: 15-25% (curious users)
- CTR from hover: 30-40% (interested users)
- Completion rate: 50-60% (qualified users)
- Dismiss rate: <10% (not annoying)
```

### Signs It's Working

✅ Users mention "I saw that counter thing" in community
✅ Submissions come in steadily without promotional pushes
✅ Low dismiss rate
✅ Users who submit are qualified (productive cases)

### Signs to Iterate

⚠️ High dismiss rate → Too prominent or annoying
⚠️ Low hover rate → Too subtle, not visible enough
⚠️ High hover, low click → Expanded state not compelling
⚠️ Low quality submissions → Attracting wrong audience

---

## Final Checklist for Implementation

```
□ Element positioned top-right of content area (not header)
□ Collapsed state shows only "14/50 ●"
□ Hover expands smoothly with context
□ Click opens submission modal
□ Pulse animation is SLOW (3-4 seconds)
□ Dismiss option available but subtle
□ Different state for users who already submitted
□ Mobile: Hidden or minimal
□ Accessible (aria-labels, keyboard nav)
□ Data fetched from /api/use-cases/stats
□ localStorage tracks dismiss preference
```

---

## Summary

**Das Element:** Ein kleines floating Pill "KI Report · 14 ●" fixed top-right, außerhalb von allem.

**Der Trick:** Zeige fast nichts. Lass Neugier arbeiten. Belohne Hover mit Kontext. Konvertiere Klicks.

**Die Philosophie:** Das beste Marketing fühlt sich nicht wie Marketing an. Es fühlt sich wie Entdeckung an.

**Zusammenspiel mit Modal:**
Die Zahl aus dem Teaser (z.B. "14") wird im Modal-Subtext aufgelöst:
→ Teaser: "KI Report · 14 ●"
→ Modal: "14 andere haben schon. Frag deine KI..."

Siehe: `kinn-use-case-pipeline-briefing.md` für vollständige Modal-Spezifikation.

---

*"The goal is not to make people see your ad. The goal is to make the right people curious."*
