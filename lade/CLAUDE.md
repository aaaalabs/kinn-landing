# KINN:LADE Newsletter

Monatlicher Thought-Leadership-Newsletter für die Tiroler KI-Community.

## Projekt-Übersicht

**KINN:LADE** = "Ladestation" für Wissen und Inspiration. Bi-weekly bis monatlicher Newsletter mit persönlichem Ton, datengestützten Insights und Community-CTA.

**Ziel:** 40%+ Open Rate (Industrie-Durchschnitt: 22%)

**Erfolgsformel:** 60% Information, 40% Persönlichkeit/Entertainment

## Tech Stack

- **Drafts**: Markdown (`.md`)
- **Email**: HTML mit Inline-CSS (600px max-width, mobile-first)
- **Archiv**: Static HTML (`index.html`)
- **Bilder**: PNG/JPG, max 600px Breite
- **Versand**: Resend API (siehe `/api/` im Hauptprojekt)

## Ordnerstruktur

```
/lade/
├── CLAUDE.md           # Diese Datei
├── index.html          # Archiv-Landingpage (kinn.at/lade)
├── metadata.json       # Newsletter-Metadaten & Defaults
├── /01/                # Ausgabe #01 (Dezember 2025)
│   ├── index.html      # Redirect zu email.html
│   ├── email.html      # Finale HTML-Email
│   └── /images/        # Bilder für diese Ausgabe
│       ├── hero.png    # Header-Bild mit Titel
│       └── *.png       # Weitere Illustrationen
├── /02/                # Nächste Ausgabe (vorbereitet)
├── /drafts/            # Markdown-Entwürfe
│   └── KINN-LADE-02-Februar-2026.md
└── /skill/             # Claude Code Skill Definition
    ├── SKILL.md        # Ausführliche Guidelines
    ├── skill.yaml      # Skill-Metadaten
    └── examples.md     # Template-Beispiele
```

## Workflow: Neue Ausgabe erstellen

### 1. Draft schreiben
```bash
# Neuer Draft in /drafts/
KINN-LADE-[NR]-[Monat]-[Jahr].md
```

### 2. Struktur validieren
- Subject Line: max 40 Zeichen
- Preheader: 40-50 Zeichen
- Inhaltsverzeichnis: 6 Punkte, 2-spaltig
- Storytelling-Einstieg mit Statistik oder persönlicher Szene
- KINN-Brücke (Verbindung zur Community)
- Max 3 CTAs
- Nächster Termin mit Anmeldelink
- Quellen-Liste

### 3. HTML erstellen
- Kopiere `/01/email.html` als Template
- Ersetze Inhalte, behalte Struktur
- Teste in verschiedenen Email-Clients

### 4. Ordner anlegen
```bash
/[NR]/
├── index.html      # Redirect
├── email.html      # Finale Email
└── /images/        # Bilder
```

### 5. metadata.json aktualisieren
```json
{
  "id": "02",
  "status": "draft",  // draft | published | sent
  ...
}
```

**Status-Werte:**
- `draft` - In Arbeit, nur via Direktlink erreichbar
- `published` - Im Archiv gelistet, aber noch nicht versendet
- `sent` - Versendet an Subscriber

### 6. Veröffentlichen (wenn bereit)

**WICHTIG:** Solange `status: "draft"` gilt:
- **NICHT** im Archiv (`/lade/index.html`) listen
- **NICHT** in Sitemap aufnehmen
- Nur via Direktlink erreichbar: `kinn.at/lade/02/`

**Beim Veröffentlichen:**
1. Status in `metadata.json` auf `"published"` setzen
2. Karte in `/lade/index.html` hinzufügen
3. URL in `/sitemap.xml` eintragen
4. Deploy auf Vercel

### 7. Sitemap aktualisieren (nur bei published/sent)
Nach Veröffentlichung **IMMER** die Sitemap erweitern:

**Datei:** `/sitemap.xml` (im KINN Root)

```xml
<url>
  <loc>https://kinn.at/lade/[NR]/</loc>
  <changefreq>yearly</changefreq>
  <priority>0.6</priority>
</url>
```

**Checkliste Veröffentlichung (von draft → published):**
- [ ] Bilder generiert und in `/[NR]/images/` abgelegt
- [ ] `metadata.json`: Status auf `"published"` gesetzt
- [ ] `index.html` Archiv-Seite: Neue Karte hinzugefügt
- [ ] `sitemap.xml`: Neue URL hinzugefügt
- [ ] Deploy auf Vercel
- [ ] Direktlink testen: `kinn.at/lade/[NR]/`

## Newsletter-Struktur

```
KINN:LADE [NR]/26 - [Provokanter Titel]

[Preheader: ~50 Zeichen]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IN DIESER AUSGABE
1 [Thema]    4 [Thema]
2 [Thema]    5 [Thema]
3 [Thema]    6 [Thema]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[STORYTELLING-EINSTIEG]
Starke Statistik oder persönliche Szene
"Ich kenne dieses Gefühl..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ABSCHNITTE 1-4]

> Pull-Quote bei Kernaussagen
> — Quelle

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WAS DAS FÜR KINN BEDEUTET
[Community-Verbindung]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WAS DU TUN KANNST
→ Handlung 1
→ Handlung 2
→ Handlung 3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NÄCHSTER KINN TREFF
[Datum] | [Location]
→ Anmeldung auf kinn.at/[nr]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUELLEN
→ [Quelle](url)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thomas Seiger für KINN - KI Netzwerk Tirol
kinn.at | Wo Tiroler KI Profil bekommt.
```

## Formatierung

### Subject Line
- Max 40 Zeichen
- Neugier ohne Clickbait
- Keine CAPS, selten Emojis
- Beispiele: "Das stille Paradoxon", "95% scheitern - gut so"

### Text
- Kurze Absätze (2-3 Sätze max)
- Viel Whitespace
- Fett nur für Kernbegriffe (sparsam!)
- Mobile-first denken

### Listen
- → statt • für Aufzählungen
- Nummeriert nur bei echter Reihenfolge

### Pull-Quotes
```
> "Zitat hier - max 2 Zeilen"
> — Quelle, Jahr
```

### Links
- Beschreibender Linktext
- Nicht "Klick hier"

## Persönlicher Ton (Pflicht-Formulierungen)

```
"Ich muss gestehen..."
"Meiner Erfahrung nach..."
"Für mich fühlt es sich so an..."
"Mein Bauchgefühl sagt mir..."
"Ich kenne dieses Gefühl. Aus erster Hand."
"Was mich überrascht hat..."
```

## Hook-Formeln

### Statistik-Einstieg
```
[Schockierende Zahl] der [Gruppe] [überraschendes Verhalten].

Das klingt [Emotion] - aber ich sehe darin [Gegenteil].
```

### Persönlicher Einstieg
```
Letzte Woche saß ich bei [Ort] und ein Satz blieb hängen:
"[Zitat]"

Ich kenne dieses Gefühl. Aus erster Hand.
```

### Kontrast-Einstieg
```
Alle reden von [Mainstream-Meinung].
Ich sehe etwas anderes: [Eigene Beobachtung].
```

## Content-Typen

### Typ A: Themen-Deep-Dive
Ein Thema, 6 Perspektiven (Beispiel: #01 Einsamkeit)

### Typ B: Trend-Analyse
Externe Entwicklung + Tiroler Relevanz (Beispiel: #02 AI Hype Correction)

### Typ C: Community-Spotlight
KINN-Mitglieder, Events, Learnings

---

## Bild-Prompts in Drafts

In Markdown-Drafts werden Bild-Platzhalter als **Tabellen mit dünnen Rahmen** formatiert. Jede Zelle enthält einen ausführlichen Image-Prompt.

### Format für Bild-Platzhalter

```markdown
| BILD: [Bildname] |
|:---|
| **Typ:** Foto / Illustration |
| **Prompt:** [Ausführlicher Prompt] |
| **Dateiname:** `[nr]-[slug].png` |
```

---

### Typ 1: Realistische Fotos (Hyperrealistisch)

Für Blog-Fotos die von echten Aufnahmen nicht zu unterscheiden sind.

**Pflicht-Elemente im Prompt:**
- Kamera & Objektiv (z.B. "Sony A7IV, 35mm f/1.8")
- Lichtverhältnisse ("natürliches Fensterlicht von links, goldene Stunde")
- Tiefenschärfe ("shallow depth of field, f/2.0, Hintergrund sanft verschwommen")
- Körnung/Textur ("subtle film grain, natural skin texture")
- Komposition ("Rule of thirds, subject off-center")
- Umgebungsdetails ("Kaffeetasse mit Dampf, zerknittertes Notizbuch, Post-its")
- Authentizität ("candid moment, not posed, mid-gesture")
- Kleidung/Styling ("casual business, rolled-up sleeves, no tie")
- Emotion/Ausdruck ("thoughtful expression, slight frown, looking at screen")

**Beispiel-Prompt (Foto):**

| BILD: Remote Worker |
|:---|
| **Typ:** Foto (hyperrealistisch) |
| **Prompt:** Candid photograph of a mid-30s male knowledge worker sitting alone at a minimalist home office desk, late afternoon. Shot on Sony A7IV with 35mm f/1.8 lens, natural window light from the left creating soft shadows, golden hour warmth. Shallow depth of field (f/2.0), background showing blurred bookshelf and monstera plant. Subject wearing navy blue henley shirt with pushed-up sleeves, 2-day stubble, slightly tired eyes, staring at closed MacBook with distant expression. On desk: cold coffee in ceramic mug (no steam), scattered AirPods, small succulent, single Post-it note. Hands resting on keyboard, shoulders slightly hunched. Subtle film grain, natural skin texture with visible pores, authentic imperfections. Composition follows rule of thirds, subject positioned left. Mood: quiet isolation, end-of-day exhaustion, contemplative loneliness. No eye contact with camera. Raw, editorial style like NYT lifestyle photography. |
| **Dateiname:** `01-remote-worker.png` |

---

### Typ 2: KINN Illustrationen

Basierend auf dem etablierten Stil von `/01/images/hero.png`:

**KINN Illustrations-Stilmerkmale:**
- **Farbpalette:** Gedämpftes Sage Green/Mint (#5ED9A6, #B8D4C7), Charcoal (#1a1a1a), Weiß, Hellgrau
- **Stil:** Flat Vector, keine Verläufe, saubere Kanten
- **Menschen:** Vereinfachte Silhouetten, keine Gesichtsdetails, proportional aber stilisiert
- **Tech-Elemente:** Pixel-Grids, digitale Muster, Circuit-artige Linien, Datenvisualisierung abstrakt
- **Organische Elemente:** Fließende Formen, Wurzeln, Blätter, Äste als Metaphern für Wachstum/Verbindung
- **Komposition:** Viel Whitespace, asymmetrisch, links-nach-rechts Leserichtung
- **Motive:** Sprechblasen (Kommunikation), vernetzte Punkte (Community), abstrakte Köpfe mit digitalen Mustern
- **Textur:** Subtile Körnigkeit, keine harten Kanten bei organischen Formen
- **Stimmung:** Ruhig, professionell, optimistisch, technisch aber menschlich

**Beispiel-Prompt (Illustration):**

| BILD: Hero - KI & Einsamkeit |
|:---|
| **Typ:** Illustration (KINN-Stil) |
| **Prompt:** Flat vector illustration in muted sage green (#5ED9A6), charcoal (#1a1a1a), and white color palette. Central element: stylized human silhouette in profile, head filled with pixel-grid pattern suggesting digital thoughts, flowing organic root-like shapes extending downward representing grounding/connection. Left side: abstract network of connected dots forming loose community cluster, small simplified human figures with speech bubbles. Right side: isolated single figure, surrounded by empty space, subtle circuit-board lines fading into nothing. Background: clean white with subtle grain texture. Top corner: "KINN:LADE 01/26" in charcoal sans-serif. Composition asymmetric, heavy whitespace on right suggesting isolation theme. Style references: modern editorial illustration, Slack/Notion brand illustrations, Abstract geometric with organic flow. No gradients, flat colors only, clean vector aesthetic. Mood: contemplative, thought-provoking, professional yet warm. |
| **Dateiname:** `hero.png` |

---

### Prompt-Bausteine (Copy-Paste)

**Für Fotos - Technische Basis:**
```
Shot on [Sony A7IV / Canon R5 / Fuji X-T5], [24mm/35mm/50mm/85mm] lens at f/[1.4-2.8],
[natural window light / studio softbox / overcast daylight / golden hour],
shallow depth of field, [subject] in focus, background [softly blurred / bokeh].
Subtle film grain, natural skin texture, authentic imperfections.
Editorial style, candid moment, not posed.
```

**Für Fotos - Umgebungsdetails:**
```
Environment details: [specific objects on desk/table], [plants/books/tech],
[beverage with/without steam], [scattered papers/clean desk],
[window showing urban/nature view], [specific lighting fixture].
```

**Für Illustrationen - KINN-Stil-Basis:**
```
Flat vector illustration, muted color palette: sage green (#5ED9A6),
charcoal (#1a1a1a), white (#ffffff), light grey (#f5f5f5).
No gradients, clean edges, subtle grain texture.
Simplified human silhouettes without facial details.
Mix of geometric/digital elements (pixel grids, connected dots, circuit patterns)
with organic flowing shapes (roots, leaves, branches).
Heavy whitespace, asymmetric composition.
Modern editorial style like Slack/Notion brand illustrations.
```

**Für Illustrationen - Thematische Elemente:**
```
Digital/Tech: pixel grids, binary patterns, data visualization,
connected nodes, network diagrams, abstract screens, circuit lines.

Connection/Community: interlinked figures, speech bubbles,
overlapping circles, hand gestures, gathering formations.

Growth/Development: roots, branches, sprouting elements,
upward movement, expanding patterns, nested shapes.

Isolation/Loneliness: single figure, empty space around subject,
disconnected nodes, fading elements, muted colors.
```

---

### Bild-Anforderungen

| Aspekt | Anforderung |
|:---|:---|
| **Auflösung** | Min. 1200x800px (wird auf 600px skaliert) |
| **Format** | PNG (Illustrationen), JPG (Fotos) |
| **Seitenverhältnis** | 3:2 oder 16:9 für Hero, 1:1 für Inline |
| **Dateigröße** | Max 500KB (optimiert) |
| **Benennung** | `[nr]-[beschreibung].png` z.B. `01-remote-worker.png` |

## Anti-Patterns (VERMEIDEN)

### Sprache
- Corporate-Sprache ("wir freuen uns...")
- Passive Konstruktionen
- "Buzzword" oder "Buzzword-Bingo"
- Belehrend statt lernend

### Format
- Zu viele CTAs (max 3)
- Newsletter als Blog-Link-Sammlung
- Walls of Text ohne Breaks

### Inhalt
- Reine Selbstpromotion
- News ohne Einordnung
- Meinungen ohne Daten

## Email HTML Spezifikationen

### Container
- Max 600px Breite
- Table-based Layout (Email-Kompatibilität)
- Inline-CSS (keine externen Stylesheets)

### Fonts
- System-Stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`
- Fallback für Outlook: Arial

### Farben
- Background: `#f5f5f5`
- Container: `#ffffff`
- Text: `#1a1a1a` (Titel), `#444444` (Body)
- Accent: `#5ED9A6` (KINN Mint)
- Muted: `#888888`

### Bilder
- Hosted auf `kinn.at/lade/[nr]/images/`
- Alt-Text immer (Accessibility)
- Max 600px Breite, `display: block`

### Preheader
```html
<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    [Preheader Text]
    &nbsp;&zwnj;&nbsp;&zwnj;... (Padding)
</div>
```

## metadata.json Schema

```json
{
  "newsletters": [
    {
      "id": "01",
      "title": "Das stille Paradoxon",
      "subtitle": "Warum Einsamkeit zum Business-Thema wird",
      "subject": "KINN:LADE #01 - Das stille Paradoxon",
      "preheader": "56% der Remote Worker...",
      "date": "2025-12",
      "sentAt": null,
      "recipientCount": 0,
      "status": "draft|sent",
      "author": "Thomas Seiger",
      "images": ["hero.png", ...],
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ],
  "defaults": {
    "author": "Thomas Seiger",
    "fromEmail": "Thomas @ KINN <thomas@kinn.at>",
    "replyTo": "thomas@kinn.at",
    "listUnsubscribe": true
  }
}
```

## Qualitäts-Checkliste

### Before Write
- [ ] Thema mit KINN-Relevanz?
- [ ] Mindestens 1 externe Datenquelle?
- [ ] Persönlicher Zugang vorhanden?
- [ ] Klarer CTA definiert?

### Before Send
- [ ] Subject < 40 Zeichen?
- [ ] Persönliche Formulierung im Einstieg?
- [ ] Pull-Quote vorhanden?
- [ ] KINN-Brücke geschrieben?
- [ ] Konkrete CTAs (max 3)?
- [ ] Nächster Termin mit Link?
- [ ] Alle Quellen gelistet?
- [ ] Mobile-Preview OK?
- [ ] P.S. mit Weiterleiten?
- [ ] Alt-Text für Bilder?

## Versand-Timing

### Beste Tage
1. Dienstag
2. Donnerstag
3. Mittwoch

### Beste Uhrzeiten
- 8:00-9:00 (vor Arbeitsbeginn)
- 12:00-13:00 (Mittagspause)

## Kernprinzip: 90/10 Regel

- 90% wertvoller Content für Leser
- 10% Promotion (KINN-Events, LibraLab)
- Niemals Verkaufspitch als Hauptinhalt

## Referenz-Dokumentation

Detaillierte Guidelines im `/skill/` Ordner:
- `SKILL.md` - Vollständige Skill-Dokumentation
- `examples.md` - Template-Beispiele und Hook-Variationen
- `skill.yaml` - Trigger-Keywords und Metadaten
