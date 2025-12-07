# KINN-RADAR Security Setup

## Email Gateway Architecture

### Smart Filter Chain
```
Newsletter → thomas@kinn.at → [Forward] → radar@in.kinn.at → AI Processing
           (Human Filter)                (Protected Endpoint)
```

## Sender Whitelist

Only the following email addresses can send to radar@in.kinn.at:

### LibraLab Accounts
- **thomas@kinn.at** - Main KINN address
- **thomas@libralab.ai** - LibraLab primary
- **thomas@libralab.at** - LibraLab Austria
- **admin@libralab.ai** - Admin account

### Personal Accounts
- **thomas.arzt@gmail.com** - Personal Gmail
- **thomas.seiger@gmail.com** - Alternative Gmail

### System
- **treff@in.kinn.at** - For testing and system emails

## Benefits of this Architecture

### 1. Spam Protection
- radar@in.kinn.at remains clean
- No random emails trigger AI processing
- Prevents abuse of compute resources

### 2. Quality Control
- You see every newsletter before forwarding
- Can filter out non-relevant emails
- Manual review option for new sources

### 3. Cost Control
- AI processing only for legitimate newsletters
- No wasted Groq API calls on spam
- Predictable usage patterns

### 4. Flexible Expansion
- Easy to add trusted senders later
- Can implement domain-based whitelisting
- Option for multi-user access in future

## Setup Instructions

### Step 1: Newsletter Subscriptions
1. Subscribe to newsletters using thomas@kinn.at
2. Confirm all opt-in emails
3. Newsletters start arriving at your inbox

### Step 2: Email Forwarding

#### Gmail Filter
```
Settings → Filters and Blocked Addresses → Create new filter

From: (@inncubator.at OR @startup.tirol OR @wko.at OR @aiaustria.com OR @standort-tirol.at OR @impacthub.net OR @diebaeckerei.at)
Forward to: radar@in.kinn.at
Skip the Inbox: Optional
```

#### Manual Forwarding
- Simply forward interesting newsletters to radar@in.kinn.at
- Subject and content preserved
- Processing happens within 1-2 minutes

### Step 3: Verification
1. Forward a test newsletter to radar@in.kinn.at
2. Check Google Sheets after 5 minutes
3. Events should appear in "Active Events" tab

## Security Configuration

### Current Implementation (api/radar/inbound.js)
```javascript
const ALLOWED_SENDERS = [
  // LibraLab accounts
  'thomas@kinn.at',
  'thomas@libralab.ai',
  'thomas@libralab.at',
  'admin@libralab.ai',

  // Personal accounts
  'thomas.arzt@gmail.com',
  'thomas.seiger@gmail.com',

  // System
  'treff@in.kinn.at'
];

// Reject unauthorized senders
if (!ALLOWED_SENDERS.some(allowed => senderEmail?.includes(allowed))) {
  return res.status(200).json({
    message: 'Email rejected - unauthorized sender'
  });
}
```

## Adding New Trusted Senders

To add a new trusted sender:

1. Edit `/api/radar/inbound.js`
2. Add email to `ALLOWED_SENDERS` array
3. Deploy to Vercel
4. Test with forwarded email

## Monitoring

### Check Processing
- Resend Dashboard: See all incoming emails
- Vercel Logs: Check webhook processing
- Google Sheets: Verify extracted events

### Debug Rejected Emails
Check Vercel function logs for:
```
[RADAR] Rejected email from unauthorized sender: someone@example.com
```

## Future Enhancements

### Phase 1: Domain Whitelisting
- Allow entire domains (e.g., all @kinn.at)
- Useful for team expansion

### Phase 2: Auto-Subscribe
- System subscribes directly to newsletters
- Uses radar@in.kinn.at as primary email
- Requires better spam filtering

### Phase 3: Multi-User Access
- Each KINN member gets forwarding access
- Personal filtering preferences
- Contribution tracking

## Emergency Override

If you need to temporarily disable the whitelist (not recommended):

1. Comment out the whitelist check in inbound.js
2. Deploy to Vercel
3. Process emails
4. **IMPORTANT**: Re-enable whitelist immediately after

## Support

- Check Resend webhook logs for delivery
- Verify sender email format in logs
- Contact: thomas@kinn.at for whitelist additions