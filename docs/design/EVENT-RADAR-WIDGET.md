# KI Event Radar Widget - Design Specification

## Konzept

GitHub-Contribution-Graph-Style Visualisierung aller KI Events in Tirol. Auf einen Blick sichtbar: Wann finden Events statt und wer veranstaltet sie.

---

## Visual Design

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  KI Event Radar Tirol                        2025 / [2026] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│      Jan    Feb    Mar    Apr    May    Jun    →           │
│    ┌──────┬──────┬──────┬──────┬──────┬──────┐             │
│  M │ ░ ▓ │ ░ ░ │ ▓ ░ │ ░ ░ │ ░ ▓ │ ░ ░ │ ...           │
│  T │ ▓ ░ │ ░ ▓ │ ░ ░ │ ▓ ░ │ ░ ░ │ ░ ▓ │               │
│  W │ ░ ░ │ ▓ ░ │ ░ ▓ │ ░ ░ │ ▓ ░ │ ░ ░ │               │
│  T │ ░ ▓ │ ░ ░ │ ░ ░ │ ░ ▓ │ ░ ░ │ ▓ ░ │               │
│  F │ ░ ░ │ ░ ░ │ ▓ ░ │ ░ ░ │ ░ ░ │ ░ ░ │               │
│  S │ ░ ░ │ ░ ▓ │ ░ ░ │ ░ ░ │ ░ ▓ │ ░ ░ │               │
│  S │ ░ ░ │ ░ ░ │ ░ ░ │ ░ ░ │ ░ ░ │ ░ ░ │               │
│    └──────┴──────┴──────┴──────┴──────┴──────┘             │
│                    ← swipe / scroll →                       │
│                                                             │
│  ● KINN (2)  ● InnCubator (12)  ● Startup.Tirol (8)  ...  │
└─────────────────────────────────────────────────────────────┘
```

### Dimensionen

| Element | Wert |
|---------|------|
| Widget-Breite | 100% (max 800px) |
| Widget-Höhe | ~280px (fixed) |
| Cell-Größe | 14 × 14px |
| Cell-Gap | 3px |
| Cell-Radius | 3px |
| Sichtbare Wochen | ~12-16 (je nach Viewport) |
| Scroll-Bereich | 52 Wochen (ganzes Jahr) |

### Farbpalette

```css
/* Source Colors */
--color-kinn: #5ED9A6;           /* Mint - KINN owned */
--color-inncubator: #F59E0B;     /* Orange */
--color-startup-tirol: #3B82F6;  /* Blue */
--color-ai-austria: #8B5CF6;     /* Purple */
--color-universities: #14B8A6;   /* Teal */
--color-other: #9CA3AF;          /* Gray */

/* Cell States */
--cell-empty: #E5E7EB;           /* Light gray */
--cell-empty-hover: #D1D5DB;     /* Slightly darker on hover */

/* UI */
--background: #F9FAFB;           /* Off-white */
--text-primary: #1F2937;         /* Dark gray */
--text-secondary: #6B7280;       /* Medium gray */
--border: #E5E7EB;               /* Light border */
```

---

## Interaktionen

### 1. Hover auf Cell

```
┌─────────────────┐
│ Di, 7. Jan 2026 │
│ ● ●             │  ← Farbige Dots zeigen Sources
│ 2 Events        │
└─────────────────┘
```

- Tooltip erscheint über der Cell
- Zeigt: Wochentag, Datum, Source-Dots, Event-Count
- Tooltip folgt Cursor nicht, bleibt bei Cell

### 2. Click auf Cell

Expanded Detail Panel öffnet sich UNTER dem Grid:

```
┌─ Di, 7. Januar 2026 ──────────────────────────────────────┐
│                                                            │
│  ● KINN TechTalk #1 - VoiceAI                             │
│    18:00 · Innsbruck, Tirol                          [→]  │
│                                                            │
│  ● KINN#7 Stammtisch                                      │
│    08:00 · WIFI Tirol Campus                         [→]  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

- Panel smooth einblenden (200ms ease-out)
- Farbiger Dot = Source-Farbe
- [→] Link zur Event-Detailseite / Luma / Original

### 3. Horizontal Scroll

- Touch: Swipe links/rechts
- Desktop: Scroll-Wheel (horizontal) oder Drag
- Scrollbar: Thin, subtle, nur bei Hover sichtbar
- Snap: Optional soft-snap zu Monatsanfängen

### 4. Jahr-Toggle

```
2025 / [2026]
  ○      ●
```

- Pill-Buttons rechts oben
- Aktives Jahr: Mint-Fill
- Inaktives Jahr: Ghost-Style
- Smooth Transition beim Wechsel

---

## Multi-Event Cells

Wenn mehrere Events am selben Tag von verschiedenen Sources:

### Option A: Gradient Split (bevorzugt)
```
┌────┐
│▓▓▓▓│  ← Horizontaler Gradient: KINN → InnCubator
└────┘
```

### Option B: Diagonal Split
```
┌────┐
│◢◢◢◢│  ← Diagonale Teilung
│◣◣◣◣│
└────┘
```

### Option C: Stacked Dots
```
┌────┐
│● ● │  ← Kleine Dots in Cell
│    │
└────┘
```

**Empfehlung:** Option A (Gradient) für 2 Sources, Option C (Dots) für 3+ Sources.

---

## Legende

Horizontal unter dem Grid:

```
● KINN (2)  ● InnCubator (12)  ● Startup.Tirol (8)  ● AI Austria (5)  ● Uni (29)  ● Andere (14)
```

- Farbiger Dot + Source-Name + Count in Klammern
- Click auf Legende: Filtert Grid auf diese Source
- Aktiver Filter: Bold + Underline
- "Alle" Button zum Reset

---

## Responsive Verhalten

### Desktop (>768px)
- Volle Breite, ~16 Wochen sichtbar
- Hover-Tooltips aktiv
- Horizontal Scroll mit Wheel

### Tablet (480-768px)
- ~12 Wochen sichtbar
- Touch-Swipe für Navigation
- Tooltips bei Touch-Hold

### Mobile (<480px)
- ~8 Wochen sichtbar
- Kompaktere Cells (12×12px)
- Swipe-Navigation
- Detail-Panel als Bottom-Sheet

---

## Datenstruktur

```typescript
interface EventDay {
  date: string;           // "2026-01-07"
  events: {
    id: string;
    title: string;
    time: string;
    location: string;
    source: Source;
    detailUrl: string;
  }[];
}

type Source =
  | 'KINN'
  | 'InnCubator'
  | 'Startup.Tirol'
  | 'AI Austria'
  | 'Uni Innsbruck'
  | 'MCI'
  | 'FH Kufstein'
  | 'Other';

interface RadarData {
  year: number;
  totalEvents: number;
  bySource: Record<Source, number>;
  days: EventDay[];
}
```

---

## API Endpoint

```
GET /api/radar/calendar?year=2026
```

Response:
```json
{
  "year": 2026,
  "totalEvents": 70,
  "bySource": {
    "KINN": 2,
    "InnCubator": 12,
    "Startup.Tirol": 8,
    "AI Austria": 5,
    "Uni Innsbruck": 29,
    "Other": 14
  },
  "days": [
    {
      "date": "2026-01-07",
      "events": [
        {
          "id": "kinn-techtalk-1",
          "title": "KINN TechTalk #1 - VoiceAI",
          "time": "18:00",
          "location": "Innsbruck",
          "source": "KINN",
          "detailUrl": "https://lu.ma/..."
        }
      ]
    }
  ]
}
```

---

## Image Prompt (Nano Banana Pro)

```
Minimal data visualization widget mockup, "KI Event Radar Tirol" annual heatmap calendar.

Container: white card (#FFFFFF) with subtle shadow, rounded corners 16px, fixed width 800px, height 280px, padding 24px.

Header row:
- Left: "KI Event Radar Tirol" in Work Sans 600, dark gray (#1F2937)
- Right: year toggle "2025 / 2026" as pill buttons, active year has mint (#5ED9A6) fill

Grid area:
- 7 rows (M T W T F S S labels on left, fixed position, gray text)
- 52 columns representing weeks of the year
- Horizontal scroll container with overflow, showing ~14 weeks at once
- Month labels (Jan, Feb, Mar...) floating above grid, aligned to first week of each month

Cells:
- 14×14px squares with 3px gap and 3px border-radius
- Empty cells: light gray (#E5E7EB)
- Event cells: colored by source (mint, orange, blue, purple, teal)
- Multi-event cells: horizontal gradient blend of source colors
- Subtle hover state: slight scale(1.1) and shadow

Tooltip (shown on one cell):
- Small white card with shadow, arrow pointing to cell
- Content: "Di, 7. Jan" + colored dots + "2 Events"
- Positioned above the hovered cell

Detail panel (expanded state):
- Below grid, smooth slide-down animation
- Shows date header + list of events with colored dot, title, time, location
- Each event row has arrow icon linking to detail page

Legend bar (bottom):
- Horizontal row of source indicators
- Format: [colored dot] [Source Name] ([count])
- Sources: KINN (mint), InnCubator (orange), Startup.Tirol (blue), AI Austria (purple), Universities (teal), Other (gray)

Scroll indicator:
- Subtle "← scroll →" text centered below grid, light gray
- Thin horizontal scrollbar, only visible on hover

Style: GitHub contribution graph aesthetic, Figma-quality UI mockup, clean vector, Work Sans typography, KINN brand mint (#5ED9A6) as primary accent, minimal shadows, 4K resolution.
```

---

## Korrekturen zum generierten Bild

1. **Wochentag-Labels**: "M T W T F S S" sollten linksbündig AUSSERHALB des Scroll-Bereichs sein (fixed)
2. **Monat-Labels**: Sollten nur über der ersten Woche jedes Monats erscheinen, nicht über jeder Spalte
3. **Cell-Größe**: Etwas kleiner (14px statt ~20px) für mehr Density
4. **Scroll-Bereich**: Grid sollte horizontal scrollbar sein, Labels bleiben fixed
5. **Legende**: Sollte unter dem Grid sein, nicht überlappend
6. **Jahr-Toggle**: "2025 / 2026" als klickbare Pills, nicht nur Text
7. **Empty Cells**: Sollten einheitlich hellgrau sein, nicht verschiedene Grüntöne
8. **Multi-Source Days**: Gradient oder Split statt überlappende Farben

---

## Implementation Priority

1. **P0**: Static Grid mit echten Daten aus `/api/radar/calendar`
2. **P1**: Horizontal Scroll + Month Labels
3. **P2**: Hover Tooltips
4. **P3**: Click → Detail Panel
5. **P4**: Source Filter via Legende
6. **P5**: Year Toggle
7. **P6**: Mobile Responsive

---

## Einbettung

Das Widget kann eingebettet werden auf:
- kinn.at Homepage (Hero-Section oder eigene /radar Route)
- Admin Dashboard (Übersicht)
- Externe Seiten via iframe

```html
<iframe
  src="https://kinn.at/widget/radar"
  width="100%"
  height="300"
  frameborder="0"
></iframe>
```
