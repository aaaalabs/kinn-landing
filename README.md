# KINN MVP Landing Page

> **Status**: Day 1 Complete ✅
> **Type**: Static HTML (Manual Workflow)

---

## 🚀 Quick Start

### Local Testing

```bash
# Navigate to MVP folder
cd /Users/libra/GitHub_quicks/_KINN/mvp

# Start local server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

---

## 📁 Files

```
/mvp
  index.html        # Complete landing page (195 lines)
  README.md         # This file
```

---

## ✨ Features

- ✅ Schwarz/Weiß minimal design
- ✅ KINN Logo inline SVG
- ✅ Responsive (mobile & desktop)
- ✅ Modal with email input
- ✅ mailto: integration
- ✅ Keyboard shortcuts (Esc to close)
- ✅ Zero dependencies

---

## 🧪 Testing Checklist

### Desktop
- [ ] Chrome
- [ ] Safari
- [ ] Firefox

### Mobile
- [ ] iPhone Safari
- [ ] Android Chrome

### Functionality
- [ ] Logo displays correctly
- [ ] Button opens modal
- [ ] Email input works
- [ ] Submit opens mail client
- [ ] Escape closes modal
- [ ] Click outside closes modal

---

## 📧 Manual Workflow

### When user signs up:

1. **User Action**: Fills email → Clicks "Abschicken"
2. **System**: Opens mail client with pre-filled email to treff@inbound.kinn.at
3. **Email lands in your inbox**
4. **Your Action** (2 minutes):
   - Copy email to Google Sheets
   - Send confirmation email (template below)
   - Mark in sheets when confirmed

---

## 📝 Email Templates

### Template 1: Confirmation Email

```
To: [user email]
Subject: Bestätige deine Anmeldung - KINN KI Treff Innsbruck

Servus [NAME],

danke für dein Interesse am KINN KI Treff Innsbruck!

Bitte bestätige kurz deine Email-Adresse:
→ Ja, ich bin dabei! (Einfach auf diese Email antworten)

Was dich erwartet:
📅 Monatliche Stammtische in Die Bäckerei, Innsbruck
🧠 Austausch über KI, Neural Networks, LLMs
🤝 Community von Entwicklern, Forschern & Enthusiasten

Du bekommst rechtzeitig eine Einladung zum nächsten Treff!

Bis bald,
Das KINN Team

---
P.S.: Nicht mehr dabei? Einfach Bescheid geben.
```

### Template 2: Welcome Email (after confirmation)

```
To: [user email]
Subject: Willkommen beim KINN KI Treff! 🎉

Servus [NAME],

super, du bist dabei!

Der nächste KINN KI Stammtisch:
📅 [DATUM], [UHRZEIT]
📍 Die Bäckerei, Dreiheiligenstraße 21a, Innsbruck
🧠 Thema: [THEMA]

Ich schicke dir ca. 1 Woche vorher eine Einladung mit allen Details.

Bis bald!
Das KINN Team

💬 Discord: [link]
🔗 LinkedIn: [link]
```

---

## 🚀 Deployment Options

### Option 1: GitHub Pages

```bash
# Create repo
git init
git add .
git commit -m "MVP launch"
git branch -M main
git remote add origin https://github.com/[user]/kinn-landing.git
git push -u origin main

# Enable GitHub Pages in repo settings
# Point to main branch, / (root)
```

### Option 2: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production
vercel --prod
```

### Option 3: Netlify Drop

1. Go to https://app.netlify.com/drop
2. Drag & drop the `mvp` folder
3. Done! Get instant URL

---

## 📊 Success Metrics (Week 1)

```
Target: 10+ email signups
Track in: Google Sheets
Time per signup: ~2 minutes (manual)
```

---

## 🔄 Next Steps (Day 8 Transition)

When ready to automate:
1. Build Next.js backend (see /plan.md Track B)
2. Setup Google Calendar API
3. Import emails from Sheets → Redis
4. Switch mailto: to POST /api/signup
5. Deploy automated system
6. Create first event → All invited! 🎉

---

## 💡 Tips

**Email subject line optimization:**
- Current: "Eintragen in KI Treff Verteiler"
- Can test: "KINN Stammtisch Anmeldung" or "KI Treff Innsbruck: [NAME]"

**Spam prevention:**
- Create contact: treff@inbound.kinn.at in your contacts
- SPF/DKIM if using custom domain

**Response templates:**
- Save templates in Gmail for faster replies
- Use keyboard shortcuts (Cmd+Option+1 etc)

---

**Built**: 2025-10-31
**Launch**: TBD
**Status**: ✅ Ready for testing
