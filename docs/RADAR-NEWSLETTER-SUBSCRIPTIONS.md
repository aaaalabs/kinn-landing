# KINN-RADAR Newsletter Subscriptions

## Quick Setup Guide

Forward these newsletters to: **radar@in.kinn.at**

## Priority Sources to Subscribe (HIGH VALUE)

### 1. InnCubator
- **Website**: https://www.inncubator.at
- **Newsletter Signup**: Look for newsletter form on website
- **Why**: Startup incubator events, pitch nights, workshops
- **Expected**: 10-15 events/month

### 2. Startup.Tirol
- **Website**: https://www.startup.tirol
- **Newsletter**: https://www.startup.tirol/newsletter/
- **Why**: Official startup ecosystem events
- **Expected**: 15-20 events/month

### 3. WKO Tirol
- **Website**: https://www.wko.at/tirol
- **Newsletter**: Via member portal or contact form
- **Why**: Chamber of Commerce business events
- **Expected**: 20-25 events/month

### 4. AI Austria
- **Website**: https://aiaustria.com
- **Newsletter**: Subscribe on website
- **Why**: AI-focused events and meetups
- **Expected**: 8-10 events/month

### 5. Standortagentur Tirol
- **Website**: https://www.standort-tirol.at
- **Newsletter**: https://www.standort-tirol.at/newsletter
- **Why**: Regional innovation and development events
- **Expected**: 10-15 events/month

### 6. DIH West
- **Website**: https://www.dih-west.at
- **Newsletter**: Contact for subscription
- **Why**: Digital Innovation Hub events
- **Expected**: 5-10 events/month

### 7. Impact Hub Tirol
- **Website**: https://tirol.impacthub.net
- **Newsletter**: Subscribe on website
- **Why**: Innovation hub with startup & social impact events
- **Expected**: 15-20 events/month
- **Note**: High-quality networking events

## Community & Tech Platforms (HIGH VALUE)

### Meetup Innsbruck
- **Website**: https://www.meetup.com/find/at--innsbruck/
- **Newsletter**: Create account and subscribe to groups
- **Why**: International tech & startup meetups
- **Expected**: 25-30 events/month
- **Note**: Many AI, Dev, and Startup groups

### Engineering Kiosk Alps
- **Website**: https://engineeringkiosk.dev/meetup/alps/
- **Newsletter**: Subscribe on website
- **Why**: Engineering & tech community events
- **Expected**: 3-5 events/month
- **Note**: High-quality tech talks

## Secondary Sources (MEDIUM VALUE)

### 7. MCI
- **Website**: https://www.mci4me.at
- **Newsletter**: Via student/alumni portal
- **Expected**: 10-15 events/month

### 8. FH Kufstein
- **Website**: https://www.fh-kufstein.ac.at
- **Newsletter**: Public events newsletter available
- **Expected**: 8-10 events/month

### 9. Werkstätte Wattens
- **Website**: https://www.werkstaette-wattens.at
- **Newsletter**: Subscribe on website
- **Expected**: 8-12 events/month

### 10. Coworking Tirol
- **Website**: https://coworking-tirol.com
- **Newsletter**: Member newsletter
- **Expected**: 5-8 events/month

### 11. Das Wundervoll
- **Website**: https://www.daswundervoll.at
- **Newsletter**: Subscribe for event updates
- **Expected**: 15-20 events/month
- **Note**: Cultural venue with tech/creative events

### 12. WeLocally Innsbruck
- **Website**: https://innsbruck.welocally.at
- **Newsletter**: Platform notifications
- **Expected**: 10-15 events/month
- **Note**: Local community meetups

### 13. Die Bäckerei
- **Website**: https://diebaeckerei.at
- **Newsletter**: Subscribe for program updates
- **Expected**: 25-30 events/month
- **Note**: Cultural center with many free events

## Setup Instructions

1. **Visit each website** and find their newsletter signup
2. **Use email**: Your email address (will forward to radar@in.kinn.at)
3. **Set up forwarding rule** in your email client:
   - Forward FROM: Newsletter sender
   - Forward TO: radar@in.kinn.at
   - Include original formatting

## Email Forwarding Rules

### Gmail
1. Settings → Filters and Blocked Addresses
2. Create new filter
3. From: newsletter@domain.com
4. Forward to: radar@in.kinn.at

### Outlook
1. Settings → Rules
2. Add new rule
3. When email from: newsletter@domain.com
4. Forward to: radar@in.kinn.at

## What Happens Next

When newsletters arrive at radar@in.kinn.at:
1. **AI Extraction**: Events are automatically extracted
2. **Filtering**: Only FREE events in TYROL are kept
3. **Categorization**: AI, Tech, Startup, Business, etc.
4. **Storage**: Events saved to Redis database
5. **Google Sheets**: Auto-sync every 5 minutes
6. **iCal Feed**: AI events added to calendar feed

## Monitoring

Check extraction success:
- Google Sheets: https://docs.google.com/spreadsheets/d/[YOUR_SHEET_ID]
- Sources tab shows "last checked" timestamp
- Active Events tab shows extracted events

## Test Email

Send a test email to **radar@in.kinn.at** with subject "Test" and body containing:
```
Event: AI Meetup Innsbruck
Date: 15.12.2025
Time: 18:00
Location: InnCubator, Innsbruck
Free entry!
```

You should see it in Google Sheets within 5 minutes.

## Current Status

- ✅ Email webhook configured
- ✅ AI extraction working (GPT-OSS-120B)
- ✅ Google Sheets sync active (every 5 minutes)
- ✅ Web scraping for 5 PRIMARY sites (daily at 8:00)
- ⏳ Newsletter subscriptions pending

## Support

If newsletters aren't being processed:
1. Check Resend dashboard for webhook logs
2. Check Google Sheets "Sources" tab for last update
3. Verify forwarding rules are active
4. Contact: thomas@kinn.at