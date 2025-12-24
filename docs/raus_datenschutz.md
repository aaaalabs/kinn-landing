# RAUS 2.0 Datenschutz-Evaluation

## Executive Summary

| Aspekt | Status | Risiko |
|--------|--------|--------|
| **Datenminimierung** | Teilweise | Mittel |
| **Drittanbieter** | Kritisch | Hoch |
| **Speicherung** | OK | Niedrig |
| **Einwilligung** | Fehlt | Hoch |
| **AVV-Pflicht** | Ja | Mittel |

**Gesamtbewertung: Nachbesserung erforderlich vor Produktiveinsatz**

---

## 1. Datenfluss-Analyse

```
User Browser
    │
    ├─► Audio/Text
    │
    ▼
Vercel Serverless (EU/US)
    │
    ├──────────────────────────────────────┐
    │                                      │
    ▼                                      ▼
AssemblyAI (USA)                     Groq (USA)
- Audio Upload                       - Transcript/Text
- Transkription                      - Strukturierte Extraktion
- 30 Tage Retention                  - Keine Speicherung (Inference)
```

### Verarbeitete Daten

| Datentyp | Personenbezug | Weitergabe an |
|----------|---------------|---------------|
| Voice Recording | Ja (Stimmbiometrie) | AssemblyAI |
| Transcript | Potentiell (Namen, Firma) | Groq |
| Extrahierte Daten | Potentiell | Keine (Client only) |

---

## 2. Drittanbieter-Analyse

### AssemblyAI (Speech-to-Text)

| Aspekt | Details |
|--------|---------|
| **Standort** | USA (San Francisco) |
| **Datenspeicherung** | 30 Tage auf deren Servern |
| **GDPR-Compliance** | Ja, DPA verfügbar |
| **SOC 2** | Ja |
| **HIPAA** | Optional |
| **Data Deletion API** | Ja (`DELETE /v2/transcript/{id}`) |

**Risiken:**
- Audio wird in USA verarbeitet und 30 Tage gespeichert
- Stimmbiometrie = biometrische Daten (Art. 9 DSGVO)
- Kein EU-Datacenter verfügbar

**Mitigations:**
- AVV (Auftragsverarbeitungsvertrag) abschließen
- Data Deletion API nutzen nach Verarbeitung
- Opt-in für Voice explizit einholen

### Groq (LLM Inference)

| Aspekt | Details |
|--------|---------|
| **Standort** | USA |
| **Datenspeicherung** | Keine (Zero Data Retention) |
| **GDPR-Compliance** | Ja |
| **SOC 2** | Ja |

**Risiken:**
- Transkripte können Namen, Firmen enthalten
- Durchleitung durch USA

**Mitigations:**
- Zero Retention = geringes Risiko
- Keine Speicherung = keine Löschpflicht

---

## 3. DSGVO-Checkliste

### Art. 6 - Rechtsgrundlage

| Option | Status | Empfehlung |
|--------|--------|------------|
| **Einwilligung (Art. 6 Abs. 1 lit. a)** | Fehlt | Implementieren |
| Vertrag (Art. 6 Abs. 1 lit. b) | N/A | - |
| Berechtigtes Interesse (Art. 6 Abs. 1 lit. f) | Möglich | Riskant |

**Empfehlung:** Explizite Einwilligung vor Aufnahme einholen.

### Art. 7 - Einwilligungsbedingungen

Aktuell fehlt:
- [ ] Checkbox "Ich stimme der Verarbeitung meiner Sprachaufnahme zu"
- [ ] Link zur Datenschutzerklärung
- [ ] Hinweis auf Drittländer-Transfer (USA)
- [ ] Widerrufsrecht-Hinweis

### Art. 9 - Besondere Kategorien (Biometrische Daten)

Stimmaufnahmen = potentiell biometrische Daten, wenn zur Identifizierung nutzbar.

**Argument dagegen:** Wir nutzen die Stimme nur zur Transkription, nicht zur Identifizierung.
**Argument dafür:** AssemblyAI könnte theoretisch Speaker Identification anbieten.

**Empfehlung:** Konservativ als biometrisch behandeln → Explizite Einwilligung.

### Art. 13 - Informationspflichten

Fehlende Informationen:
- [ ] Name des Verantwortlichen
- [ ] Zweck der Verarbeitung
- [ ] Empfänger (AssemblyAI, Groq)
- [ ] Drittland-Transfer (USA)
- [ ] Speicherdauer
- [ ] Betroffenenrechte

### Art. 28 - Auftragsverarbeitung

| Anbieter | AVV erforderlich | Status |
|----------|------------------|--------|
| AssemblyAI | Ja | Offen |
| Groq | Ja | Offen |
| Vercel | Ja | Vermutlich vorhanden |

---

## 4. Empfehlungen

### Kurzfristig (vor Go-Live)

1. **Consent-Banner vor Aufnahme**
   ```javascript
   // Vor startRecording()
   if (!await showConsentDialog()) return;
   ```

2. **Datenschutz-Hinweis im UI**
   ```html
   <p class="privacy-notice">
     Deine Aufnahme wird via AssemblyAI (USA) transkribiert
     und via Groq (USA) analysiert.
     <a href="/datenschutz">Mehr erfahren</a>
   </p>
   ```

3. **AVVs abschließen**
   - AssemblyAI: https://www.assemblyai.com/legal/dpa
   - Groq: Kontakt erforderlich

### Mittelfristig

4. **Audio-Löschung nach Verarbeitung**
   ```javascript
   // Nach erfolgreicher Transkription
   await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
     method: 'DELETE',
     headers: { 'Authorization': process.env.ASSEMBLYAI_API_KEY }
   });
   ```

5. **EU-Alternative für Voice** (wenn verfügbar)
   - Whisper on Azure EU
   - Deepgram EU
   - Self-hosted Whisper

### Langfristig

6. **On-Premise Option**
   - Whisper lokal hosten
   - Ollama/LLama für Extraktion
   - Zero Drittanbieter

---

## 5. Datenschutzerklärung (Entwurf)

```markdown
## Sprachaufnahmen (KINN:RAUS)

### Was wir verarbeiten
- Sprachaufnahmen zur Transkription
- Transkribierte Texte zur Strukturierung

### Warum
- Vereinfachte Einreichung von Use Cases
- Automatische Extraktion strukturierter Daten

### Wer verarbeitet
- **AssemblyAI, Inc.** (USA) - Transkription
  - Speicherdauer: 30 Tage
  - DPA: Ja
- **Groq, Inc.** (USA) - KI-Extraktion
  - Speicherdauer: Keine (Zero Retention)
  - DPA: Ja

### Drittland-Transfer
Daten werden in die USA übermittelt. Rechtsgrundlage:
Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).

### Deine Rechte
- Widerruf der Einwilligung jederzeit
- Löschung der Aufnahme auf Anfrage
- Auskunft über gespeicherte Daten

### Kontakt
datenschutz@kinn.at
```

---

## 6. Risk Matrix

| Risiko | Wahrscheinlichkeit | Impact | Gesamtrisiko |
|--------|-------------------|--------|--------------|
| DSGVO-Beschwerde | Mittel | Hoch | **Hoch** |
| Datenleck bei Drittanbieter | Niedrig | Hoch | Mittel |
| Biometrie-Klassifizierung | Niedrig | Hoch | Mittel |
| Fehlende AVVs | Hoch | Mittel | **Hoch** |
| Negative PR | Niedrig | Niedrig | Niedrig |

---

## 7. Fazit

**Aktueller Stand:** Die Lösung ist technisch funktional, aber DSGVO-compliance fehlt.

**Vor Produktiveinsatz:**
1. Consent-Dialog implementieren
2. Datenschutzerklärung erweitern
3. AVVs mit AssemblyAI und Groq abschließen

**Aufwand:** ~2-4 Stunden Implementierung + 1-2 Tage AVV-Prozess

**Alternative:** Text-Only Mode als Default (kein Voice) bis Compliance fertig.
