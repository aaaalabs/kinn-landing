# KINN Spotlight System

LinkedIn-Spotlights für KINN Community Members vor Events.

## Zweck

Spotlights stellen KINN-Teilnehmer vor dem Event auf LinkedIn vor. Sie schaffen:
- Sichtbarkeit für die Person
- Neugier auf das Event
- Community-Building

## Verzeichnisstruktur

```
/spotlight/
  /new/              # Neue Bilder (nicht committed)
  /{hash}/           # Spotlight-Ordner (6-char MD5 vom Namen)
    index.html       # Redirect-Page mit OG-Meta-Tags
    content.json     # Strukturierte Daten
    post.md          # LinkedIn-Post Text
    kspot_{Name}.png        # Original (gitignored)
    kspot_{Name}_thumb.jpg  # Thumbnail 900px
    kspot_{Name}_sm.jpg     # Social Media Version
    .gitignore       # Ignoriert *.png
```

## Neues Spotlight erstellen

### 1. Bild vorbereiten

- Originalbild in `/spotlight/new/` ablegen
- Format: `Vorname_Nachname.png`
- Empfohlen: Quadratisch oder Portrait, min. 800px

### 2. Spotlight-Ordner erstellen

```bash
# Hash generieren
echo -n "Vorname_Nachname" | md5 | cut -c1-6
# z.B. "cebbe2"

# Ordner erstellen
mkdir spotlight/{hash}
```

### 3. Bilder verarbeiten

```bash
# Original kopieren
cp spotlight/new/Name.png spotlight/{hash}/kspot_Name.png

# Thumbnail (900px)
sips -Z 900 spotlight/{hash}/kspot_Name.png --out spotlight/{hash}/kspot_Name_thumb.jpg -s format jpeg

# Social Media Version (800px, optional)
sips -Z 800 spotlight/{hash}/kspot_Name.png --out spotlight/{hash}/kspot_Name_sm.jpg -s format jpeg
```

### 4. content.json erstellen

```json
{
  "name": "Vorname Nachname",
  "title": "Rolle / Expertise",
  "location": "Ort",
  "image": "kspot_Name_thumb.jpg",
  "linkedIn": "https://www.linkedin.com/in/handle/",
  "text": "Der Spotlight-Text...\n\nMit Zeilenumbrüchen."
}
```

### 5. post.md erstellen

Der vollständige LinkedIn-Post inkl. Hashtags.

### 6. .gitignore erstellen

```
*.png
```

### 7. Committen

```bash
git add spotlight/{hash}/
git commit -m "spotlight: add Vorname Nachname - Kurztitel"
git push
```

## Content Guidelines

### Text-Struktur

1. **Hook** — Überraschender Einstieg (Kontrast, Frage, Statement)
2. **Story** — Wer ist die Person, was macht sie besonders?
3. **KINN-Bezug** — Warum passt sie zur Community?
4. **CTA** — Event-Hinweis, Frage an Community

### Tonalität

- Direkt, nicht werblich
- Persönlich, authentisch
- Respektvoll, keine Übertreibungen
- Keine Emojis im Haupttext (nur 🎯 für Event-CTA)

### Hashtags

Standard-Set:
```
#KINNSpotlight #KINN #AITirol
```

Plus 2-3 themenspezifische (z.B. #ECommerce #Startups)

## Redis Schema

Spotlight-Status wird in Redis getrackt:

```
spotlight:{id} → {
  status: "pending" | "approved",
  approvedAt: ISO8601 | null
}
```

**Wichtig:** Bei neuem Spotlight müssen **drei Stellen** aktualisiert werden:
1. `spotlight/{hash}/index.html` — Redirect-Page mit OG-Meta-Tags erstellen
2. `api/spotlight/status.js` — ID zur `spotlightIds`-Liste hinzufügen
3. `admin/index.html` — Neue Table-Row im Spotlights-Tab hinzufügen (hardcoded HTML)

## API Endpoints

- `GET /api/spotlight/status` — Alle Spotlight-Status aus Redis
- `GET /api/spotlight/status?id={hash}` — Status eines Spotlights
- `POST /api/spotlight/approve` — Spotlight freigeben (Admin)
- `GET /api/spotlight/view?id={hash}` — Spotlight-Daten abrufen

## Beispiel-Spotlights

- `b8211f/` — David Moling (KI Automatisierung)
- `cebbe2/` — David Rettenbacher (Amazon Seller)
- `f768d7/` — Martin Hies
- `82c026/` — Matteo Castellani
- `192ca0/` — Steven Lahmann
- `8d9a3e/` — Rafael Pauley (Enabler & Brückenbauer)
