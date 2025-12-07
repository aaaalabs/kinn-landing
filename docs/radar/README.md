# KINN-RADAR Documentation

## 🎯 Overview

KINN-RADAR is an AI event aggregation system for Tyrol, integrated into the main KINN platform. It automatically collects FREE AI/ML/Data Science events from newsletters and provides them via a single ICS calendar subscription.

**Core Promise**: "Every FREE AI Event in Tyrol" - One ICS subscription, zero cost, zero FOMO.

## 🚀 Quick Start

### 1. Check Environment Variables
All required environment variables are already set in Vercel:
- `RADAR_GROQ_API_KEY` ✅
- `RADAR_GOOGLE_SHEET_ID` ✅
- `GOOGLE_SERVICE_ACCOUNT_KEY` ✅
- `RADAR_ADMIN_TOKEN` ✅

### 2. Deploy Core Endpoints
```bash
# From KINN root directory
npm install groq-sdk googleapis google-auth-library
vercel --prod
```

### 3. Access Points
- **ICS Feed**: `https://kinn.at/api/radar/calendar.ics`
- **Health Check**: `https://kinn.at/api/radar/health`
- **Google Sheets**: [Event Management Dashboard](https://docs.google.com/spreadsheets/d/1grvzmQ_oGpfIMCK68Ctx0Nr3wjvE1jScuXad77xKK-s)
- **Manual Sync**: `curl -H "Authorization: Bearer [ADMIN_TOKEN]" https://kinn.at/api/radar/sheets-sync`

### 4. Configure Resend Webhook
1. Go to Resend Dashboard → in.kinn.at
2. Set webhook URL: `https://kinn.at/api/radar/inbound`
3. Newsletter emails to `radar@in.kinn.at` will be processed automatically

## 📁 Documentation Structure

| Document | Purpose |
|----------|---------|
| **[implementation-plan.md](implementation-plan.md)** | Complete technical implementation plan |
| **[deployment-checklist.md](deployment-checklist.md)** | Step-by-step deployment guide |
| **[code-templates.md](code-templates.md)** | Ready-to-deploy code |
| **[google-sheets-setup.md](google-sheets-setup.md)** | Google Sheets integration |
| **[newsletter-sources.md](newsletter-sources.md)** | Newsletter subscription list |
| **[environment-variables.md](environment-variables.md)** | Env vars reference |
| **[admin-dashboard-concept.md](admin-dashboard-concept.md)** | Future dashboard plans |

## 🏗️ Architecture

### Integration Pattern
```
/KINN/
├── /api/
│   ├── /radar/              # RADAR endpoints
│   │   ├── inbound.js       # Newsletter processing
│   │   ├── calendar.ics.js  # ICS generation
│   │   ├── sheets-sync.js   # Google Sheets sync
│   │   ├── health.js        # Health check
│   │   └── events.js        # JSON API
│   └── /utils/
│       ├── radar-redis.js   # RADAR Redis ops
│       ├── groq-extractor.js # AI extraction
│       └── event-validator.js # FREE+TYROL filter
```

### Redis Keys
```
radar:events                    # SET of event IDs
radar:event:{id}               # HASH event details
radar:events:by-date:{date}    # SET events by date
radar:sources                  # SET newsletter sources
radar:metrics:total            # STRING counter
```

## 🔑 Key Features

### Event Filtering (FREE + TYROL)
- ✅ **FREE**: No cost events only (kostenlos, gratis)
- ✅ **TYROL**: Physical location in Tyrol
- ✅ **AI/ML**: AI, KI, Machine Learning, Data Science
- ✅ **PUBLIC**: Open registration

### Data Flow
```
Newsletter → radar@in.kinn.at → Resend Webhook
    ↓
Groq AI Extraction (meta-llama/llama-4-scout-17b-16e-instruct)
    ↓
Event Validation (FREE + TYROL filter)
    ↓
Redis Storage (radar:* keys)
    ↓
Google Sheets Sync (every 5 min) + ICS Feed (real-time)
```

## 📊 Newsletter Sources

### Priority Sources (Subscribe First)
1. **DIH West** - newsletter@dih-west.at
2. **WKO Tirol** - tirol@wko.at
3. **Startup.Tirol** - office@startup.tirol
4. **AI Austria** - office@aiaustria.com

See [newsletter-sources.md](newsletter-sources.md) for complete list.

## 🧪 Testing

### Test Newsletter Processing
```bash
curl -X POST https://kinn.at/api/radar/inbound \
  -H "Content-Type: application/json" \
  -H "svix-signature: [WEBHOOK_SECRET]" \
  -d '{"from":"test@startup.tirol","subject":"Newsletter","html":"<p>AI Workshop...</p>"}'
```

### Test ICS Generation
```bash
curl https://kinn.at/api/radar/calendar.ics
```

### Test Google Sheets Sync
```bash
curl https://kinn.at/api/radar/sheets-sync \
  -H "Authorization: Bearer lf2pTHpUCobT1lpScNSvYTcMKM83fiKnNqQt2O0p/BE="
```

## 📈 Success Metrics

### Week 1 Targets
- 5+ newsletters processed ✓
- 20+ events extracted ✓
- 0 paid events included ✓
- 0 non-Tyrol events ✓
- ICS feed working ✓

### Month 1 Goals
- 10+ newsletter sources
- 50+ events/month
- 50+ ICS subscribers
- <5% missed events

## 🚨 Troubleshooting

### Common Issues
- **Newsletter not processing**: Check Resend webhook secret
- **No events extracted**: Verify Groq API credits
- **Sheets not syncing**: Check service account permissions
- **ICS feed empty**: Verify Redis has events

### Monitoring
- Health: `https://kinn.at/api/radar/health`
- Logs: Vercel Dashboard → Functions → Logs
- Metrics: Google Sheets → Statistics tab

## 🔒 Security

- All RADAR keys prefixed with `radar:` for isolation
- Admin endpoints require bearer token
- Newsletter webhook validates Resend signature
- Service account has minimal permissions

## 📝 Next Steps

1. **Today**: Deploy and test core endpoints
2. **Tomorrow**: Subscribe to first newsletter
3. **Week 1**: Add 5+ newsletter sources
4. **Week 2**: Monitor and optimize

---

**Questions?** Check the detailed documentation files or contact thomas@kinn.at