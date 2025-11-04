# Email Warmup Integration Example

## When to Use This

Only implement automatic warmup if you're planning to:
- Send to 50+ new subscribers in one day (marketing campaign)
- Import an existing email list (e.g., past event attendees)
- Send your first newsletter to 100+ people at once

**For organic signups (1-5/day), you don't need this!** Organic growth IS your warmup.

## Integration Code

### Option A: Add warmup check to signup endpoint

```javascript
// api/signup.js

import { getDailySendingLimit, canSendToday, incrementDailySendCount } from './utils/email-warmup.js';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL?.trim(),
  token: process.env.KINNST_KV_REST_API_TOKEN?.trim(),
});

export default async function handler(req, res) {
  // ... existing validation code ...

  try {
    // Check daily sending limit (warmup)
    const canSend = await canSendToday(redis);

    if (!canSend) {
      console.log('[WARMUP] Daily limit reached, queuing for tomorrow');
      return res.status(429).json({
        error: 'Daily limit reached',
        message: 'Wir haben heute viele Anmeldungen erhalten! Deine Bestätigung kommt morgen.',
        retryAfter: 'tomorrow'
      });
    }

    // ... existing email sending code ...

    // After successful email send, increment counter
    await incrementDailySendCount(redis);

    // ... rest of code ...
  } catch (error) {
    // ... error handling ...
  }
}
```

### Option B: Queue system (more complex, for high volume)

If you get 100+ signups/day, implement a queue:

1. Save pending confirmations to Redis queue
2. Background worker processes queue with daily limits
3. Sends emails in batches throughout the day

**This is overkill for KINN's current use case!**

## Monitoring Warmup Progress

Add an admin endpoint to check warmup status:

```javascript
// api/admin/warmup-status.js

import { getWarmupStatus } from '../utils/email-warmup.js';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL?.trim(),
  token: process.env.KINNST_KV_REST_API_TOKEN?.trim(),
});

export default async function handler(req, res) {
  // Add admin auth check here

  const status = await getWarmupStatus(redis);

  return res.status(200).json({
    success: true,
    warmup: status
  });
}
```

Example response:
```json
{
  "success": true,
  "warmup": {
    "daysLive": 12,
    "currentCount": 35,
    "dailyLimit": 50,
    "remainingToday": 15,
    "percentUsed": 70,
    "warmupComplete": false
  }
}
```

## Updating Launch Date

The warmup schedule starts from a launch date. Update it in `api/utils/email-warmup.js`:

```javascript
// Change this line to your actual launch date:
const launchDate = new Date('2025-11-02'); // Update to your launch date
```

## Disabling Warmup

To disable warmup after 6 weeks, either:

1. **Keep the code** - it automatically allows full volume after 35 days
2. **Remove the warmup checks** - delete the `canSendToday()` call from signup.js
3. **Set high limit** - change `getDailySendingLimit()` to always return 10000

## Testing

Test the warmup logic locally:

```bash
# Simulate day 3 (limit: 20/day)
curl -X POST http://localhost:3000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Check warmup status
curl http://localhost:3000/api/admin/warmup-status
```
