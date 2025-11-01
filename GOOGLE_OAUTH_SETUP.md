# Google OAuth Setup für KINN Calendar Integration

## Problem: Error 400: invalid_request

**Fehlermeldung**: "You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy"

**Ursache**: Die `redirect_uri` ist nicht in der Google Cloud Console autorisiert.

---

## Lösung: Google Cloud Console Konfiguration

### 1. Google Cloud Console öffnen

Gehe zu: https://console.cloud.google.com/

### 2. Projekt auswählen oder erstellen

- Wähle ein bestehendes Projekt oder erstelle ein neues: "KINN Calendar Integration"

### 3. OAuth Consent Screen konfigurieren

**Navigation**: APIs & Services → OAuth consent screen

**Einstellungen**:
- **User Type**: External (für öffentliche App)
- **App name**: KINN KI Treff Calendar
- **User support email**: admin@libralab.ai (oder deine Email)
- **Developer contact**: admin@libralab.ai

**Scopes hinzufügen**:
- `https://www.googleapis.com/auth/calendar.events` (Calendar Events erstellen/lesen)

**Test Users** (optional während Development):
- Füge Test-Email-Adressen hinzu

### 4. OAuth Client ID erstellen

**Navigation**: APIs & Services → Credentials → Create Credentials → OAuth client ID

**Application type**: Web application

**Name**: KINN Production

**Authorized redirect URIs** - **KRITISCH!**

Füge EXAKT diese URIs hinzu:
```
https://kinn.at/api/oauth/callback
```

Optionale Development URIs:
```
http://localhost:3000/api/oauth/callback
```

**WICHTIG**:
- **Keine** trailing slashes: `/api/oauth/callback/` ❌
- **Exakte** URL-Übereinstimmung: `https://kinn.at/api/oauth/callback` ✅
- Jede zusätzliche Domain (z.B. `www.kinn.at`) muss separat hinzugefügt werden

### 5. Client ID und Secret kopieren

Nach dem Erstellen erhältst du:
- **Client ID**: `XXXXXXXXXX.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-XXXXXXXXXXXXXXXX`

**Diese Werte sind GEHEIM - nie in Git committen!**

---

## Vercel Environment Variables

Setze diese Environment Variables in Vercel:

```bash
GOOGLE_CLIENT_ID=XXXXXXXXXX.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-XXXXXXXXXXXXXXXX
BASE_URL=https://kinn.at
```

### Via Vercel Dashboard:
1. Gehe zu: https://vercel.com/[dein-projekt]/settings/environment-variables
2. Füge die drei Variables hinzu
3. Environment: Production
4. Redeploy: `vercel --prod`

### Via Vercel CLI:
```bash
# Client ID
printf 'XXXXXXXXXX.apps.googleusercontent.com' | vercel env add GOOGLE_CLIENT_ID production

# Client Secret
printf 'GOCSPX-XXXXXXXXXXXXXXXX' | vercel env add GOOGLE_CLIENT_SECRET production

# Base URL
printf 'https://kinn.at' | vercel env add BASE_URL production
```

---

## OAuth Flow Übersicht

```
1. User klickt "Kalender verbinden" auf Success Page
   ↓
2. /api/oauth/authorize?email=user@example.com
   ↓
3. Redirect zu Google OAuth Consent Screen
   redirect_uri: https://kinn.at/api/oauth/callback
   scope: calendar.events
   access_type: offline (für refresh token)
   ↓
4. User erlaubt Zugriff
   ↓
5. Google redirected zu: /api/oauth/callback?code=XXX&state=YYY
   ↓
6. Backend tauscht code gegen access_token + refresh_token
   ↓
7. Tokens werden verschlüsselt in Redis gespeichert
   ↓
8. User wird zu Success Page redirected mit Bestätigung
```

---

## Testing

### Manueller Test:
1. Gehe zu https://kinn.at
2. Trage Email ein
3. Bestätige Email
4. Klicke "Kalender verbinden"
5. Erlaube Google Calendar Zugriff
6. Sollte zu Success Page redirecten

### Expected URLs:
```
Start:      https://kinn.at/api/oauth/authorize?email=test@example.com
Redirect:   https://accounts.google.com/o/oauth2/v2/auth?client_id=...
Callback:   https://kinn.at/api/oauth/callback?code=...&state=...
Success:    https://kinn.at/pages/success.html
```

---

## Häufige Fehler

### Error 400: invalid_request
**Ursache**: redirect_uri nicht in Google Console konfiguriert
**Lösung**: Füge exakte URI in "Authorized redirect URIs" hinzu

### Error 401: invalid_client
**Ursache**: GOOGLE_CLIENT_ID oder GOOGLE_CLIENT_SECRET falsch
**Lösung**: Überprüfe Environment Variables in Vercel

### Error 403: access_denied
**Ursache**: User hat Zugriff verweigert
**Lösung**: Normal - User muss neu authorisieren

### "This app isn't verified"
**Ursache**: OAuth Consent Screen ist im "Testing" Modus
**Lösung**:
- Für Development: Test Users hinzufügen
- Für Production: App bei Google zur Verifizierung einreichen

---

## Sicherheit

### Token Verschlüsselung
OAuth Tokens werden mit AES-256-GCM verschlüsselt bevor sie in Redis gespeichert werden.

**Environment Variable**:
```bash
ENCRYPTION_KEY=32-byte-hex-string (64 characters)
```

Generieren:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### State Parameter (CSRF Protection)
Der `state` Parameter ist ein JWT Token mit:
- Email des Users
- Timestamp
- 15-Minuten Expiry

Dies verhindert CSRF Attacks.

---

## Checklist

- [ ] Google Cloud Projekt erstellt
- [ ] OAuth Consent Screen konfiguriert
- [ ] OAuth Client ID erstellt
- [ ] Redirect URI hinzugefügt: `https://kinn.at/api/oauth/callback`
- [ ] Client ID & Secret in Vercel Environment Variables gesetzt
- [ ] BASE_URL in Vercel gesetzt
- [ ] ENCRYPTION_KEY generiert und gesetzt
- [ ] Vercel redeploy durchgeführt
- [ ] OAuth Flow getestet

---

## Production Deployment

Sobald alles funktioniert:

1. **OAuth Consent Screen → Publishing Status**: Von "Testing" zu "In Production" wechseln
2. **Optional**: App Verification bei Google einreichen (falls >100 users)
3. **Monitoring**: OAuth Success/Failure Logs in Vercel Functions checken

---

**Last Updated**: 2025-01-11
**Status**: Requires Google Cloud Console Configuration
