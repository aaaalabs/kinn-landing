# Google Calendar OAuth Setup

Komplette Anleitung für die Konfiguration von Google Calendar OAuth für KINN.

## Übersicht

**Was gebaut wurde:**
- OAuth Flow für Google Calendar Integration
- Encrypted token storage in Redis (AES-256-GCM)
- Automatic calendar event creation für subscribers

**User erhält:**
- KI Treff Events automatisch in Google Kalender
- Keine Emails, keine Newsletter
- Einfacher Zugriff über Kalender-App

---

## Teil 1: Google Cloud Console Setup

### Schritt 1: Redirect URI konfigurieren

⚠️ **WICHTIG**: Ohne diesen Schritt funktioniert der OAuth Flow nicht!

**1. Gehe zu:** https://console.cloud.google.com/apis/credentials

**2. Wähle dein OAuth 2.0 Client ID Project**
- Name: (z.B. "KINN Calendar Integration")

**3. Füge Authorized redirect URI hinzu:**
```
https://kinn.at/api/oauth/callback
```

**4. Klicke "Save"**

**5. Warte ~5 Minuten** (Google propagiert Änderungen)

### Schritt 2: OAuth Consent Screen konfigurieren

**1. Gehe zu:** https://console.cloud.google.com/apis/credentials/consent

**2. User Type:**
- ☑️ External (für alle Google-User)
- Falls "Internal" gewählt: Nur deine Google Workspace User können authorizen

**3. App Information:**
```
App name: KINN KI Treff Innsbruck
User support email: thomas@kinn.at
Developer contact: thomas@kinn.at
```

**4. App Logo (Optional):**
- Upload KINN Logo (512x512 PNG)

**5. Scopes:**
```
https://www.googleapis.com/auth/calendar.events
```

**6. Test Users (während Development):**
- Füge deine eigene Email hinzu für Testing

**7. Publish App:**
- Für Production: "Publish App" → Verification nötig (kann Tage dauern)
- Für Testing: Bleibt im "Testing" Modus (nur Test Users)

---

## Teil 2: Testen des OAuth Flows

### Test 1: Lokales Testing (Optional)

Falls du lokal testen willst (mit `vercel dev`):

**1. Füge localhost redirect hinzu:**
```
http://localhost:3000/api/oauth/callback
```

**2. Update .env lokal:**
```bash
BASE_URL=http://localhost:3000
```

**3. Run dev server:**
```bash
vercel dev
```

**4. Test Flow:**
```
http://localhost:3000/api/oauth/authorize?email=deine@email.com
```

### Test 2: Production Testing

**1. Registriere dich über Landing Page:**
```
https://kinn.at
→ Drücke "I"
→ Gib deine Email ein
→ Klicke "Abschicken"
```

**2. Bestätige Opt-In Email:**
```
Email öffnen
→ "Ja, ich bin dabei! 🧠" Button klicken
```

**3. Success Page:**
```
✅ Bestätigung erfolgreich!
→ "📅 Kalender verbinden" Button klicken
```

**4. Google OAuth Consent Screen:**
```
Google Account wählen
→ "Allow" für Calendar Events
```

**5. Success:**
```
🎉 Kalender verbunden!
→ Tokens sind encrypted in Redis gespeichert
```

### Test 3: Redis Token Verification

**Prüfe ob Tokens gespeichert wurden:**

Via Upstash Console:
```
1. Gehe zu: https://console.upstash.com/redis
2. Wähle deine Database
3. CLI Tab
4. Run: KEYS oauth:tokens:*
5. Run: GET oauth:tokens:deine@email.com
```

Du solltest einen encrypted string sehen (base64-encoded AES-GCM).

---

## Teil 3: OAuth Flow Architektur

### Endpoints

**1. /api/oauth/authorize**
```
GET /api/oauth/authorize?email=user@example.com

→ Generates JWT state token (CSRF protection)
→ Redirects to Google OAuth consent screen
→ Scopes: calendar.events
→ Access type: offline (refresh token)
```

**2. /api/oauth/callback**
```
GET /api/oauth/callback?code=...&state=...

→ Verifies state token (CSRF check)
→ Exchanges code for access_token + refresh_token
→ Encrypts tokens (AES-256-GCM)
→ Stores in Redis: oauth:tokens:{email}
→ Redirects to success page
```

### Security Features

**1. Token Encryption:**
```javascript
// AES-256-GCM
const encryptedTokens = encrypt({
  access_token: "ya29.a0...",
  refresh_token: "1//0g...",
  expiry_date: 1735689600000,
  scope: "https://www.googleapis.com/auth/calendar.events",
  token_type: "Bearer"
})

// Format: iv:authTag:ciphertext (all base64)
```

**2. CSRF Protection:**
```javascript
// State parameter = JWT with email + 15min expiry
const state = generateConfirmToken(email)
// Verified in callback before token exchange
```

**3. Redis Storage:**
```
Key: oauth:tokens:user@example.com
Value: <encrypted token string>
TTL: None (tokens persist, refresh wenn expired)
```

### Token Refresh Logic (Future)

Wenn access_token expired (nach ~1 Stunde):

```javascript
// Pseudo-code für Event Creation
if (Date.now() > tokens.expiry_date) {
  // Use refresh_token to get new access_token
  const newTokens = await refreshAccessToken(tokens.refresh_token)
  // Re-encrypt and store
  await storeOAuthTokens(email, encryptTokens(newTokens))
}
```

---

## Teil 4: Environment Variables

Bereits konfiguriert in Vercel Production:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>

# Encryption
ENCRYPTION_KEY=<base64-encoded-32-bytes>

# Base URL für Redirects
BASE_URL=https://kinn.at

# JWT Signing
JWT_SECRET=<base64-encoded-secret>

# Redis (Upstash KV)
KINNST_KV_REST_API_URL=https://true-panther-30432.upstash.io
KINNST_KV_REST_API_TOKEN=<your-token>
KINNST_REDIS_URL=rediss://default:...@true-panther-30432.upstash.io:6379
```

---

## Teil 5: Troubleshooting

### Error: "redirect_uri_mismatch"

**Problem:** Redirect URI nicht in Google Cloud Console konfiguriert

**Fix:**
1. Gehe zu https://console.cloud.google.com/apis/credentials
2. Wähle OAuth Client ID
3. Füge hinzu: `https://kinn.at/api/oauth/callback`
4. Save + warte 5 Minuten

### Error: "access_denied"

**Problem:** User hat Zugriff abgelehnt oder App nicht published

**Fix:**
- User: Erneut versuchen, "Allow" klicken
- App: Publish in Google Cloud Console oder User zu "Test Users" hinzufügen

### Tokens nicht in Redis

**Check 1:** Vercel Logs prüfen
```bash
vercel logs --follow
# Suche nach: [OAUTH] Tokens stored successfully
```

**Check 2:** Redis Keys prüfen
```bash
# Upstash Console → CLI
KEYS oauth:tokens:*
```

**Check 3:** Encryption Key valid?
```bash
# Muss 32 bytes sein wenn base64-decoded
echo $ENCRYPTION_KEY | base64 -d | wc -c
# Output: 32
```

### "Invalid state token"

**Problem:** JWT state expired oder ungültig

**Häufig:** User hat >15 Minuten zwischen authorize und callback gewartet

**Fix:**
- Flow neu starten
- State hat 48h TTL (via generateConfirmToken)

---

## Teil 6: Next Steps

**Nach erfolgreichem OAuth Setup:**

✅ Phase 1: Opt-In System
✅ Phase 2: Google Calendar OAuth
⏳ Phase 3: Event Creation API

**Phase 3 beinhaltet:**
- Admin endpoint: `/api/events/create`
- Bulk calendar invite creation
- Automatic event addition für alle OAuth users
- Error handling für expired tokens

---

## Support

Bei Problemen:
- Google OAuth Docs: https://developers.google.com/identity/protocols/oauth2
- Upstash Redis: https://console.upstash.com
- KINN: thomas@kinn.at
