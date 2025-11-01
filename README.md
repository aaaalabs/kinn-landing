# KINN Landing Page

> **Monatlicher AI Austausch in Innsbruck**
>
> Marketing Strategy → See `MARKETING.md`

---

## Quick Start

### Local Development

```bash
npm install
npm run dev
```

### Deployment

```bash
npm run deploy
```

---

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Backend**: Vercel Serverless Functions
- **Database**: Upstash Redis (KV)
- **Email**: Resend API
- **Auth**: JWT (token-based)
- **Calendar**: iCal feed generation

---

## Features

- ✅ Email subscription with double opt-in
- ✅ Calendar feed (iCal/webcal)
- ✅ Admin dashboard (event management)
- ✅ User profiles with supply/demand matching
- ✅ Email notification preferences
- ✅ GDPR-compliant unsubscribe

---

## Project Structure

```
/mvp
├── index.html                 # Landing page
├── /pages
│   ├── success.html          # Confirmation success
│   ├── profil.html           # User profile management
│   ├── privacy.html          # Privacy policy
│   └── agb.html              # Terms of service
├── /admin
│   └── index.html            # Event management dashboard
├── /api
│   ├── signup.js             # Email subscription
│   ├── confirm.js            # Email confirmation
│   ├── calendar.ics.js       # iCal feed
│   ├── profile.js            # Get profile
│   ├── /profile
│   │   ├── update.js         # Update preferences
│   │   └── unsubscribe.js    # Unsubscribe
│   ├── /admin
│   │   ├── login.js          # Admin auth
│   │   ├── events.js         # CRUD events
│   │   └── subscribers.js    # List subscribers
│   └── /utils
│       ├── tokens.js         # JWT functions
│       ├── redis.js          # Database operations
│       └── branded-error.js  # Error pages
├── MARKETING.md              # Marketing strategy
├── KINN_BRAND_STYLEGUIDE.md  # Design system
└── CLAUDE.md                 # Project documentation
```

---

## Documentation

- **Marketing Strategy**: `MARKETING.md` - Brand voice, campaigns, growth tactics
- **Design System**: `KINN_BRAND_STYLEGUIDE.md` - Visual guidelines, components
- **Project Setup**: `CLAUDE.md` - Technical documentation, API specs
- **Event Management**: `EVENT_CREATION.md` - How to create/manage events
- **iCal Setup**: `ICAL_SETUP.md` - Calendar feed implementation

---

## Environment Variables

Required in Vercel dashboard:

```bash
# Redis (Upstash)
KINNST_KV_REST_API_URL=...
KINNST_KV_REST_API_TOKEN=...

# Email (Resend)
RESEND_API_KEY=...
SENDER_EMAIL="KINN <thomas@kinn.at>"

# JWT
JWT_SECRET=...

# Admin
ADMIN_USERNAME=...
ADMIN_PASSWORD_HASH=...

# Base URL
BASE_URL="https://kinn.at"
```

---

**Built**: 2024-11-01
**Status**: ✅ Production
