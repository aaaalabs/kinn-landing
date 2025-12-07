# Inbound Email Webhook Deactivation

## Date: 2025-12-07

## Problem Identified

The inbound email webhook at `/api/inbound.js` was causing severe issues:

### Bounce Loop
1. Admin notifications were sent with `from: ki@in.kinn.at`
2. When these bounced (e.g., if `treff@in.kinn.at` was unreachable), bounce notifications returned to `ki@in.kinn.at`
3. The webhook tried to auto-reply to these bounces
4. These auto-replies also bounced, creating a loop

### Evidence
- 24 bounced emails in Resend logs (CSV export from 2025-12-06)
- 20 bounce loops from "Neue Anmeldung: KI Treff Verteiler" notifications
- 3 auto-replies to spam emails (Medicare, ADAC, Krankenkasse)
- 1 failed legitimate signup (`daniel@meisdaniel.con` - typo in domain)

## Solution Implemented

### 1. Webhook Deactivated
- `/api/inbound.js` now returns immediately with success status
- Original code preserved as comment for future reference
- Prevents any auto-reply attempts

### 2. Admin Email Sender Changed
- Changed from `ki@in.kinn.at` to `noreply@in.kinn.at` in `/api/signup.js`
- Prevents future bounce loops even if webhook were reactivated

### 3. Improved Filtering (for future use)
- Enhanced `shouldAutoReply()` in `/api/utils/ai-reply.js` to filter:
  - Own system emails (`ki@in.kinn.at`, `thomas@kinn.at`, `treff@in.kinn.at`)
  - Known spam patterns
  - Bounce notifications
  - Any email starting with "Re:"

## Current Email Flow (Working)

1. **User Signup** → Web form → `/api/signup`
2. **Opt-In Email** → `from: Thomas @ KINN <thomas@kinn.at>` → to User
3. **Confirmation** → User clicks link → `/api/confirm`
4. **Welcome Email** → `from: Thomas @ KINN <thomas@kinn.at>` → to User
5. **Admin Notification** → `from: noreply@in.kinn.at` → `to: treff@in.kinn.at`

## Important Notes

- User replies to confirmation/welcome emails go to `thomas@kinn.at` (NOT `ki@in.kinn.at`)
- The webhook served no clear purpose in the signup flow
- No functionality is lost by deactivating it

## Resend Dashboard Action Required

⚠️ **If a webhook is configured in Resend for `ki@in.kinn.at`:**
1. Log into Resend Dashboard
2. Navigate to Webhooks
3. Disable or delete the webhook for `ki@in.kinn.at`
4. This prevents unnecessary API calls to the deactivated endpoint

## Future Considerations

If auto-reply functionality is needed in the future:
1. Use a dedicated support email (e.g., `support@kinn.at`)
2. Add `reply_to` headers to user emails if auto-replies are desired
3. Implement strict filtering to prevent loops
4. Test thoroughly with bounce scenarios

## Files Modified

- `/api/inbound.js` - Webhook deactivated
- `/api/utils/ai-reply.js` - Filtering improved (for future use)
- `/api/signup.js` - Admin sender changed to `noreply@in.kinn.at`