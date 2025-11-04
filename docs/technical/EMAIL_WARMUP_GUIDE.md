# Email Warmup Guide for KINN

## TL;DR: Do You Need Warmup?

**For KINN's organic signup flow:** ❌ **NO warmup needed**
- You're getting 1-5 signups/day organically
- Using Resend (shared IP with established reputation)
- Double opt-in (only confirmed users)
- DKIM/SPF/DMARC already configured

**Your organic growth IS your warmup!** 🎉

---

## When You WILL Need Warmup

### Scenario 1: First Newsletter to Existing Subscribers

You have 50+ confirmed subscribers and want to send your first monthly newsletter.

**Strategy:**
```
Week 1: Send to 20 most engaged subscribers (opened confirmation email)
Week 2: Send to next 30 subscribers
Week 3: Send to next 50 subscribers
Week 4+: Send to all remaining subscribers
```

**Why this works:**
- Start with "engaged" users (higher open rates = better reputation)
- Gmail/Yahoo see positive engagement signals
- Gradually increases volume

### Scenario 2: Marketing Campaign

You're running Facebook/LinkedIn ads and expect 50+ signups/day.

**Strategy:**
```
Day 1-7:   Cap at 20 confirmation emails/day
Day 8-14:  Cap at 50 confirmation emails/day
Day 15-21: Cap at 100 confirmation emails/day
Day 22+:   No cap (full volume)
```

**Implementation:** Use the automatic warmup code in `api/utils/email-warmup.js`

### Scenario 3: Importing Past Event Attendees

You have a CSV of 200 past event attendees from offline events.

**Strategy:**
```
Week 1: Import 20, send opt-in confirmation
Week 2: Import 30, send opt-in confirmation
Week 3: Import 50, send opt-in confirmation
Week 4: Import remaining 100, send opt-in confirmation
```

**IMPORTANT:** Never send to imported lists without double opt-in!

---

## Best Practices from German Email Providers

### 1. Start with High-Quality Recipients

**Priority order for warmup:**
1. ✅ People who clicked links in previous emails (highest engagement)
2. ✅ People who opened previous emails (medium engagement)
3. ⚠️ People who haven't opened yet (low engagement)
4. ❌ Never include bounced or unsubscribed emails

### 2. Monitor Engagement Metrics

Watch these in your Resend dashboard:
- **Open Rate:** Aim for >30% (good), >50% (excellent)
- **Click Rate:** Aim for >3% (good), >10% (excellent)
- **Bounce Rate:** Keep <2% (>5% is bad)
- **Spam Complaint Rate:** Keep <0.1% (>0.3% is critical)

**If metrics drop below targets:** Pause sending, review content, clean list

### 3. Engagement Signals to Build Reputation

**Positive signals (do more):**
- Replies to your emails (highest value!)
- Clicks on links
- Moving email from spam to inbox
- Starring/flagging emails
- Adding sender to contacts

**Negative signals (avoid):**
- High unsubscribe rate (>0.5%)
- Low open rate (<20%)
- Deleting without opening
- Marking as spam
- Bounces

### 4. German Provider Specific Tips

**GMX/Web.de (largest in Germany/Austria):**
- Very strict on sender reputation
- Prefers plain text or simple HTML (✅ you're already doing this)
- Requires consistent sending patterns (don't send once/month, then daily)
- Manual review for new domains (can take 2-3 weeks)

**Gmail:**
- Loves engagement (replies, forwards)
- List-Unsubscribe header mandatory (✅ you added this)
- Prefers gradual volume increases
- Uses AI to detect automated/bulk mail

**Outlook/Hotmail:**
- Moderate strictness
- Focuses on authentication (✅ DKIM/SPF/DMARC done)
- Checks sender domain age (kinn.at is new, needs warmup)

---

## Warmup Schedules by Scenario

### Conservative (Safest)
```
Week 1:  10/day   → Total: 70
Week 2:  25/day   → Total: 175
Week 3:  50/day   → Total: 350
Week 4:  100/day  → Total: 700
Week 5:  200/day  → Total: 1,400
Week 6+: 500+/day → Full volume
```

**Use for:** First time sending, new domain, high-value list

### Moderate (Balanced)
```
Week 1:  20/day   → Total: 140
Week 2:  50/day   → Total: 350
Week 3:  100/day  → Total: 700
Week 4:  250/day  → Total: 1,750
Week 5+: 500+/day → Full volume
```

**Use for:** Domain with DKIM/SPF/DMARC, using established ESP (Resend)

### Aggressive (Fastest)
```
Week 1:  50/day   → Total: 350
Week 2:  150/day  → Total: 1,050
Week 3:  500/day  → Total: 3,500
Week 4+: 1000+/day → Full volume
```

**Use for:** Established domain, re-warming after pause, excellent engagement history

**KINN recommendation:** Moderate schedule if doing marketing campaign

---

## Manual Warmup Checklist

If you need to manually warmup (simplest approach):

### Week 1: Foundation
- [ ] Export 20 most recent confirmed subscribers
- [ ] Send newsletter to these 20 via normal flow
- [ ] Monitor open/click rates in Resend dashboard
- [ ] Check spam folder test (use mail-tester.com)
- [ ] Reply to any subscriber replies (builds engagement!)

### Week 2: Expansion
- [ ] Export next 30 confirmed subscribers
- [ ] Send newsletter to these 30
- [ ] Monitor metrics (should be >30% open rate)
- [ ] Address any deliverability issues before continuing

### Week 3: Scale
- [ ] Export next 50 confirmed subscribers
- [ ] Send newsletter to these 50
- [ ] Total sent: 100 emails over 3 weeks
- [ ] Review Resend analytics for trends

### Week 4+: Full Volume
- [ ] If metrics are good (>30% open, <2% bounce), send to all
- [ ] Continue monitoring for next 2 weeks
- [ ] Celebrate! 🎉 Your warmup is complete

---

## Common Warmup Mistakes to Avoid

### ❌ DON'T:
1. **Send to unengaged lists** - Start with engaged users only
2. **Increase volume too fast** - Double volume = double risk
3. **Stop sending during warmup** - Consistency matters
4. **Ignore bounce/spam rates** - They compound quickly
5. **Send same content repeatedly** - Looks like spam
6. **Skip testing** - Always send test to yourself first

### ✅ DO:
1. **Segment by engagement** - Send to active users first
2. **Increase gradually** - 2x volume per week max
3. **Maintain consistency** - Same day/time helps
4. **Clean your list** - Remove bounces immediately
5. **Vary content** - Keep it fresh and personal
6. **Monitor daily** - Check Resend dashboard

---

## Monitoring & Tools

### Free Tools:
- **Mail-tester.com** - Check spam score before sending (10/10 is perfect)
- **Resend Dashboard** - Monitor open/click/bounce rates
- **Google Postmaster** - Check Gmail reputation (if sending 100+/day)

### What to Monitor:
```
Daily:
- Bounce rate (should be <2%)
- Spam complaint rate (should be <0.1%)

Weekly:
- Open rate trend (should be stable or increasing)
- Click rate trend (shows content quality)
- Unsubscribe rate (should be <0.5%)

Monthly:
- Overall deliverability score
- Domain reputation (via Google Postmaster)
```

### Alert Thresholds:
```
🟢 Healthy:   Open >30%, Bounce <2%, Spam <0.1%
🟡 Warning:   Open <20%, Bounce 2-5%, Spam 0.1-0.3%
🔴 Critical:  Open <10%, Bounce >5%, Spam >0.3%
```

**If you hit 🔴 Critical:** Stop sending immediately, investigate, clean list

---

## For KINN: Recommended Approach

Given your current setup (organic signups, double opt-in, Resend):

### Short Term (Now):
✅ **No action needed!** Your organic growth is perfect warmup.

### When you hit 50+ subscribers:
1. Send first newsletter manually
2. Monitor open/click rates
3. If metrics are good (>30% open), continue monthly

### If planning marketing campaign:
1. Implement automatic warmup (use code in repo)
2. Set daily limit to 20 for first week
3. Increase gradually using schedule above
4. Monitor Resend dashboard daily

### Long Term (100+ subscribers):
1. Maintain consistent sending schedule (monthly newsletter)
2. Keep list clean (remove bounces)
3. Encourage engagement (ask questions, request replies)
4. Monitor metrics (dashboard review monthly)

---

## Summary

**Right now:** ✅ You're good! Organic signups are the best warmup.

**Future scenarios requiring warmup:**
- First newsletter to 50+ people (manual batches)
- Marketing campaign with 50+ signups/day (automatic limits)
- Importing past event attendees (staged imports)

**Key principle:** Start slow, monitor metrics, increase gradually, maintain consistency.

Need help implementing? Check `WARMUP_INTEGRATION_EXAMPLE.md` for code examples.
