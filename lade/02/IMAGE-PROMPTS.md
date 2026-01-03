# KINN:LADE #02 - Image Generation Prompts

Optimiert für **Nano Banana Pro** und kompatibel mit Midjourney V7, DALL-E 3, Ideogram.

---

## Recherche-Quellen

Prompts basieren auf Best Practices von:
- [Tory Barber: Flat Illustrations AI Prompt Inspiration](https://torybarber.com/flat-illustrations-ai-prompt-inspo/)
- [God of Prompt: Corporate Illustrations](https://www.godofprompt.ai/blog/midjourney-prompts-for-commercial-photography)
- [Midjourney SREF Codes: Flat Vector](https://promptsref.com/style/Flat-vector)
- [AI Art Digest: Flat Illustrations](https://aiartdigest.com/flat-illustrations-in-midjourney/)
- [Foundation Inc: Realistic Photo Prompts](https://foundationinc.co/lab/midjourney-ai-prompts)

---

## Style Guide: KINN Visual Identity

### Farbpalette
| Farbe | Hex | Verwendung |
|:---|:---|:---|
| KINN Mint | `#5ED9A6` | Primary Accent |
| Sage Green Light | `#B8D4C7` | Secondary |
| Charcoal | `#1a1a1a` | Text, Outlines |
| Warm White | `#FAFAFA` | Background |
| Light Grey | `#F5F5F5` | Subtle fills |

### Illustration Style Keywords
```
flat vector, geometric shapes, clean lines, minimalist,
solid colors, no gradients, subtle grain texture,
modern editorial illustration, tech brand aesthetic,
Notion style, Slack style, Linear style,
Material Design influenced, Swiss Style inspired
```

### Photography Style Keywords
```
editorial photography, candid moment, natural lighting,
shallow depth of field, film grain, authentic,
documentary style, lifestyle photography,
shot on [camera], [focal length] lens, f/[aperture]
```

---

## Artist & Style References

### Für Illustrationen (Flat Vector)
| Reference | Beschreibung | Best for |
|:---|:---|:---|
| `Corporate Memphis` | Geometrische Figuren, bunte Formen | Tech-Illustrationen |
| `Material Design` | Google-Style, vereinfacht, clean | UI-artige Grafiken |
| `Swiss Style 1950s` | Minimalistisch, Vintage-Touch | Elegante Grafiken |
| `in the style of Behance` | Moderne Portfolio-Ästhetik | Brand Illustrations |
| `Pablo Stanley style` | Humaaans-artig, diverse Figuren | People-focused |
| `Shepard Fairey` | Retro, high contrast, bold | Statement-Grafiken |
| `Aaron James Draplin` | Bold, kontrastreich, geometrisch | Logo-artige Grafiken |

### Für Fotografie (Editorial/Business)
| Reference | Beschreibung | Best for |
|:---|:---|:---|
| `Annie Leibovitz` | Ikonische Portraits, dramatisch | Executive Portraits |
| `Richard Avedon` | Fashion Editorial, clean | Professionelle Shots |
| `Financial Times style` | Business Editorial | Corporate Kontext |
| `Bloomberg Businessweek` | Bold Business Photography | News-Style |
| `Monocle magazine` | Lifestyle, elegant, global | Quality Lifestyle |
| `Protocol/Sifted style` | Tech Startup Editorial | Tech Events |

---

## Prompt-Struktur (Best Practice)

### Für Illustrationen
```
[Style] illustration of [Subject], [Design Movement],
[Color Palette], [Mood/Atmosphere],
[Composition Details], [Technical Specs]
--ar [aspect ratio] --style raw --stylize [50-300]
```

### Für Fotografie
```
[Shot Type] photograph of [Subject], [Setting/Environment],
[Lighting Conditions], [Camera/Lens Details],
[Mood/Expression], [Background Details],
[Style Reference], [Technical Specs]
--ar [aspect ratio] --style raw
```

---

## Bild 1: Hero Image

**Dateiname:** `hero.png`
**Auflösung:** 1200 x 675 px (16:9)
**Status:** FERTIG

---

## Bild 2: Hype Crash (CEO Frustration)

**Dateiname:** `02-hype-crash.jpg`
**Auflösung:** 1200 x 800 px (3:2)
**Typ:** Hyperrealistisches Foto

### Prompt (Vollständig)

```
Editorial photograph of a mid-40s male executive alone in a modern glass-walled conference room, late afternoon golden hour. Shot on Sony A7IV with Canon 50mm f/1.4 lens, shallow depth of field f/2.0, natural window light creating soft directional shadows from the left.

Subject: Caucasian male, salt-and-pepper hair, 2-day stubble, visible tiredness in eyes with slight dark circles. Wearing expensive navy blue suit jacket over untucked white Oxford shirt, no tie, top button undone, sleeves not rolled. Body language: shoulders slightly hunched, exhausted posture.

Action: Sitting alone at head of long empty conference table (8-10 seats visible). Left hand rubbing temple, right hand loosely holding printed report with visible downward-trending graphs and charts. Expression: thousand-yard stare, exhausted frustration, the weight of failed expectations. No eye contact with camera - looking at nothing in particular.

Environment: Modern corporate conference room with floor-to-ceiling windows. Blurred background showing: whiteboard with partially visible "AI Strategy 2025" or "AI Roadmap" text, colorful sticky notes in disarray (some fallen), empty coffee cups (2-3), scattered papers. On table in foreground: closed MacBook Pro, dead AirPods Pro case, half-empty water bottle, more scattered printouts.

Technical: Natural skin texture with visible pores, authentic imperfections, subtle film grain (Kodak Portra 400 aesthetic). Warm golden hour color temperature. Focus on subject's face, background softly blurred with pleasant bokeh.

Style references: Financial Times weekend magazine photography, Bloomberg Businessweek corporate portraits, candid executive documentary style.

Mood: The quiet aftermath of another failed AI initiative. Corporate disillusionment. The gap between boardroom promises and reality. Not dramatic despair, but quiet exhaustion - the kind that comes from the third failed pilot project.

--ar 3:2 --style raw --v 7
```

### Prompt (Kompakt - für Token-Limits)

```
Candid editorial photo, mid-40s male executive alone in glass conference room, golden hour window light. Sony A7IV, 50mm f/1.4, shallow DOF. Navy suit jacket, untucked white shirt, no tie, 2-day stubble, tired eyes. Sitting at empty conference table, hand on temple, holding report with downward graphs. Thousand-yard stare, exhausted frustration. Background: whiteboard with "AI Roadmap", scattered sticky notes, empty coffee cups. Natural skin texture, Kodak Portra film grain. Financial Times editorial style. Mood: quiet corporate disillusionment after failed AI initiative. --ar 3:2 --style raw
```

### Negative Prompt (falls unterstützt)
```
cartoon, illustration, artificial lighting, perfect skin, stock photo smile, posed, looking at camera, dramatic, over-saturated, HDR, multiple people
```

---

## Bild 3: Human + AI Collaboration

**Dateiname:** `02-human-ai-collab.png`
**Auflösung:** 1200 x 800 px (3:2)
**Typ:** Flat Vector Illustration (KINN-Stil)

### Prompt (Vollständig)

```
Modern flat vector illustration, split composition showing transformation narrative. Corporate Memphis meets Swiss Style, muted sage green (#5ED9A6), charcoal (#1a1a1a), white (#FFFFFF), light grey (#F5F5F5) color palette only. No gradients, solid flat colors, clean geometric shapes, subtle paper grain texture overlay.

LEFT SIDE (Failure/Isolation):
Single simplified human silhouette (charcoal, no face details, proportional but stylized) facing a large abstract AI entity. The AI represented as: fragmented pixel grid pattern, disconnected circuit-board lines, cold geometric shapes. Visual disconnection between human and AI - gap between them, no connecting elements. Floating question marks (2-3, small, muted grey). Colors more muted/faded on this side. Scattered disconnected dots floating aimlessly. Mood: confusion, isolation, failed solo attempt.

RIGHT SIDE (Success/Guidance):
Same human silhouette, but now accompanied by a second human figure (the mentor/expert). Both figures facing the AI entity together, standing close. The mentor figure slightly larger or positioned to guide. Flowing organic lines connecting the two humans - speech bubbles between them indicating communication. The AI entity on this side integrated with organic elements: pixel patterns merging into growing branches, circuit lines becoming root structures, the cold geometry softening with leaf-like additions. Connected dots forming a loose network pattern. Colors vibrant and saturated on this side. Mood: collaboration, growth, successful implementation.

CENTER DIVIDING ELEMENT:
Subtle vertical gradient or line suggesting the transformation/journey from left to right. Could be represented as scattered pixels on left becoming organic seeds/growth on right.

Composition: Asymmetric, 45% left (problem) / 55% right (solution). Heavy whitespace at top and bottom. Clean white background. No border or frame.

Style references: Notion brand illustrations, Linear app graphics, Slack onboarding illustrations, Dropbox marketing visuals, in the style of Behance portfolio work, Material Design 3.0 illustration guidelines, Pablo Stanley's Humaaans aesthetic for figure style.

Typography: None required (will be added in email template).

--ar 3:2 --style raw --stylize 100
```

### Prompt (Kompakt)

```
Flat vector illustration, split composition, Corporate Memphis meets Swiss Style. Colors: sage green (#5ED9A6), charcoal (#1a1a1a), white, light grey only. No gradients, solid colors, subtle grain.

LEFT: Single human silhouette facing abstract AI (pixel grid, circuit patterns), disconnected, question marks floating, muted faded colors, scattered dots.

RIGHT: Two human figures together facing AI, speech bubbles between them, AI integrated with organic branches and roots, connected network dots, vibrant colors.

Clean white background, heavy whitespace, asymmetric 45/55 composition. Notion/Linear/Slack brand illustration style, in the style of Behance. --ar 3:2 --style raw --stylize 100
```

### Negative Prompt
```
3D, realistic, photography, gradients, drop shadows, complex textures, faces with details, text, logos, busy background, dark colors, neon
```

---

## Bild 4: Tiroler KMU (Local Business)

**Dateiname:** `02-tirol-kmu.jpg`
**Auflösung:** 1200 x 800 px (3:2)
**Typ:** Hyperrealistisches Foto

### Prompt (Vollständig)

```
Documentary-style photograph of a small business scene in a Tyrolean workshop-office hybrid space, mid-morning natural light. Shot on Fujifilm X-T5 with Fujinon 23mm f/1.4 lens, natural window light from the left side, slight overcast sky creating soft diffused illumination without harsh shadows.

Subjects: Two people in authentic collaboration moment.
- Woman, early-to-mid 50s: The business owner. Practical but quality clothing (simple wool sweater in earth tone, well-worn but cared for). Reading glasses pushed up on her head. Natural grey-streaked hair, not styled elaborately. Weathered hands showing years of craft work. Authentic laugh lines and expression wrinkles. Standing, leaning slightly toward screen, one hand pointing at something while explaining with quiet confidence.
- Man, early 30s: Employee or younger colleague. Casual flannel shirt (muted plaid pattern), well-fitted jeans. Attentive posture, slight smile, nodding while listening. Natural stubble, relaxed but engaged body language.

Action: Both standing at a standing desk or high work table, looking at a laptop screen together. A moment of knowledge transfer - the experienced owner explaining something, the younger colleague learning. Genuine interaction, not posed.

Environment: Authentic Tyrolean small business atmosphere mixing traditional craftsmanship with modern technology.
- Traditional elements: Wooden shelving with quality materials/products, hand tools mounted on wall or organized on pegboard, natural wood surfaces, perhaps some traditional craft samples
- Modern elements: Laptop (showing charts or business data, screen visible but not focus), tablet on charging stand, small secondary monitor, smartphone face-down
- Window view: Glimpse of Alpine mountain silhouette through window, distinctly Tyrolean/Austrian landscape, perhaps light snow on peaks
- Details on desk: Coffee in handmade ceramic mugs (local pottery style), scattered handwritten notes and calculations, old calculator alongside modern tech, product samples or material swatches

Technical: Natural skin textures, authentic imperfections (the woman's hands showing work history, natural aging). Subtle film grain (Fuji Pro 400H aesthetic). Warm but not orange color temperature. Focus on the human interaction, background elements slightly soft but recognizable. Depth of field showing both subjects sharp, background at f/2.8 softness.

Style references: Monocle magazine small business features, Kinfolk lifestyle photography, documentary photography approach, authentic not staged, "un-stock-photo" aesthetic.

Mood: Grounded expertise meeting new technology. Practical wisdom. Generational knowledge transfer. The quiet confidence of businesses that didn't chase hype. "Slow and steady wins the race" energy. Warmth of mentorship. Austrian/Tyrolean Gemütlichkeit meets modern business.

--ar 3:2 --style raw --v 7
```

### Prompt (Kompakt)

```
Documentary photograph, Tyrolean workshop-office, morning window light. Fuji X-T5, 23mm f/1.4, soft diffused lighting.

Two people at standing desk with laptop: woman (50s, business owner, practical wool sweater, reading glasses on head, pointing at screen explaining) and man (30s, flannel shirt, nodding, learning).

Environment: wooden shelves with craft materials, hand tools, traditional elements mixed with modern tech (laptop, tablet). Through window: Alpine mountain silhouette.

On desk: ceramic coffee mugs, handwritten notes, calculator, product samples. Natural skin textures, authentic imperfections. Monocle/Kinfolk documentary style. Mood: generational knowledge transfer, grounded Tyrolean expertise, "slow and steady wins" energy. --ar 3:2 --style raw
```

### Negative Prompt
```
corporate office, glass building, American setting, staged pose, stock photo, perfect lighting, young startup team, Silicon Valley aesthetic, suits, formal wear, city background
```

---

## Bild 5: KINN Event

**Dateiname:** `02-kinn-event.jpg`
**Auflösung:** 1200 x 800 px (3:2)
**Typ:** Hyperrealistisches Event-Foto

### Prompt (Vollständig)

```
Candid event photograph of a small professional gathering (5-7 people) around a high standing table in a modern European co-working space, early morning light (8:00 AM atmosphere). Shot on Sony A7IV with Sony 35mm f/1.8 lens, natural morning sunlight streaming through large industrial-style windows, creating warm atmosphere with subtle lens flare near window edge.

Group composition: Diverse mix of professionals in authentic morning networking moment.
- Mix of ages: late 20s to early 50s
- Mix of genders: roughly balanced
- Attire: Casual-professional European style (no suits, no hoodies - the middle ground). Quality basics, earth tones and muted colors, occasional tech company t-shirt visible
- Ethnicities: Primarily European/Austrian, reflecting Tyrolean demographics authentically

Action/Poses: Natural conversational moment, NOT posed group photo.
- One person (central) gesturing while explaining something, animated but not theatrical
- Two others nodding, engaged in what's being said
- One person taking quick note on smartphone
- One person mid-sip of coffee, eyes on speaker
- One person at edge of group, just arrived, setting down bag
- Natural spacing - not too tight, not too spread out

Expressions: Genuine interest, occasional smiles, the energy of good morning conversation. Morning alertness, pre-caffeine but engaged. No fake enthusiasm, no corporate presentation faces.

Environment: Modern European co-working space (NOT Silicon Valley aesthetic).
- Exposed concrete elements, industrial touches
- Large plants (monstera, fiddle leaf fig)
- Warm wood accents
- Large windows with urban/mountain view
- Other people working at desks in soft-focus background (space is active but not crowded)
- Subtle co-working branding visible but not prominent

On the standing table:
- Laptops (some open, some closed, mix of MacBooks and ThinkPads)
- Coffee cups from local cafe (ceramic mugs, not paper cups)
- Croissants or simple pastries on small plate
- Phones face-down (etiquette)
- One notebook open with handwritten notes

Technical: Natural morning lighting creating slight warmth. Subtle lens flare acceptable near window. Focus on central speaking figure, others slightly softer but faces recognizable. Film grain (subtle, Kodak Gold 200 aesthetic). One person might be slightly motion-blurred from gesture - authentic imperfection.

Authentic imperfections to include:
- Someone mid-blink or eyes half-closed
- Slightly awkward posture on one person
- Coffee cup leaving ring on table
- Laptop screen showing actual work (blurred)
- Real conversation happening, not everyone looking same direction

Style references: Protocol magazine tech coverage, Sifted European startup photography, Wired event documentation, The Information editorial style. NOT: TechCrunch Disrupt, American tech conference aesthetic.

Mood: Intimate professional gathering. The warmth of in-person connection. "This is what real networking looks like." Morning energy before the workday. Community over conference. European tech culture - ambitious but grounded.

--ar 3:2 --style raw --v 7
```

### Prompt (Kompakt)

```
Candid event photo, 5-7 professionals around standing table in modern European co-working space, 8AM morning light. Sony A7IV, 35mm f/1.8, warm window light with subtle lens flare.

Diverse group (late 20s to 50s), casual-professional attire. One person explaining with gesture, others engaged - nodding, taking phone notes, mid-coffee-sip. Natural poses, NOT staged group photo.

Environment: exposed concrete, large plants, industrial windows, people working in blurred background. On table: mix of laptops, ceramic coffee cups, croissants, phones face-down.

Authentic imperfections: someone mid-blink, motion blur on gesture. Kodak Gold film grain. Protocol/Sifted editorial style. Mood: intimate morning networking, European tech community warmth. --ar 3:2 --style raw
```

### Negative Prompt
```
posed group photo, everyone looking at camera, corporate event, conference badges, American tech aesthetic, suits, formal setting, stage or presentation, large crowd, evening event, artificial lighting
```

---

## Bild 6: Event Teaser (KINN#9)

**Dateiname:** `02-kinn9-teaser.png`
**Auflösung:** 1200 x 675 px (16:9) oder 1200 x 1200 px (1:1)
**Typ:** Grafik/Illustration

### Option A: Illustration (KINN-Stil)

```
Flat vector event announcement graphic, KINN brand style. Clean minimalist composition.

Color palette: Sage green (#5ED9A6) as accent, charcoal (#1a1a1a) for text elements, clean white (#FFFFFF) background, light grey (#F5F5F5) for subtle fills.

Central elements:
- Abstract representation of gathering: 5-7 simplified human silhouettes in loose circular arrangement, connected by subtle dotted lines suggesting network/conversation
- One silhouette slightly highlighted in sage green (the speaker/focal point)
- Small speech bubble elements floating between figures
- Subtle circuit-to-organic pattern in corner (KINN visual motif): geometric grid transitioning to flowing branch shapes

Decorative elements (subtle, not dominant):
- Connected dots pattern forming loose network in background (very light grey, almost invisible)
- Small geometric shapes scattered (squares, circles) reminiscent of pixels/data
- Organic leaf or branch element in one corner

Typography placeholder area: Leave clear space in upper portion for text overlay:
"KINN#9"
"6. Februar 2026"
"8:00 Uhr | InnCubator, Innsbruck"

Style: Modern event graphic like Figma Config announcements, Linear changelog visuals, Notion template previews. Swiss Style influence with contemporary tech aesthetic. Clean, confident, not cluttered.

No actual text in image (will be added in design software).

--ar 16:9 --style raw --stylize 50
```

### Option B: Location Photo (InnCubator)

```
Wide establishing shot of modern co-working space interior, early morning before event starts (7:45 AM feel). Shot on Sony A7 with 24mm f/2.8 wide angle lens.

Scene: The calm before the gathering. Space is ready, people haven't arrived yet.

Interior: Modern European co-working space (InnCubator Innsbruck style)
- Clean desks and standing tables arranged for collaboration
- Large floor-to-ceiling windows
- Indoor plants (large monstera, hanging plants)
- Exposed architectural elements (concrete, wood beams)
- Warm artificial lighting mixed with early morning daylight
- Coffee station visible in background, one person (staff) preparing/setting up

Through windows: Morning view of Innsbruck - could see mountain silhouette (Nordkette) if architecturally possible, or urban Innsbruck rooftops. Dawn/early morning light quality.

On one standing table (foreground, prepared for event):
- Stack of KINN-branded materials or simple name tags
- Coffee cups ready (inverted, waiting)
- Small plant as centerpiece
- Laptop open showing event schedule (screen glow)

Technical: Deep depth of field (f/8) to show full space. Cool morning light transitioning to warm interior lighting. Slight wide-angle perspective but not distorted. Clean, inviting, professional.

Mood: Anticipation. Fresh start. "This space is ready for something good to happen." Inviting and professional. The promise of connection.

--ar 16:9 --style raw --v 7
```

### Prompt (Kompakt - Option B)

```
Wide interior shot, modern co-working space, early morning 7:45AM before event. Sony A7, 24mm f/2.8, deep DOF.

Empty but prepared: clean desks, standing tables, large windows with mountain view (Nordkette Innsbruck), indoor plants, one staff member preparing coffee station in background.

Foreground table: coffee cups ready, laptop showing schedule, small plant. Cool morning light mixing with warm interior lights. Mood: calm anticipation, space ready for gathering. --ar 16:9 --style raw
```

---

## Zusammenfassung: Alle Dateien

| # | Dateiname | Format | Auflösung | Status |
|:---|:---|:---|:---|:---|
| 1 | `hero.png` | PNG | 1200x675 | FERTIG |
| 2 | `02-hype-crash.jpg` | JPG | 1200x800 | PROMPT READY |
| 3 | `02-human-ai-collab.png` | PNG | 1200x800 | PROMPT READY |
| 4 | `02-tirol-kmu.jpg` | JPG | 1200x800 | PROMPT READY |
| 5 | `02-kinn-event.jpg` | JPG | 1200x800 | PROMPT READY |
| 6 | `02-kinn9-teaser.png` | PNG | 1200x675 | PROMPT READY |

---

## Quick Reference: Parameter

### Midjourney V7
```
--ar 3:2          Aspect Ratio für Content-Bilder
--ar 16:9         Aspect Ratio für Hero/Teaser
--style raw       Realistischer Output, weniger "AI-Look"
--stylize 50-100  Für Illustrationen (weniger ist cleaner)
--stylize 0       Für maximale Prompt-Treue
--v 7             Version 7 (Standard 2025/2026)
--q 1             Quality (Standard, GPU-effizient)
```

### Nachbearbeitung
1. Download in höchster Auflösung
2. Resize auf Zielgröße (sips auf macOS)
3. Format konvertieren falls nötig (JPEG→PNG oder umgekehrt)
4. Optimieren für Web (<500KB wenn möglich)

```bash
# Beispiel: Konvertierung mit sips (macOS)
sips -s format png -Z 1200 input.jpeg --out output.png
```

---

## Changelog

| Datum | Änderung |
|:---|:---|
| 2026-01-03 | Initial version mit allen 6 Prompts |
| 2026-01-03 | Hero-Bild fertig generiert und konvertiert |
