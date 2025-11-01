# Resend Inbound Setup für ki@kinn.at

Schritt-für-Schritt Anleitung für die Konfiguration von AI-powered Auto-Replies auf `ki@kinn.at`.

## Übersicht

**Flow:**
```
Email → ki@kinn.at (Resend Inbound)
  ↓
  Webhook → https://kinn.at/api/inbound
  ↓
  Fetch Full Email Content (Resend API)
  ↓
  Generate AI Reply (GROQ Llama 4 Scout)
  ↓
  Send Reply (Resend)
```

## Schritt 1: DNS Konfiguration

### Option A: Direkt auf ki@kinn.at (Empfohlen)

Füge den MX Record für `kinn.at` hinzu:

```
Type: MX
Name: @
Value: [MX Record von Resend Dashboard]
Priority: 10
```

⚠️ **Wichtig**: Wenn bereits andere MX Records existieren (z.B. Google Workspace), gehe zu Option B.

### Option B: Subdomain inbound.kinn.at

Falls bereits MX Records existieren, verwende eine Subdomain:

```
Type: MX
Name: inbound
Value: [MX Record von Resend Dashboard]
Priority: 10
```

Dann Email-Adresse wird: `ki@inbound.kinn.at`

### MX Record finden

1. Gehe zu Resend Dashboard: https://resend.com/domains
2. Wähle Domain `kinn.at` (oder erstelle sie)
3. Aktiviere "Receiving" Toggle
4. Kopiere den MX Record Wert

## Schritt 2: Webhook in Resend Dashboard konfigurieren

1. **Gehe zu Webhooks**: https://resend.com/webhooks
2. **Klicke "Add Webhook"**
3. **Endpoint URL**: `https://kinn.at/api/inbound`
4. **Event Type wählen**: `email.received` ✅
5. **Andere Events**: Alle deaktivieren
6. **Save Webhook**

### Webhook Signature Verification (Optional, für Production empfohlen)

Resend signiert Webhooks mit einem Secret. Für zusätzliche Sicherheit:

```javascript
// In /api/inbound.js
import { verifyWebhookSignature } from 'resend';

const signature = req.headers['resend-signature'];
const isValid = verifyWebhookSignature(req.body, signature, process.env.RESEND_WEBHOOK_SECRET);

if (!isValid) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

## Schritt 3: Email-Routing testen

### Test 1: Email senden
Sende eine Test-Email an `ki@kinn.at`:

```
To: ki@kinn.at
Subject: Test Email
Body: Hallo! Ich teste den Auto-Reply.
```

### Test 2: Logs prüfen

**Vercel Logs**:
```bash
vercel logs --follow
```

Erwartete Logs:
```
[INBOUND] Received email: { email_id: "...", from_domain: "gmail.com", to: [...], subject: "Test Email" }
[AI-REPLY] Generated reply for subject: Test Email
[INBOUND] Reply sent successfully: { reply_id: "...", to: "sender@example.com" }
```

### Test 3: Reply empfangen

Prüfe deine Inbox für die Auto-Reply von `ki@kinn.at` mit:
- Tiroler Ton ("Servus!", "Griaß di!")
- KINN Branding
- Relevante Info basierend auf deiner Frage

## Architektur

### Dependencies
```json
{
  "resend": "6.4.0-canary.0",  // Canary version für Inbound support
  "groq-sdk": "^0.7.0"          // AI-powered replies
}
```

### Files
```
/api/inbound.js           - Webhook endpoint (email.received)
/api/utils/ai-reply.js    - GROQ AI reply generator
```

### Environment Variables (bereits konfiguriert)
```
RESEND_API_KEY            - Resend API key
GROQ_API_KEY              - GROQ API key
GROQ_MODEL                - meta-llama/llama-4-scout-17b-16e-instruct
SENDER_EMAIL              - KINN <ki@kinn.at>
```

## Auto-Reply Regeln

### ✅ Sendet Auto-Reply bei:
- Normale User-Emails
- Fragen zu KINN Events
- Anmeldungen
- Feedback

### ❌ Kein Auto-Reply bei:
- `noreply@` Adressen
- Auto-Responder (Subject: "Out of office")
- Delivery Failures (mailer-daemon)
- Bounce Notifications

Logic: `shouldAutoReply()` in `/api/utils/ai-reply.js`

## AI System Prompt

```
Du bist der KI-Assistent für KINN (Künstliche Intelligenz Netzwerk Innsbruck).

**Deine Rolle:**
- Beantworte Fragen zum KINN KI Treff Innsbruck
- Informiere über KI-Events in Tirol
- Sei freundlich, professionell und auf Tirolerisch sympathisch

**KINN Info:**
- Wo Tiroler KI Profil bekommt
- Events in Innsbruck für KI-Interessierte
- Community für KI-Professionals und Enthusiasts
- Google Calendar Integration für Event-Einladungen

**Wichtig:**
- Kurze, prägnante Antworten (max 3-4 Sätze)
- Tiroler Ton (z.B. "Servus!", "Griaß di!")
- Bei technischen Fragen: Auf nächstes Event verweisen
- Bei Anmeldung: Bestätigen dass sie in den Verteiler aufgenommen wurden
```

## Troubleshooting

### Email kommt nicht an

**Check 1**: DNS Records propagiert?
```bash
dig MX kinn.at
# Sollte Resend MX record zeigen
```

**Check 2**: Resend Dashboard Logs
- https://resend.com/emails
- Filter: "Inbound"
- Status prüfen

### Webhook wird nicht getriggert

**Check 1**: Webhook korrekt konfiguriert?
- URL: `https://kinn.at/api/inbound` (nicht localhost!)
- Event: `email.received` ✅

**Check 2**: Endpoint erreichbar?
```bash
curl -X POST https://kinn.at/api/inbound \
  -H "Content-Type: application/json" \
  -d '{"type":"email.received","data":{"email_id":"test"}}'
```

### Auto-Reply wird nicht gesendet

**Check Logs**:
```bash
vercel logs --follow
```

Mögliche Fehler:
- `AI reply generation failed` - GROQ API Issue
- `Reply sending failed` - Resend API Issue
- `Auto-reply skipped` - no-reply detected (erwartetes Verhalten)

## Performance

**Expected Latency**:
- Webhook receive: ~50ms
- Email fetch: ~200ms
- AI reply generation: ~1-3s (GROQ Llama 4 Scout)
- Email send: ~200ms
- **Total**: ~2-4 seconds

**Cost Estimate**:
- Resend Inbound: Free (Early Access)
- GROQ API: $0.000044 per request (~$0.044 per 1000 emails)
- Vercel Function: Free (Hobby tier: 100 GB-Hrs/month)

## Next Steps

Nach erfolgreichem Setup:

1. **Monitor first week**: Prüfe Logs und User Feedback
2. **Tune AI prompt**: Basierend auf echten User-Fragen
3. **Add fallback**: Wenn AI fails, route to human (treff@in.kinn.at)
4. **Analytics**: Track reply rate, user satisfaction

## Support

Bei Fragen:
- Resend Docs: https://resend.com/docs
- GROQ Docs: https://console.groq.com/docs
- KINN: thomas@kinn.at
