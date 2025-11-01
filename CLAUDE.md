# KINN Landing Page MVP

## Project Overview

KINN (KI Treff Innsbruck) landing page for event subscriptions with iCal feed integration.

**Stack:**
- Vanilla HTML/CSS/JavaScript
- Vercel Serverless Functions (API routes)
- Redis (Upstash) for data storage
- Resend for email delivery
- JWT for token-based authentication

## Key Features

- Email subscription with double opt-in
- iCal feed generation for calendar apps
- Admin dashboard for event management
- User profile management with preferences
- No OAuth - simple token-based auth

## Brand Guidelines

**IMPORTANT:** All UI components must follow the KINN Brand Styleguide.

See: `KINN_BRAND_STYLEGUIDE.md` for comprehensive design system including:
- No emojis policy
- KINN SVG logo usage
- Work Sans typography
- Bold Mint (#5ED9A6) color palette
- Button styles, spacing, shadows
- Email design best practices
- Accessibility guidelines

## API Endpoints

### Public Endpoints
- `POST /api/subscribe` - Initial email subscription
- `GET /api/confirm?token=...` - Email confirmation
- `GET /api/calendar.ics` - iCal feed generation
- `GET /api/profile?token=...` - Get user preferences
- `PUT /api/profile/update` - Update user preferences
- `POST /api/profile/unsubscribe` - Complete unsubscribe

### Admin Endpoints (Basic Auth)
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/events` - List all events
- `POST /api/admin/events` - Create new event
- `PUT /api/admin/events` - Update event
- `DELETE /api/admin/events` - Delete event
- `GET /api/admin/subscribers` - List subscribers

## Redis Data Structure

```javascript
// Events
"events:all" → Array<Event>

// Subscribers
"subscribers" → Set<email>

// User Preferences
"user:preferences:{emailHash}" → {
  email: string,
  notifications: { enabled: boolean },
  profileToken: string,
  subscribedAt: ISO8601,
  updatedAt: ISO8601
}

// Confirmation Tokens (temporary)
"confirm:pending:{emailHash}" → {
  email: string,
  token: string,
  expiresAt: timestamp
}
```

## Token Types

1. **Confirmation Token** (JWT)
   - Payload: `{ email, type: 'confirm' }`
   - Expiry: 24 hours
   - Use: Email address verification

2. **Profile Token** (JWT)
   - Payload: `{ email, type: 'profile' }`
   - Expiry: Never (long-lived)
   - Use: User preference management

## Environment Variables

```bash
# Redis (Upstash)
KV_REST_API_URL=...
KV_REST_API_TOKEN=...

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

## Development Workflow

```bash
# Install dependencies
npm install

# Run locally (Vercel CLI)
vercel dev

# Deploy
vercel --prod
```

## Design Principles

Following Jony Ive's philosophy:
- **Minimal** - Remove everything unnecessary
- **Elegant** - Subtle gradients, soft shadows, refined typography
- **Timeless** - No trends, no emojis, no seasonal effects
- **Purposeful** - Every element serves a function

## GDPR Compliance

- Double opt-in for email subscriptions
- User control over email notifications
- One-click unsubscribe in all emails
- Token-based preference management
- Data deletion on unsubscribe

## Spam Prevention (Emails)

- No emojis in subject lines or body
- No direct webcal:// links in email body
- Simple HTML structure (table-based layout)
- Professional tone and copy
- Clear sender identity
- Unsubscribe link in every email

## Code Style

Apply Windsurf Coding Rules from global CLAUDE.md:
- [CP01] KISS principle
- [CP02] Lines of code = debt
- [EH01] Contextual logging
- [EH02] User-friendly errors
- [SC01] Never log sensitive data
- [SC02] Validate all input
