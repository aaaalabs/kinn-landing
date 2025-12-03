# KINN Discord Auto-Role System - Entwicklungsplan

## Projektübersicht

Automatisches Rollen-System für den KINN Discord Server. Neue Mitglieder scannen einen QR-Code (oder klicken einen Link), autorisieren sich via Discord OAuth2 und erhalten automatisch die "KINNder"-Rolle.

**Ziel-URL:** `https://kinn.at/api/discord/auth`
**Projekt:** kinn.at (bereits auf Vercel deployed, Next.js)

---

## Konfiguration (bereits in Vercel eingerichtet)

### Environment Variables

```
DISCORD_CLIENT_ID=<see discord/KINNbot.txt>
DISCORD_CLIENT_SECRET=<see discord/KINNbot.txt>
DISCORD_BOT_TOKEN=<see discord/KINNbot.txt>
DISCORD_GUILD_ID=<see discord/KINNbot.txt>
DISCORD_REDIRECT_URI=https://kinn.at/api/discord/callback
DISCORD_KINNDER_ROLE_ID=<see discord/KINNbot.txt>
```

### Discord Server Details

- **Server Invite Link:** https://discord.gg/CC2ExxD3
- **KINNder Role ID:** 1438956698948599839

---

## Zu erstellende Dateien

### 1. API Route: OAuth2 Start

**Pfad:** `/app/api/discord/auth/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Prüfen ob Konfiguration vollständig
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_REDIRECT_URI) {
    return NextResponse.json(
      { error: 'Discord nicht konfiguriert' },
      { status: 500 }
    );
  }

  // State für CSRF-Schutz
  const state = Buffer.from(JSON.stringify({ ts: Date.now() })).toString('base64');

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds.join',
    state: state,
  });

  return NextResponse.redirect(
    `https://discord.com/api/oauth2/authorize?${params.toString()}`
  );
}
```

---

### 2. API Route: OAuth2 Callback

**Pfad:** `/app/api/discord/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // User hat abgebrochen
  if (error) {
    return NextResponse.redirect('https://kinn.at/discord/error?reason=cancelled');
  }

  if (!code) {
    return NextResponse.redirect('https://kinn.at/discord/error?reason=missing_code');
  }

  try {
    // 1. Access Token holen
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Token Error:', tokenData);
      throw new Error('Kein Access Token erhalten');
    }

    // 2. User-Info holen
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json();

    if (!userData.id) {
      throw new Error('Keine User-Daten erhalten');
    }

    const roleId = process.env.DISCORD_KINNDER_ROLE_ID;

    // 3. User zum Server hinzufügen (falls noch nicht Mitglied)
    const addMemberResponse = await fetch(
      `https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userData.id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: tokenData.access_token,
          roles: roleId ? [roleId] : [],
        }),
      }
    );

    // 4. Falls User bereits Mitglied (Status 204): Rolle separat hinzufügen
    if (addMemberResponse.status === 204 && roleId) {
      await fetch(
        `https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userData.id}/roles/${roleId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          },
        }
      );
    }

    // Erfolg - Weiterleitung zur Erfolgsseite
    const username = userData.global_name || userData.username || 'du';
    return NextResponse.redirect(
      `https://kinn.at/discord/success?user=${encodeURIComponent(username)}`
    );

  } catch (error) {
    console.error('Discord OAuth Error:', error);
    return NextResponse.redirect('https://kinn.at/discord/error?reason=auth_failed');
  }
}
```

---

### 3. Erfolgsseite

**Pfad:** `/app/discord/success/page.tsx`

```typescript
import Link from 'next/link';

export const metadata = {
  title: 'Willkommen bei KINN!',
  description: 'Du bist jetzt Teil der KINN Community auf Discord.',
};

export default function DiscordSuccess({
  searchParams,
}: {
  searchParams: { user?: string };
}) {
  const username = searchParams.user || 'du';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold text-white mb-4">
          Willkommen bei KINN!
        </h1>
        <p className="text-slate-300 mb-2">
          Hey <span className="text-emerald-400 font-semibold">{username}</span>!
        </p>
        <p className="text-slate-300 mb-6">
          Du bist jetzt ein <span className="text-amber-400 font-semibold">KINNder</span> - 
          Teil unserer KI-Community in Tirol.
        </p>
        
        <div className="space-y-3">
          <a
            href="https://discord.gg/CC2ExxD3"
            className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Zum Discord Server →
          </a>
          <Link
            href="/"
            className="block w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Zurück zu kinn.at
          </Link>
        </div>

        <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm">
            <span className="text-white font-medium">KI-Frühstück</span><br />
            Jeden Donnerstag 8-9 Uhr<br />
            Wechselnde Locations in Innsbruck
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

### 4. Fehlerseite

**Pfad:** `/app/discord/error/page.tsx`

```typescript
import Link from 'next/link';

export const metadata = {
  title: 'Ups - KINN Discord',
  description: 'Bei der Discord-Verbindung ist etwas schiefgelaufen.',
};

export default function DiscordError({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const errorMessages: Record<string, string> = {
    cancelled: 'Du hast die Discord-Autorisierung abgebrochen.',
    missing_code: 'Die Autorisierung war unvollständig.',
    auth_failed: 'Bei der Discord-Verbindung ist etwas schiefgelaufen.',
  };

  const reason = searchParams.reason || 'auth_failed';
  const message = errorMessages[reason] || errorMessages.auth_failed;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-6">😕</div>
        <h1 className="text-3xl font-bold text-white mb-4">
          Das hat nicht geklappt
        </h1>
        <p className="text-slate-300 mb-6">{message}</p>
        
        <div className="space-y-3">
          <Link
            href="/api/discord/auth"
            className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Nochmal versuchen
          </Link>
          <Link
            href="/"
            className="block w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Zurück zu kinn.at
          </Link>
        </div>

        <p className="text-slate-500 text-sm mt-6">
          Probleme? Schreib uns auf Discord oder via kinn.at
        </p>
      </div>
    </div>
  );
}
```

---

## Zusammenfassung: Zu erstellende Dateien

| Datei | Zweck |
|-------|-------|
| `/app/api/discord/auth/route.ts` | Startet OAuth2 Flow |
| `/app/api/discord/callback/route.ts` | Verarbeitet Callback, weist Rolle zu |
| `/app/discord/success/page.tsx` | Erfolgsseite nach Join |
| `/app/discord/error/page.tsx` | Fehlerseite |

---

## Test nach Deployment

```
# OAuth Flow starten
https://kinn.at/api/discord/auth

# Erfolgsseite testen
https://kinn.at/discord/success?user=TestUser

# Fehlerseite testen
https://kinn.at/discord/error?reason=cancelled
```

---

## QR-Code erstellen

Nach erfolgreichem Deployment einen QR-Code für diese URL erstellen:
```
https://kinn.at/api/discord/auth
```

Dieser QR-Code kann bei allen KINN Events verwendet werden.

---

## Sicherheitshinweis

Nach dem Deployment sollte der Bot Token im Discord Developer Portal zurückgesetzt werden:
1. https://discord.com/developers/applications
2. Application auswählen → Bot → Reset Token
3. Neuen Token in Vercel Environment Variables eintragen

---

## ✅ Implementation Complete (2025-12-03)

### Dateien erstellt

Alle 4 Dateien wurden erfolgreich implementiert:

1. **`/api/discord/auth.js`** - OAuth2 Start-Endpoint
   - CORS-Header konfiguriert
   - Environment-Variable-Validierung
   - CSRF-State-Token-Generierung
   - Redirect zu Discord Authorization

2. **`/api/discord/callback.js`** - OAuth2 Callback Handler
   - Token-Exchange (Authorization Code → Access Token)
   - User-Info-Abfrage von Discord API
   - Guild-Member-Hinzufügen mit KINNder-Rolle
   - Fallback: Rolle separat hinzufügen bei bestehenden Mitgliedern
   - Ausführliches Error-Logging
   - Redirect zu Success/Error-Pages

3. **`/pages/discord-success.html`** - Erfolgsseite
   - KINN Brand Styleguide konform (Work Sans, Mint #5ED9A6)
   - Personalisierte Begrüßung mit Discord-Username
   - Animated Status-Indicator
   - Links zu Discord Server und kinn.at
   - Responsive Design

4. **`/pages/discord-error.html`** - Fehlerseite
   - Dynamische Fehlermeldungen (cancelled, missing_code, auth_failed)
   - Troubleshooting-Tipps für technische Fehler
   - Retry-Button und Zurück-Navigation
   - Konsistentes KINN-Branding

### Anpassungen vom Original-Plan

Da das KINN-Projekt **kein Next.js App Router** verwendet, sondern **Vanilla HTML/JS mit Vercel Serverless Functions**, wurden folgende Änderungen vorgenommen:

| Original-Plan | Tatsächliche Implementierung |
|---------------|------------------------------|
| `/app/api/discord/auth/route.ts` | `/api/discord/auth.js` |
| `/app/api/discord/callback/route.ts` | `/api/discord/callback.js` |
| `/app/discord/success/page.tsx` | `/pages/discord-success.html` |
| `/app/discord/error/page.tsx` | `/pages/discord-error.html` |
| TypeScript + React | JavaScript (ES Modules) + Static HTML |
| Tailwind CSS | Inline CSS (Work Sans, KINN Brand) |

### Integration in bestehendes Projekt

**Profil-Seite aktualisiert:**
- `/pages/profil.html` Discord-Link zeigt jetzt auf `/api/discord/auth`
- Hinweis "Automatische KINNder-Rolle" hinzugefügt

### Nächste Schritte (vor Production Deployment)

#### 1. Environment Variables in Vercel setzen

Alle 6 Discord-Variablen müssen im Vercel Dashboard konfiguriert werden:

**⚠️ WICHTIG**: Die tatsächlichen Werte sind in `discord/KINNbot.txt` gespeichert (gitignored)

```bash
DISCORD_CLIENT_ID=<aus KINNbot.txt>
DISCORD_CLIENT_SECRET=<aus KINNbot.txt>
DISCORD_BOT_TOKEN=<aus KINNbot.txt>
DISCORD_GUILD_ID=<aus KINNbot.txt>
DISCORD_REDIRECT_URI=https://kinn.at/api/discord/callback
DISCORD_KINNDER_ROLE_ID=<aus KINNbot.txt>
```

#### 2. Testing-Workflow

**Lokal testen (Optional):**
```bash
vercel dev
# Besuche: http://localhost:3000/api/discord/auth
```

**Production Testing:**
```bash
vercel --prod
# Besuche: https://kinn.at/api/discord/auth
# Teste alle Error-Cases: Cancel, Invalid Code, etc.
```

#### 3. Discord Bot Token rotieren (KRITISCH!)

⚠️ **SICHERHEITSWARNUNG**: Der Bot Token in `/discord/KINNbot.txt` ist im Klartext gespeichert.

**Sofort nach erfolgreichem Test:**
1. Gehe zu https://discord.com/developers/applications
2. Wähle Application "KINNbot" (oder entsprechende App)
3. Bot → "Reset Token"
4. Kopiere neuen Token
5. Update Vercel Environment Variable `DISCORD_BOT_TOKEN`
6. Lösche oder `.gitignore` die Datei `/discord/KINNbot.txt`

#### 4. QR-Code erstellen

Nach erfolgreichem Deployment QR-Code generieren für:
```
https://kinn.at/api/discord/auth
```

**Empfohlene Tools:**
- https://qr-code-generator.com (kostenlos, SVG-Download)
- https://qr.io (mit Analytics)

**Verwendung:**
- Bei KINN Events auf Tischen/Rollups
- In Präsentationen
- In Print-Materialien

#### 5. Monitoring & Analytics

**Vercel Function Logs überwachen:**
```bash
vercel logs --follow
```

**Wichtige Metriken:**
- Authorization-Start-Rate
- Callback-Success-Rate
- Error-Typen (cancelled vs. auth_failed)
- Average Time-to-Complete

### Troubleshooting

**Problem: "Discord nicht konfiguriert"**
- Lösung: Alle 6 Environment Variables in Vercel prüfen

**Problem: "Kein Access Token erhalten"**
- Lösung: `DISCORD_CLIENT_SECRET` prüfen, Discord App Status checken

**Problem: "Failed to add member"**
- Lösung: Bot-Permissions im Discord Server prüfen (Manage Roles, Manage Server)

**Problem: Rolle wird nicht zugewiesen**
- Lösung: Bot-Rolle muss **höher** sein als KINNder-Rolle in der Server-Hierarchie

### Success Metrics

**MVP-Ziel:** 10+ automatische Rollenzuweisungen im ersten Monat

**Monitoring:**
- Anzahl erfolgreicher Autorisierungen
- Conversion-Rate (QR-Scan → Discord-Join)
- Error-Rate (< 5% Ziel)
