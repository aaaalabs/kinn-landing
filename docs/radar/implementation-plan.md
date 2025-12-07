# KINN-RADAR Implementation Plan
> Tirolweiter KI Event Radar - A Comprehensive Event Aggregation System

Version: 1.0
Date: 2025-12-07
Status: Research Complete, Ready for Implementation

---

## Executive Summary

**KINN-RADAR** will be a comprehensive AI event aggregation system for Tirol, building on the existing KINN event infrastructure to provide a centralized calendar of ALL AI/tech events in the region. Based on CSV analysis of the KI initiatives landscape, we have identified **6 active initiatives** with regular events that need aggregation.

### 🆕 Key Discovery from CSV Analysis
We now have **validated data** on all major KI initiatives in Tirol:
- **DIH West**: SME-focused workshops across Tirol districts (not just Innsbruck)
- **WKO KI-Expertengruppe**: Regular AI-Frühstück and webinars for businesses
- **AI Austria**: Major conferences (2000+ participants) and meetups
- **AI Factory Austria**: Academic masterclasses and supercomputing workshops
- **KINN**: Weekly informal community touchpoint (our platform)
- **Standortagentur Tirol**: Regional digitalization initiatives

### Strategic Positioning
KINN-RADAR will be the **ONLY platform** that aggregates:
- **Grassroots** community events (KINN, Meetups)
- **Enterprise** AI events (WKO, DIH West)
- **Academic** research events (Universities, AI Factory)
- **National** conferences (AI Austria)

### Key Differentiators
- **Validated Sources**: 6 confirmed active initiatives from CSV research
- **🆕 Newsletter-First**: Resend Inbound + Groq API for ultra-fast AI event extraction
- **Complete Coverage**: From informal meetups to enterprise workshops
- **Geographic Reach**: Innsbruck + all Tirol districts (via DIH West)
- **Target Audiences**: Developers, SMEs, Academics, Corporates
- **Architecture**: Reuse KINN's proven Redis + ICS system
- **AI-Powered**: Groq LPU with Llama 3.3 70B (FREE tier covers 100% usage!)
- **Speed**: 10x faster than Claude (200-500ms vs 2-5 seconds)
- **Cost**: €0/mo with free tier (vs €69/mo traditional scraping)
- **Compliance**: 100% GDPR-compliant through newsletter subscriptions

---

## Table of Contents
1. [Project Goals & Vision](#1-project-goals--vision)
2. [Technical Architecture](#2-technical-architecture)
3. [Newsletter Automation Strategy](#3-newsletter-automation-strategy)
4. [Event Scraping Strategy](#4-event-scraping-strategy)
5. [Automation Platform Decision](#5-automation-platform-decision)
6. [Event Schema Design](#6-event-schema-design)
7. [KI Initiativen Ecosystem](#7-ki-initiativen-ecosystem-tirol)
8. [Data Sources](#8-data-sources)
9. [ICS System Adaptation](#9-ics-system-adaptation)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Success Metrics](#11-success-metrics)
12. [Budget & Resources](#12-budget--resources)

---

## 1. Project Goals & Vision

### Primary Objectives
1. **Aggregate** all AI/tech events in Tirol into a single, authoritative calendar
2. **Automate** event discovery and import from multiple sources
3. **Deduplicate** events appearing on multiple platforms
4. **Integrate** with existing KINN infrastructure
5. **Serve** the community with a reliable, comprehensive event feed

### Success Criteria
- 50+ events aggregated monthly
- <5% duplicate rate after deduplication
- 95% uptime for ICS feed
- 10+ partner organizations integrated
- 100+ calendar subscribers within 6 months

### Non-Goals
- Personal data collection (attendee lists, emails)
- Event registration handling
- Payment processing
- Social features (comments, likes)
- Mobile app development

---

## 2. Technical Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    KINN-RADAR Event System                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  DATA SOURCES                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Meetup   │  │Eventbrite│  │University│  │ Partner  │   │
│  │  API     │  │   API    │  │ Calendars│  │  Feeds   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       └──────────────┴──────────────┴──────────────┘        │
│                              │                               │
│  PROCESSING LAYER            ▼                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Vercel Serverless Functions                 │     │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────────┐     │     │
│  │  │ Scraper │→ │Normalizer│→ │ Deduplicator │     │     │
│  │  └─────────┘  └──────────┘  └──────────────┘     │     │
│  └────────────────────────────────────────────────────┘     │
│                              │                               │
│  STORAGE                     ▼                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Upstash Redis (KV Store)               │     │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  │     │
│  │  │events:radar │  │radar:sources │  │duplicates│  │     │
│  │  └─────────────┘  └──────────────┘  └──────────┘  │     │
│  └────────────────────────────────────────────────────┘     │
│                              │                               │
│  OUTPUT FORMATS              ▼                               │
│  ┌──────┐  ┌──────┐  ┌──────────┐  ┌──────┐  ┌──────┐     │
│  │ ICS  │  │ JSON │  │ HTML/RSS │  │Google│  │Widget│     │
│  │ Feed │  │ API  │  │   Feed   │  │ Cal  │  │ API  │     │
│  └──────┘  └──────┘  └──────────┘  └──────┘  └──────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack
- **Runtime**: Node.js 20+ (Vercel Serverless)
- **Language**: TypeScript
- **Database**: Upstash Redis (existing KINN infrastructure)
- **Scraping**: Cheerio/Puppeteer (Phase 1), Apify (Phase 2)
- **Scheduling**: Vercel Cron (Phase 1), Apify Scheduled Actors (Phase 2)
- **Frontend**: Static HTML + Vanilla JS (existing KINN pattern)
- **Deployment**: Vercel (existing)

### Redis Data Structure
```javascript
// Event storage (similar to KINN events but with source tracking)
{
  key: 'radar:events',
  value: {
    events: [
      {
        id: 'meetup_12345',
        source: 'meetup',
        sourceId: '12345',
        sourceUrl: 'https://meetup.com/event/12345',
        title: 'AI Workshop Innsbruck',
        // ... standard KINN event fields
        fingerprint: 'hash_for_dedup',
        lastScraped: '2025-12-07T10:00:00Z'
      }
    ],
    lastUpdated: '2025-12-07T10:00:00Z',
    sources: ['meetup', 'eventbrite', 'uni-innsbruck']
  }
}

// Deduplication tracking
{
  key: 'radar:duplicates',
  value: {
    'meetup_123': 'master_event_456', // Maps duplicate to master
    'eventbrite_789': 'master_event_456'
  }
}

// Source configuration
{
  key: 'radar:sources:config',
  value: {
    meetup: {
      enabled: true,
      groups: ['innsbruck-ai', 'data-science-tirol'],
      lastSync: '2025-12-07T09:00:00Z',
      nextSync: '2025-12-07T21:00:00Z'
    },
    eventbrite: {
      enabled: true,
      keywords: ['AI', 'machine learning', 'data'],
      location: 'Innsbruck',
      radius: '50km'
    }
  }
}
```

---

## 3. Newsletter Automation Strategy (NEW: Resend Inbound + Groq API)

### 🆕 Game-Changing Approach: Ultra-Fast AI Newsletter Processing with Groq

Instead of just scraping websites, we'll **subscribe to ALL Tirol AI/tech newsletters** and process them with **Groq's blazing-fast LPU** infrastructure - 10x faster and 95% cheaper than Claude!

### Technical Architecture

```
Newsletter → radar@in.kinn.at → Resend Inbound → Webhook → Groq API → Event Extraction → Redis
                    ↓                              (Llama 3.3 70B)
         Opt-in confirmations → Forward to thomas@kinn.at for manual confirmation
```

### Why Groq instead of Claude?

| Aspect | Claude API | Groq API | Winner |
|--------|------------|----------|--------|
| **Speed** | 2-5 sec/request | 200-500ms | **Groq (10x faster)** |
| **Cost** | $0.25/1M input tokens (Haiku) | $0.59/1M (Llama 70B) | **Similar** |
| **Free Tier** | None | 300K tokens/day | **Groq** |
| **Availability** | High | Very High | Tie |
| **German Understanding** | Excellent | Very Good | Claude (slight) |
| **JSON Mode** | Yes | Yes | Tie |
| **Rate Limits** | 50 req/min | 30 req/min (free) | Claude |

**Decision: Groq for MVP** (free tier covers 100+ newsletters/day!)

### Implementation Details

#### 1. Resend Inbound Setup
```javascript
// Dedicated email address (using in.kinn.at domain)
const RADAR_EMAIL = 'radar@in.kinn.at';

// api/webhooks/newsletter-inbound.js
export async function POST(req) {
  const { from, subject, html, text, attachments } = req.body;

  // Log newsletter receipt
  console.log(`Newsletter received from: ${from}`);

  // Send to Claude for processing
  const events = await extractEventsWithClaude({
    sender: from,
    subject,
    content: html || text
  });

  // Process extracted events
  for (const event of events) {
    await addOrUpdateRadarEvent(event);
  }
}
```

#### 2. Groq API Integration (Llama 3.3 70B)
```javascript
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.RADAR_GROQ_API_KEY
});

async function extractEventsWithGroq({ sender, subject, content }) {
  // Groq-optimized prompt for Llama models
  const systemPrompt = `You are an expert at extracting event information from German and English newsletters.
Extract ALL AI/tech/digital events and return them as a JSON array.
Be especially careful with German date formats like "15. März" or "jeden ersten Mittwoch".`;

  const userPrompt = `Extract events from this newsletter:

From: ${sender}
Subject: ${subject}
Content:
${content.substring(0, 30000)} // Groq has good context window

For each event found, extract and return ONLY a JSON array with this structure:
[{
  "title": "Event name",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "endTime": "HH:MM or null",
  "location": {
    "name": "Venue or 'Online'",
    "address": "Full address or null",
    "isOnline": true/false
  },
  "description": "Brief description max 200 chars",
  "registrationUrl": "URL or null",
  "type": "workshop|meetup|conference|webinar|networking",
  "language": "de|en|mixed",
  "targetAudience": ["developers", "executives", "researchers"],
  "topics": ["AI", "ML", "Cloud"],
  "recurring": true/false
}]

IMPORTANT: Return ONLY the JSON array, no other text.`;

  try {
    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct", // Specified scout model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1, // Low for consistent extraction
      max_tokens: 4096,
      response_format: { type: "json_object" } // Force JSON response
    });

    const content = response.choices[0]?.message?.content;

    // Parse and validate
    try {
      const result = JSON.parse(content);
      // Handle both array and object with events property
      const events = Array.isArray(result) ? result : (result.events || []);

      return events.map(event => ({
        ...event,
        source: `newsletter_${sender}`,
        extractedAt: new Date(),
        processingTime: response.usage?.total_time || 0
      }));
    } catch (parseError) {
      console.error('[GROQ] Failed to parse JSON:', parseError);
      return [];
    }
  } catch (error) {
    console.error('[GROQ] API Error:', error);
    // Fallback to simpler model if 70B fails
    if (error.status === 429) { // Rate limit
      return extractEventsWithGroqFallback({ sender, subject, content });
    }
    return [];
  }
}

// Fallback to faster/smaller model
async function extractEventsWithGroqFallback({ sender, subject, content }) {
  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct", // Specified scout model
    messages: [{
      role: "user",
      content: `Extract event titles and dates from this newsletter:
${content.substring(0, 10000)}

Return as JSON array with: title, date, location.`
    }],
    temperature: 0.1,
    max_tokens: 1024
  });

  // Simplified parsing for fallback
  return JSON.parse(response.choices[0]?.message?.content || '[]');
}
```

#### 3. Opt-in Confirmation Forwarding System

```javascript
// lib/opt-in-forwarder.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handleOptInEmail(email) {
  // Check if this is a confirmation email
  const isOptInConfirmation =
    email.subject?.toLowerCase().includes('confirm') ||
    email.subject?.toLowerCase().includes('bestätigen') ||
    email.subject?.toLowerCase().includes('verify') ||
    email.html?.includes('confirm your subscription') ||
    email.html?.includes('bestätigen sie ihre anmeldung');

  if (isOptInConfirmation) {
    // Forward to Thomas for manual confirmation
    await resend.emails.send({
      from: 'KINN Radar <radar@in.kinn.at>',
      to: 'thomas@kinn.at',
      subject: `[ACTION REQUIRED] Opt-in: ${email.from}`,
      html: `
        <h2>Newsletter Opt-in Confirmation Required</h2>
        <p><strong>From:</strong> ${email.from}</p>
        <p><strong>Original Subject:</strong> ${email.subject}</p>
        <hr>
        <div style="background: #f5f5f5; padding: 20px;">
          ${email.html || email.text}
        </div>
        <hr>
        <p><strong>Action:</strong> Please click the confirmation link in the email above to complete the newsletter subscription for radar@in.kinn.at</p>
      `
    });

    // Log for tracking
    await redis.hset('radar:opt-in:pending', email.from, {
      receivedAt: new Date(),
      subject: email.subject,
      forwardedTo: 'thomas@kinn.at'
    });

    return 'forwarded_for_confirmation';
  }

  return 'regular_newsletter';
}
```

#### 4. Newsletter Sources to Subscribe

**Tier 1: Confirmed Active (from CSV)**
- **DIH West**: newsletter@dih-west.at
- **WKO Tirol**: digitalisierung@wko.at
- **AI Austria**: office@aiaustria.com (Substack)
- **Startup.Tirol**: newsletter@startup.tirol

**Tier 2: Universities & Research**
- **Uni Innsbruck CS**: informatik@uibk.ac.at
- **MCI**: events@mci.edu
- **FH Kufstein**: veranstaltungen@fh-kufstein.ac.at

**Tier 3: Communities**
- **InnCubator**: events@inncubator.at
- **Engineering Kiosk**: alps@engineeringkiosk.dev
- **Standortagentur**: digital@standort-tirol.at

### Advantages Over Scraping

| Aspect | Web Scraping | Newsletter Processing |
|--------|--------------|----------------------|
| **Legal** | Gray area, robots.txt | ✅ Fully legal |
| **Reliability** | Sites change, blocking | ✅ Email always works |
| **Freshness** | After publication | ✅ Often advance notice |
| **Maintenance** | High (selectors break) | ✅ Low (AI adapts) |
| **Cost** | Apify €39-69/mo | Claude Haiku ~€5/mo |
| **GDPR** | Risky | ✅ Consent via subscription |

### Event Extraction Intelligence

Claude Haiku 4.5 can intelligently:
- **Identify** events in unstructured text
- **Extract** dates even from German formats ("Am Donnerstag, den 15. März")
- **Understand** context ("jeden ersten Mittwoch" → recurring)
- **Categorize** event types from description
- **Deduplicate** against existing events
- **Handle** multiple languages (DE/EN)

### Deduplication Logic

```javascript
async function deduplicateNewsletterEvent(extractedEvent, existingEvents) {
  // First: Check if we already have this from another source
  const duplicate = await findDuplicateWithClaude({
    newEvent: extractedEvent,
    existingEvents,
    prompt: `Compare this extracted newsletter event with existing events.
             Consider: same date/time + similar title = likely duplicate.
             Newsletter events might have less detail than scraped events.
             Return: { isDuplicate: boolean, matchedEventId: string|null }`
  });

  if (duplicate.isDuplicate) {
    // Enrich existing event with newsletter info
    await enrichEvent(duplicate.matchedEventId, extractedEvent);
    return 'enriched';
  }

  // Add as new event
  return 'added';
}
```

### Event Filter Criteria (FREE + TYROL)

**CRITICAL**: KINN-RADAR only includes events that are **FREE** and located in **TYROL**.

```javascript
// Event validation pipeline - MUST pass ALL criteria
const KINN_FILTER_CRITERIA = {
  // CRITERION 1: Must be FREE (no cost to attend)
  cost: {
    mustBeFree: true,
    acceptableTerms: [
      'kostenlos', 'gratis', 'free', 'keine Kosten',
      'no cost', 'without charge', '0€', '0 EUR',
      'Eintritt frei', 'free entry', 'free admission',
      'kostenfrei', 'gebührenfrei', 'unentgeltlich'
    ],
    rejectIfContains: [
      '€', 'EUR', 'Euro', 'price', 'Preis', 'ticket',
      'Eintritt', 'Gebühr', 'fee', 'cost', 'Kosten',
      'registration fee', 'Teilnahmegebühr', 'Beitrag'
    ],
    edgeCases: {
      'suggested donation': 'ACCEPT',  // Still free
      'freiwillige Spende': 'ACCEPT',  // Voluntary = free
      'students free': 'ACCEPT',       // Free for some = include
      'Studenten kostenlos': 'ACCEPT',
      'free with registration': 'ACCEPT',
      'Anmeldung erforderlich (kostenlos)': 'ACCEPT',
      'coffee included': 'IGNORE',     // Not a fee
      'Verpflegung inklusive': 'IGNORE'
    }
  },

  // CRITERION 2: Must be in TYROL (physical location)
  geography: {
    mustBeInTyrol: true,
    validLocations: [
      // Major cities
      'Innsbruck', 'Kufstein', 'Kitzbühel', 'Lienz', 'Imst',
      'Wörgl', 'Schwaz', 'Hall in Tirol', 'Telfs', 'Landeck',
      // Tech hubs
      'Wattens', 'Werkstätte Wattens', 'Swarovski',
      // Universities
      'Universität Innsbruck', 'UIBK', 'MCI', 'FH Kufstein',
      'UMIT Hall', 'FH Landeck',
      // General terms
      'Tirol', 'Tyrol', 'Tirolo'
    ],
    excludeLocations: [
      'Wien', 'Vienna', 'Salzburg', 'Graz', 'Linz',
      'München', 'Munich', 'Zürich', 'Zurich', 'Online-only',
      'Virtual', 'Webinar', 'Remote'
    ],
    hybridEvents: 'INCLUDE_IF_LOCAL_VENUE' // Hybrid OK if Tyrol location exists
  },

  // CRITERION 3: Must be AI/ML/Data related
  topics: {
    mustBeAIRelated: true,
    keywords: [
      'AI', 'KI', 'Artificial Intelligence', 'Künstliche Intelligenz',
      'Machine Learning', 'ML', 'Deep Learning', 'Neural Network',
      'LLM', 'Large Language Model', 'GPT', 'Transformer',
      'Data Science', 'Data Analytics', 'Big Data',
      'Computer Vision', 'NLP', 'Natural Language Processing',
      'Robotics', 'Automation', 'Algorithm', 'Model Training',
      'TensorFlow', 'PyTorch', 'Hugging Face', 'OpenAI'
    ]
  },

  // CRITERION 4: Must be PUBLIC (open registration)
  accessibility: {
    mustBePublic: true,
    rejectIfContains: [
      'internal only', 'employees only', 'members only',
      'nur für Mitglieder', 'geschlossene Veranstaltung',
      'private event', 'by invitation only', 'auf Einladung'
    ]
  }
};

// Main validation function
async function validateEventForKINN(event) {
  const validation = {
    isFree: false,
    isInTyrol: false,
    isAIRelated: false,
    isPublic: false,
    includeInCalendar: false,
    reasons: []
  };

  // Check FREE criteria
  const eventText = `${event.title} ${event.description}`.toLowerCase();

  // Check for cost indicators
  const hasCostIndicator = KINN_FILTER_CRITERIA.cost.rejectIfContains
    .some(term => eventText.includes(term.toLowerCase()));

  const hasFreeIndicator = KINN_FILTER_CRITERIA.cost.acceptableTerms
    .some(term => eventText.includes(term.toLowerCase()));

  validation.isFree = !hasCostIndicator || hasFreeIndicator;
  if (!validation.isFree) {
    validation.reasons.push('Event appears to have a cost');
  }

  // Check TYROL criteria
  const locationText = `${event.location?.name} ${event.location?.address} ${event.city}`.toLowerCase();

  validation.isInTyrol = KINN_FILTER_CRITERIA.geography.validLocations
    .some(loc => locationText.includes(loc.toLowerCase()));

  const isExcluded = KINN_FILTER_CRITERIA.geography.excludeLocations
    .some(loc => locationText.includes(loc.toLowerCase()));

  if (isExcluded && !event.location?.isHybrid) {
    validation.isInTyrol = false;
    validation.reasons.push('Event is outside Tyrol');
  }

  // Check AI/ML criteria
  validation.isAIRelated = KINN_FILTER_CRITERIA.topics.keywords
    .some(keyword => eventText.includes(keyword.toLowerCase()));

  if (!validation.isAIRelated) {
    validation.reasons.push('Event does not appear to be AI/ML related');
  }

  // Check PUBLIC criteria
  const hasPrivateIndicator = KINN_FILTER_CRITERIA.accessibility.rejectIfContains
    .some(term => eventText.includes(term.toLowerCase()));

  validation.isPublic = !hasPrivateIndicator;
  if (!validation.isPublic) {
    validation.reasons.push('Event appears to be private/restricted');
  }

  // Final decision
  validation.includeInCalendar =
    validation.isFree &&
    validation.isInTyrol &&
    validation.isAIRelated &&
    validation.isPublic;

  return validation;
}

// Integration with Groq extraction prompt
const GROQ_EVENT_EXTRACTION_PROMPT = `
Extract ALL tech/AI/digital events from this newsletter.

CRITICAL FILTERS - Only include events that meet ALL criteria:
1. **FREE** (kostenlos, gratis, no cost, 0€) - REJECT any event with price/fee/ticket/cost
2. **Located in TYROL** (Innsbruck, Hall, Wattens, Kufstein, etc.) - REJECT Vienna/Salzburg/Online-only
3. **AI/ML/Data related** - Must contain AI, KI, Machine Learning, Data Science keywords
4. **PUBLIC** (open registration) - REJECT internal/members-only/private events

If an event has ANY cost (even €5), exclude it.
If an event is outside Tyrol, exclude it.
If unsure about any criteria, exclude the event.

For each qualifying event, extract: [...]
`;
```

### Cost Analysis (Updated with Groq)

**Traditional Scraping:**
- Apify: €39-69/mo
- Maintenance: 10 hrs/mo
- Total: €69 + labor

**Newsletter + Claude API:**
- Resend Inbound: €0 (included)
- Claude Haiku: ~€5/mo
- Maintenance: 2 hrs/mo
- Total: €5 + minimal labor

**Newsletter + Groq API (RECOMMENDED):**
- Resend Inbound: €0 (included)
- Groq API: **€0** (Free tier: 300K tokens/day!)
- Backup costs if exceeding free tier: ~€2/mo
- Maintenance: 2 hrs/mo
- Total: **€0-2 + minimal labor**

**ROI: 97% cost reduction + 10x faster processing**

### Groq Free Tier Calculation
```
300,000 tokens/day free
Average newsletter: 2,000 tokens
= 150 newsletters/day processing capacity
= 4,500 newsletters/month FREE

Typical need: 30-50 newsletters/month
Coverage: 100% within free tier! 🎉
```

---

## 4. Event Scraping Strategy (Enhanced with Newsletter Priority)

### Ethical Scraping Framework

#### Compliance Checklist
- ✅ **Robots.txt**: Always check and respect
- ✅ **Rate Limiting**: 3-5 second delays minimum
- ✅ **User-Agent**: `KINN-RADAR/1.0 (+https://kinn.at; radar@kinn.at)`
- ✅ **No Personal Data**: Only public event information
- ✅ **Attribution**: Always link back to source
- ✅ **GDPR Compliant**: No attendee data collection

#### Legal Basis (GDPR Article 6)
- **Legitimate Interest**: Community service for AI enthusiasts
- **Public Information**: Only publicly available event details
- **No Monetization**: Free community service
- **Easy Opt-Out**: Sources can request exclusion

### Scraping Implementation

#### Phase 1: Basic Scraper (Vercel + Cheerio)
```javascript
// api/radar/scrape.js
import cheerio from 'cheerio';
import { RateLimiter } from 'bottleneck';

const limiter = new RateLimiter({
  minTime: 3000,  // 3 seconds between requests
  maxConcurrent: 1
});

export async function scrapeEventbrite(keyword, location) {
  return limiter.schedule(async () => {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'KINN-RADAR/1.0 (+https://kinn.at; radar@kinn.at)'
      }
    });

    const $ = cheerio.load(await response.text());
    // Parse events...
  });
}
```

#### Phase 2: Apify Actors (Production)
```javascript
// Use pre-built actors for reliability
{
  actors: [
    {
      name: 'eventbrite-scraper',
      id: 'dtrungtin/eventbrite-scraper',
      schedule: '0 9,21 * * *' // Twice daily
    },
    {
      name: 'meetup-scraper',
      id: 'guglielmocamporese/meetup-scraper',
      schedule: '0 10,22 * * *'
    }
  ]
}
```

### Deduplication Algorithm

```typescript
interface DeduplicationStrategy {
  // Level 1: Exact match (same time, same venue)
  exactMatch(event1: Event, event2: Event): boolean {
    return event1.startTime === event2.startTime &&
           event1.venue.lat === event2.venue.lat &&
           event1.venue.lng === event2.venue.lng;
  }

  // Level 2: Fuzzy title match (Jaro-Winkler > 0.85)
  fuzzyTitleMatch(event1: Event, event2: Event): number {
    return jaroWinkler(event1.title, event2.title);
  }

  // Level 3: Semantic similarity
  semanticMatch(event1: Event, event2: Event): boolean {
    const titleScore = this.fuzzyTitleMatch(event1, event2);
    const timeProximity = Math.abs(event1.startTime - event2.startTime) < 3600000; // 1 hour
    const venueProximity = haversineDistance(event1.venue, event2.venue) < 0.5; // 500m

    return (titleScore * 0.4 + timeProximity * 0.3 + venueProximity * 0.3) > 0.75;
  }
}
```

---

## 5. Automation Platform Decision (Updated with Newsletter Strategy)

### Platform Comparison Summary

| Criteria | Vercel Cron | Apify | Make | Resend+Claude | **Winner** |
|----------|------------|-------|------|---------------|-----------|
| Setup Time | 10 min | 30 min | 20 min | 15 min | **Vercel** |
| Cost (MVP) | €0 | €39/mo | €9/mo | €5/mo | **Vercel** |
| Cost (Scale) | €20/mo | €69/mo | €50+/mo | €10/mo | **Resend+Claude** |
| Pre-built Scrapers | None | 5000+ | ~50 | N/A | **Apify** |
| AI Processing | No | No | No | Yes | **Resend+Claude** |
| Legal Safety | Medium | Medium | Medium | High | **Resend+Claude** |
| Maintenance | High | Medium | Low | Very Low | **Resend+Claude** |
| KINN Integration | Native | API | API | Native | **Tie** |
| Learning Curve | Low | Medium | Low | Low | **Tie** |

### Recommended Approach: Progressive Enhancement

#### Phase 1: MVP (Weeks 1-4)
**Platform**: Vercel Cron + Custom Scrapers
- **Why**: Zero additional cost, uses existing stack
- **Implementation**: Basic scrapers for 2-3 sources
- **Schedule**: Daily at 9am Vienna time
- **Expected Results**: 20-30 events/month

#### Phase 2: Scale (Month 2-3)
**Platform**: Hybrid (Vercel + Apify for complex sources)
- **Why**: Reliability for production
- **Implementation**: Apify for Meetup/Eventbrite, custom for partners
- **Cost**: €39/mo Apify base
- **Expected Results**: 50-100 events/month

#### Phase 3: Full Automation (Month 4+)
**Platform**: Apify Primary + Vercel Processing
- **Why**: Enterprise reliability, multiple sources
- **Implementation**: 10+ sources, ML-based deduplication
- **Cost**: €69-99/mo
- **Expected Results**: 100+ events/month

### Vercel Cron Configuration
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/radar/sync-events",
      "schedule": "0 9 * * *"  // Daily 9am Vienna
    },
    {
      "path": "/api/radar/cleanup-duplicates",
      "schedule": "0 10 * * 0" // Weekly Sunday 10am
    }
  ]
}
```

---

## 5. Event Schema Design

### Core Event Schema (TypeScript)
Extends existing KINN event schema with radar-specific fields:

```typescript
// lib/schemas/radar-event.schema.ts
import { KINNEvent } from './event.schema';

export interface RadarEvent extends KINNEvent {
  // Source tracking
  source: EventSource;
  sourceId: string;
  sourceUrl: string;
  sourceLastUpdated?: DateTime;

  // Deduplication
  fingerprint: string;
  duplicateOf?: string; // Master event ID if duplicate
  confidence?: number;  // Deduplication confidence 0-1

  // Aggregation metadata
  firstSeen: DateTime;
  lastScraped: DateTime;
  scrapeCount: number;

  // Organization (extended)
  organizer: {
    name: string;
    email?: string;
    website?: string;
    platform?: string; // 'meetup', 'eventbrite', etc.
    profileUrl?: string;
  };

  // AI/Tech specific
  topics?: string[]; // ['LLM', 'Computer Vision', 'NLP']
  skillLevel?: SkillLevel;
  language?: 'de' | 'en' | 'mixed';
  targetAudience?: string[]; // ['developers', 'researchers', 'students']
}

export enum EventSource {
  MEETUP = 'meetup',
  EVENTBRITE = 'eventbrite',
  UNIVERSITY = 'university',
  PARTNER = 'partner',
  MANUAL = 'manual',
  FACEBOOK = 'facebook',
  LINKEDIN = 'linkedin',
  WEBSITE = 'website'
}

// Normalization function for each source
export function normalizeEvent(raw: any, source: EventSource): RadarEvent {
  const base = {
    id: `${source}_${raw.id || Date.now()}`,
    source,
    sourceId: raw.id?.toString() || '',
    sourceUrl: raw.url || '',
    fingerprint: generateFingerprint(raw),
    firstSeen: new Date(),
    lastScraped: new Date(),
    scrapeCount: 1
  };

  switch(source) {
    case EventSource.MEETUP:
      return normalizeMeetupEvent(raw, base);
    case EventSource.EVENTBRITE:
      return normalizeEventbriteEvent(raw, base);
    // ... other sources
  }
}
```

---

## 6. ICS System Adaptation

### Enhanced ICS Generator
Adapt existing KINN calendar.ics.js for multi-source events:

```javascript
// api/radar/calendar.ics.js
import { getRadarEvents } from '../utils/radar-redis.js';

function generateRadarICalFeed(events, options = {}) {
  const {
    includeSources = true,
    filterSource = null,
    calendarName = 'KI Events Tirol'
  } = options;

  let ical =
    'BEGIN:VCALENDAR\r\n' +
    'VERSION:2.0\r\n' +
    'PRODID:-//KINN//KI Event Radar Tirol//DE\r\n' +
    'NAME:' + calendarName + '\r\n' +
    'X-WR-CALNAME:' + calendarName + '\r\n' +
    'X-WR-CALDESC:Alle KI/Tech Events in Tirol\r\n' +
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H\r\n';

  // Add events with source attribution
  events.forEach(event => {
    if (filterSource && event.source !== filterSource) return;

    ical += 'BEGIN:VEVENT\r\n' +
      'UID:' + event.id + '@radar.kinn.at\r\n' +
      'SUMMARY:' + escapeICalText(
        includeSources ? `[${event.source}] ${event.title}` : event.title
      ) + '\r\n' +
      'DESCRIPTION:' + escapeICalText(
        event.description +
        '\\n\\nQuelle: ' + event.sourceUrl +
        '\\n\\nMehr Events: https://radar.kinn.at'
      ) + '\r\n' +
      'URL:' + event.sourceUrl + '\r\n' +
      'X-KINN-SOURCE:' + event.source + '\r\n' +
      // ... rest of event fields
      'END:VEVENT\r\n';
  });

  ical += 'END:VCALENDAR\r\n';
  return ical;
}

// Multiple calendar endpoints
export default async function handler(req, res) {
  const { source, format } = req.query;

  const events = await getRadarEvents({
    source: source || null,
    upcoming: true,
    limit: 100
  });

  if (format === 'json') {
    return res.json({ events });
  }

  const ical = generateRadarICalFeed(events, { filterSource: source });
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.send(ical);
}
```

### Calendar Subscription URLs
```
# All events
webcal://radar.kinn.at/api/calendar.ics

# Filtered by source
webcal://radar.kinn.at/api/calendar.ics?source=meetup
webcal://radar.kinn.at/api/calendar.ics?source=university

# JSON API
https://radar.kinn.at/api/calendar.ics?format=json
```

---

## 7. KI Initiativen Ecosystem Tirol (from CSV Analysis)

### Strategic Landscape Overview

Based on comprehensive analysis of KI initiatives in Tirol, here's the complete ecosystem mapping:

#### Initiative Comparison Matrix

| Initiative | Target Audience | Event Frequency | Geographic Focus | Entry Barrier | Key for RADAR |
|------------|----------------|-----------------|------------------|---------------|---------------|
| **KINN** | AI/ML Developers, Tech-Entrepreneurs | Weekly (Thu 8-9am) | Innsbruck (30km) | Low | Our platform - internal events |
| **DIH West** | SME Managers (5-250 employees) | Forums & Workshops | Tirol/Salzburg/Vorarlberg | Medium | KEY SOURCE - regular workshops |
| **WKO KI-Expertengruppe** | WKO members, entrepreneurs | AI-Frühstück, Webinars | Tirol | Medium | KEY SOURCE - business events |
| **AI Austria** | Researchers, Corporates, Startups | AAIC (2000+ participants), Meetups | Austria-wide | Low | KEY SOURCE - major conferences |
| **AI Collective** | Founders, Researchers, Investors | Grassroots Meetups | Global (not in Tirol yet) | Low | MONITOR - potential future |
| **AI Factory Austria** | Research institutions, Universities | Training & Masterclasses | Austria-wide | High | KEY SOURCE - academic events |
| **Standortagentur Tirol** | SMEs | Via DIH West | Tirol | - | PARTNER - funding info |

#### Role Distribution Analysis

| Capability | KINN | DIH West | WKO | AI Austria | AI Factory |
|------------|------|----------|-----|------------|------------|
| **Förderungen** | ❌ | ✅ Förderberatung | ✅ Navigiert Förderungsdschungel | ❌ | ✅ EU-Förderung |
| **Community Events** | ✅ Weekly | ✅ Foren & Workshops | ✅ AI-Frühstück | ✅ AAIC, Meetups | ❌ |
| **Workshops/Training** | ❌ | ✅ 3-Stufen-Konzept | ✅ "WiseUp" Webinar | ❌ | ✅ Masterclasses |
| **SME Focus** | ✅ Indirect | 🎯 Primary | ✅ | ❌ | ✅ One-Stop-Shop |
| **Regional Focus** | 🎯 Tirol only | 🌍 3 Bundesländer | 🎯 Tirol | 🌍 Austria | 🌍 Austria |
| **International Network** | ❌ | ✅ EU DIH | ✅ Bundesländer | 🌍 EAIF | 🌍 EuroHPC |

### Event Source Implications

#### New Priority Sources from CSV Analysis

**DIH West (Digital Innovation Hub West)**
- **Events**: "Digital im Land" regional workshops, 3-step program (lernen-ausprobieren-zeigen)
- **Target**: SMEs in Tirol, Salzburg, Vorarlberg
- **Integration**: Contact for event calendar access
- **Special**: Focus on regional districts, NOT Innsbruck-centered
- **Contact**: Via Standortagentur Tirol

**WKO KI-Expertengruppe**
- **Events**: AI-Frühstück series, "WiseUp" webinars
- **Target**: WKO members, UBIT sector
- **Frequency**: Regular breakfast meetings and webinars
- **Integration**: Monitor WKO event portal
- **Special**: Cross-expert group collaboration

**AI Factory Austria**
- **Events**: Training sessions, Masterclasses, Supercomputing workshops
- **Target**: Universities, research institutions, high-tech startups
- **Topics**: Biotech, Manufacturing, Physics, Public Admin AI applications
- **Access**: Through university partnerships (Uni Innsbruck is partner)
- **Timeline**: One-Stop-Shop planned from 2027

### Collaboration Opportunities

#### Synergies with KINN-RADAR
1. **DIH West**: Official event partner for SME-focused AI events
2. **WKO**: Business and enterprise AI event channel
3. **AI Austria**: National conference and meetup aggregation
4. **AI Factory**: Academic and research event pipeline
5. **Standortagentur**: Funding announcements and regional initiatives

#### Differentiation Strategy
- **KINN**: Low-barrier, informal, weekly community touchpoint
- **KINN-RADAR**: Aggregates ALL formats - from informal to academic
- **Unique Value**: Only platform combining grassroots + enterprise + academic events

---

## 8. Data Sources (Enhanced with CSV Insights)

### Tier 1: Priority Sources (CSV-Validated Active Initiatives)

#### 1. DIH West (Digital Innovation Hub West) 🆕
- **Status**: CONFIRMED ACTIVE (from CSV analysis)
- **Events**: "Digital im Land" workshops, 3-Stufen-Konzept (lernen-ausprobieren-zeigen)
- **Target**: SMEs in districts OUTSIDE Innsbruck
- **Method**: Partner API or structured scraping
- **Frequency**: Multiple workshops monthly
- **Expected Events**: 8-10/month
- **Contact**: Via Standortagentur Tirol

#### 2. WKO KI-Expertengruppe 🆕
- **Status**: CONFIRMED ACTIVE (from CSV analysis)
- **Events**: AI-Frühstück series, "WiseUp" webinars
- **URL**: https://www.wko.at/tirol/digitalisierung/ki-events
- **Method**: Web scraping + RSS monitoring
- **Frequency**: Weekly breakfast meetings
- **Expected Events**: 4-6/month
- **Special**: Cross-expert group events

#### 3. AI Austria Events ⭐
- **Status**: MAJOR PLAYER (2000+ AAIC participants)
- **Events**: AAIC Conference, regular meetups
- **Calendar**: https://aiaustria.com/event-calendar
- **Method**: API partnership (priority)
- **Expected Events**: 5-10/month (Austria-wide)
- **Filter**: Tirol-relevant events

#### 4. AI Factory Austria (Academic) 🎓
- **Status**: HIGH-TECH FOCUS (from CSV)
- **Events**: Masterclasses, supercomputing workshops
- **Access**: Via Uni Innsbruck partnership
- **Method**: University calendar integration
- **Expected Events**: 2-3/month
- **Timeline**: One-Stop-Shop from 2027

#### 5. Meetup.com (Established)
- **Groups**: applied-ai-meetup-innsbruck (AI Austria), innsbruck-ai, data-science-tirol
- **Method**: API (if approved) or web scraping
- **Frequency**: 2x daily sync
- **Expected Events**: 3-5/month

#### 6. Eventbrite (Broad Coverage)
- **Search**: "AI", "Machine Learning", "Data Science" + "Innsbruck"
- **Method**: API or scraping
- **Frequency**: 2x daily
- **Expected Events**: 3-5/month

#### 7. University of Innsbruck
- **URL**: https://www.uibk.ac.at/informatik/events/
- **Method**: Web scraping or RSS if available
- **Frequency**: Daily
- **Expected Events**: 2-4/month

### Tier 2: Secondary Sources (Month 2)

#### 4. FH Kufstein
- **URL**: https://www.fh-kufstein.ac.at/en/service/events/
- **Focus**: AI Congress, workshops
- **Expected Events**: 1-2/month

#### 5. MCI Innsbruck
- **URL**: https://www.mci.edu/en/
- **Focus**: Data Science events
- **Expected Events**: 1-2/month

#### 6. InnCubator
- **URL**: https://inncubator.at/en/events/
- **Focus**: Startup & tech events
- **Expected Events**: 2-3/month

#### 7. WK Tirol
- **URL**: https://www.wko.at/tirol/digitalisierung/ki-events
- **Focus**: Business AI events
- **Expected Events**: 2-3/month

### Tier 3: Partner Integration (Month 3+)

#### 8. Engineering Kiosk Alps
- **Method**: Direct calendar subscription
- **Frequency**: Monthly events

#### 9. Startup.Tirol
- **Newsletter**: Monthly with events
- **Method**: Email parsing or API partnership

#### 10. AI Austria Events
- **URL**: https://aiaustria.com/event-calendar
- **Method**: API partnership or scraping

### Newsletter Sources for Manual Import
1. **Startup.Tirol Newsletter** (Monthly, 1st Wednesday)
2. **AI Austria Newsletter** (Monthly Substack)
3. **MCI Event Newsletter**
4. **AustrianStartups "Startup Event"**
5. **10times Austria Tech** email alerts

---

## 8. Implementation Roadmap

### Phase 1: MVP Foundation (Weeks 1-2)
**Goal**: Newsletter-First Approach with AI Processing

```
Week 1: Newsletter Infrastructure 🆕
□ Set up radar@kinn.at email address
□ Configure Resend Inbound webhook
□ Implement Claude SDK integration (Haiku 4.5)
□ Subscribe to 10+ confirmed newsletters:
  - DIH West, WKO, AI Austria, Startup.Tirol
  - MCI, Uni Innsbruck, FH Kufstein
  - InnCubator, Engineering Kiosk
□ Build newsletter event extraction pipeline
□ Create RadarEvent schema with newsletter source tracking
□ Deploy webhook handler to Vercel

Week 2: Hybrid Approach (Newsletter + Selective Scraping)
□ Add WKO KI-Events scraper (for immediate events)
□ Process first batch of newsletters with Claude
□ Implement AI-powered deduplication
□ Add AI Austria calendar integration
□ Create admin dashboard for newsletter monitoring
□ Test calendar subscriptions
□ Monitor newsletter processing costs (target: <€5/mo)
```

### Phase 2: Enhanced Aggregation (Weeks 3-4)
**Goal**: 5+ sources, improved deduplication

```
Week 3:
□ Add University calendar scraper
□ Implement semantic deduplication
□ Create duplicate management UI
□ Add event filtering by source
□ Implement rate limiting properly
□ Add monitoring/alerts

Week 4:
□ Add FH Kufstein, MCI scrapers
□ Create partner onboarding process
□ Implement event quality scoring
□ Add JSON API endpoints
□ Create public radar page
□ Launch beta to test users
```

### Phase 3: Production Scale (Month 2)
**Goal**: Reliable system with 10+ sources

```
Month 2:
□ Migrate complex scrapers to Apify
□ Implement ML-based deduplication
□ Add InnCubator, WK Tirol sources
□ Create event submission form
□ Build newsletter parser
□ Add analytics tracking
□ Implement caching layer
□ Launch publicly
```

### Phase 4: Advanced Features (Month 3+)
**Goal**: Community features and automation

```
Month 3+:
□ AI-powered event categorization
□ Personalized event recommendations
□ WhatsApp/Telegram notifications
□ Integration with KINN main events
□ Multi-language support (DE/EN)
□ Event quality metrics
□ Source reliability scoring
□ Community event submissions
```

---

## 9. Success Metrics (Updated with CSV Insights)

### Technical KPIs
- **Uptime**: 99.5% for ICS feed
- **Latency**: <500ms for calendar requests
- **Freshness**: Events updated within 12 hours
- **Deduplication**: <5% duplicate rate across 6 major initiatives

### Business KPIs
- **Event Coverage**: Cover ALL 6 active KI initiatives in Tirol
- **Sources**: 12+ active sources (7 confirmed from CSV + 5 additional)
- **Geographic Coverage**: Innsbruck + all Tirol districts (via DIH West)
- **Audience Reach**:
  - Developers/Tech (KINN, Meetup)
  - SMEs (DIH West, WKO)
  - Academics (AI Factory, Universities)
  - Corporates (AI Austria)
- **Subscribers**: 100+ calendar subscribers in 6 months
- **Usage**: 1000+ calendar syncs/month

### Strategic KPIs (from CSV Analysis)
- **Initiative Coverage**: 6/6 active Tirol initiatives integrated
- **SME Events**: 10+ monthly (DIH West + WKO focus)
- **Academic Events**: 5+ monthly (Universities + AI Factory)
- **Community Events**: 8+ monthly (KINN + Meetups)
- **Cross-Border**: Include relevant Salzburg/Vorarlberg events (DIH West coverage)

### Quality Metrics
- **Data Completeness**: 90% events with full details
- **Source Attribution**: 100% events with source link
- **Update Frequency**: Daily for all primary sources

### Monitoring Dashboard
```javascript
// api/radar/metrics.js
export async function getRadarMetrics() {
  return {
    events: {
      total: await redis.get('radar:metrics:events:total'),
      thisMonth: await redis.get('radar:metrics:events:month'),
      bySo urce: await redis.hgetall('radar:metrics:events:by_source')
    },
    scraping: {
      lastRun: await redis.get('radar:metrics:last_sync'),
      successRate: await redis.get('radar:metrics:success_rate'),
      errors: await redis.lrange('radar:metrics:errors', 0, 10)
    },
    deduplication: {
      duplicatesFound: await redis.get('radar:metrics:duplicates'),
      mergedEvents: await redis.get('radar:metrics:merged')
    },
    subscribers: {
      total: await redis.scard('radar:subscribers'),
      activeThisWeek: await redis.get('radar:metrics:active_users')
    }
  };
}
```

---

## 10. Budget & Resources

### Cost Analysis

#### Phase 1: MVP (Month 1)
- **Vercel Pro**: €20/mo (existing)
- **Upstash Redis**: €5/mo (existing)
- **Total**: €0 additional

#### Phase 2: Scale (Month 2-3)
- **Apify Starter**: €39/mo
- **Additional Redis**: €5/mo
- **Total**: €44/mo additional

#### Phase 3: Production (Month 4+)
- **Apify Scale**: €69/mo
- **Monitoring (Sentry)**: €26/mo
- **Total**: €95/mo additional

### Time Investment
- **Phase 1 Development**: 40 hours
- **Phase 2 Enhancement**: 20 hours
- **Phase 3 Automation**: 20 hours
- **Ongoing Maintenance**: 5 hours/month

### Team Requirements
- **Developer**: 1 person (TypeScript, scraping experience)
- **Operations**: Shared with KINN team
- **Content Curation**: Community-driven

---

## Appendix A: Key Learnings from Research

### Event Scraping Best Practices
1. **Always check robots.txt** before scraping
2. **Use 3-5 second delays** between requests minimum
3. **Identify your scraper** with proper User-Agent
4. **Never collect personal data** without consent
5. **Attribute sources** and link back to originals

### GDPR Compliance for Event Aggregation
- **Lawful basis**: Legitimate interest for community service
- **Data minimization**: Only public event information
- **Transparency**: Clear privacy policy and opt-out
- **No profiling**: Don't track individual attendees
- **Source respect**: Remove events upon request

### Deduplication Strategies
1. **Exact matching**: Same time + same venue = duplicate
2. **Fuzzy matching**: Jaro-Winkler similarity > 0.85
3. **Semantic matching**: Combined score of title + time + location
4. **Manual review**: UI for admin to merge/split events

### Austrian Tech Ecosystem Insights
- **Meetup.com** most active for developer events
- **Universities** reliable for academic events
- **WK Tirol** focuses on business/enterprise AI
- **Startup scene** uses mixed platforms (Eventbrite, custom sites)
- **Language**: 60% German, 30% English, 10% mixed

---

## Appendix B: Technical Implementation Details

### Scraper Template
```javascript
// lib/scrapers/base-scraper.js
export class BaseScraper {
  constructor(source, config) {
    this.source = source;
    this.config = config;
    this.limiter = new RateLimiter({
      minTime: config.delay || 3000,
      maxConcurrent: 1
    });
  }

  async checkRobotsTxt(url) {
    // Implementation
  }

  async fetchWithRetry(url, maxRetries = 3) {
    // Implementation with exponential backoff
  }

  async normalize(rawEvent) {
    // Must be implemented by subclass
    throw new Error('normalize() must be implemented');
  }

  async scrape() {
    // Must be implemented by subclass
    throw new Error('scrape() must be implemented');
  }
}
```

### Deduplication Implementation
```javascript
// lib/deduplication/deduplicator.js
export class EventDeduplicator {
  constructor(threshold = 0.75) {
    this.threshold = threshold;
  }

  findDuplicates(newEvent, existingEvents) {
    const candidates = [];

    for (const existing of existingEvents) {
      const score = this.calculateSimilarity(newEvent, existing);
      if (score > this.threshold) {
        candidates.push({ event: existing, score });
      }
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  calculateSimilarity(event1, event2) {
    // Time similarity (30% weight)
    const timeDiff = Math.abs(
      new Date(event1.startTime) - new Date(event2.startTime)
    );
    const timeScore = timeDiff < 3600000 ? 1 : 0; // Within 1 hour

    // Title similarity (40% weight)
    const titleScore = this.jaroWinkler(
      event1.title.toLowerCase(),
      event2.title.toLowerCase()
    );

    // Venue similarity (30% weight)
    const venueScore = this.venueProximity(event1.venue, event2.venue);

    return (timeScore * 0.3) + (titleScore * 0.4) + (venueScore * 0.3);
  }

  jaroWinkler(s1, s2) {
    // Jaro-Winkler implementation
  }

  venueProximity(venue1, venue2) {
    if (!venue1.lat || !venue2.lat) return 0;
    const distance = haversine(
      venue1.lat, venue1.lng,
      venue2.lat, venue2.lng
    );
    return distance < 500 ? 1 : 0; // Within 500m
  }
}
```

### Redis Operations
```javascript
// lib/radar-redis.js
export async function addRadarEvent(event) {
  const redis = getRedisClient();

  // Get current events
  const config = await redis.get('radar:events') || { events: [] };

  // Check for duplicates
  const duplicates = deduplicator.findDuplicates(event, config.events);

  if (duplicates.length > 0) {
    // Track as duplicate
    await redis.hset(
      'radar:duplicates',
      event.id,
      duplicates[0].event.id
    );
    return { status: 'duplicate', masterId: duplicates[0].event.id };
  }

  // Add as new event
  config.events.push(event);
  await redis.set('radar:events', config);

  // Update metrics
  await redis.incr('radar:metrics:events:total');
  await redis.hincrby('radar:metrics:events:by_source', event.source, 1);

  return { status: 'added', eventId: event.id };
}
```

---

## Appendix C: Newsletter Processing Implementation Blueprint

### Complete Implementation Guide for Resend Inbound + Groq API

#### Groq-Specific Configuration

```javascript
// .env.local
RADAR_GROQ_API_KEY=gsk_... // Your Groq API key
GROQ_MODEL_PRIMARY=meta-llama/llama-4-scout-17b-16e-instruct
GROQ_MODEL_FALLBACK=meta-llama/llama-4-scout-17b-16e-instruct // Same model for consistency
GROQ_RATE_LIMIT_DELAY=2000 // 2 seconds between requests
```

#### Groq Model Configuration

**PRIMARY MODEL (Required):**
```
meta-llama/llama-4-scout-17b-16e-instruct
```

This is the specified model for KINN-RADAR event extraction, optimized for:
- German/English bilingual content
- Structured data extraction
- High accuracy with event details
- Fast processing (200-500ms)
- Excellent within Groq's free tier limits

#### Step 1: Email Setup
```bash
# 1. Create dedicated email in Resend Dashboard
radar@in.kinn.at  # Using in.kinn.at domain

# 2. Configure Inbound parsing
Domain: in.kinn.at
Route: /api/webhooks/newsletter-inbound

# 3. Configure opt-in forwarding
Forward confirmations to: thomas@kinn.at
```

#### Step 2: Webhook Handler Implementation
```javascript
// api/webhooks/newsletter-inbound.js
import { verifySignature } from '@/lib/resend-verify';
import { processNewsletterWithClaude } from '@/lib/claude-processor';
import { addRadarEvents } from '@/lib/radar-redis';

export async function POST(req) {
  try {
    // Verify Resend signature
    const signature = req.headers.get('resend-signature');
    if (!verifySignature(req.body, signature)) {
      return new Response('Invalid signature', { status: 401 });
    }

    const { from, to, subject, html, text, attachments } = await req.json();

    // Log receipt
    console.log(`[NEWSLETTER] Received from ${from}: ${subject}`);

    // Identify newsletter source
    const source = identifyNewsletterSource(from);
    if (!source) {
      console.log(`[NEWSLETTER] Unknown sender: ${from}`);
      return new Response('OK', { status: 200 });
    }

    // Process with Claude
    const extractedEvents = await processNewsletterWithClaude({
      source,
      subject,
      content: html || text,
      attachments
    });

    // Store events
    const results = await addRadarEvents(extractedEvents, {
      source: `newsletter_${source}`,
      newsletterFrom: from,
      receivedAt: new Date()
    });

    // Log results
    console.log(`[NEWSLETTER] Processed ${source}: ${results.added} added, ${results.enriched} enriched, ${results.skipped} skipped`);

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[NEWSLETTER] Processing error:', error);
    return new Response('Internal error', { status: 500 });
  }
}

function identifyNewsletterSource(from) {
  const sources = {
    'startup.tirol': 'startup_tirol',
    'aiaustria': 'ai_austria',
    'wko.at': 'wko',
    'dih-west': 'dih_west',
    'mci.edu': 'mci',
    'uibk.ac.at': 'uni_innsbruck',
    'fh-kufstein': 'fh_kufstein',
    'inncubator': 'inncubator'
  };

  for (const [domain, source] of Object.entries(sources)) {
    if (from.toLowerCase().includes(domain)) {
      return source;
    }
  }
  return null;
}
```

#### Step 3: Claude Processing Module
```javascript
// lib/claude-processor.js
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function processNewsletterWithClaude({ source, subject, content, attachments }) {
  // Source-specific prompts for better extraction
  const sourcePrompts = {
    startup_tirol: 'Focus on startup and tech events in Tirol',
    ai_austria: 'Extract AI/ML conferences, meetups, and workshops',
    wko: 'Look for business AI events, trainings, and webinars',
    dih_west: 'Find SME digitalization workshops and regional events'
  };

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4096,
    temperature: 0.2, // Lower temperature for consistent extraction
    messages: [{
      role: 'user',
      content: `You are an expert at extracting event information from German and English newsletters.

${sourcePrompts[source] || ''}

Extract events from this newsletter that meet ALL these CRITICAL criteria:

MANDATORY FILTERS - Only include events that are:
1. **FREE** (kostenlos, gratis, no cost, 0€) - REJECT any event with price/fee/ticket
2. **Located in TYROL** (Innsbruck, Hall, Wattens, Kufstein, etc.) - REJECT Vienna/Salzburg/Munich
3. **AI/ML/Data related** - Must contain AI, KI, Machine Learning, Data Science keywords
4. **PUBLIC** (open registration) - REJECT internal/members-only/private events

If an event has ANY cost (even €5), EXCLUDE it.
If an event is outside Tyrol, EXCLUDE it.
If unsure about any criteria, EXCLUDE the event.

Newsletter source: ${source}
Subject: ${subject}

Content:
${content.substring(0, 50000)} // Limit content length

For each QUALIFYING event (FREE + TYROL + AI), extract:
{
  "title": "Event title",
  "date": "ISO 8601 date (YYYY-MM-DD)",
  "time": "HH:MM in 24h format",
  "endTime": "HH:MM if available",
  "location": {
    "name": "Venue name or 'Online'",
    "address": "Full address if physical",
    "isOnline": boolean
  },
  "description": "Brief description (max 200 chars)",
  "registrationUrl": "Registration or info URL",
  "type": "workshop|meetup|conference|webinar|networking",
  "language": "de|en|mixed",
  "targetAudience": ["developers", "executives", "researchers", etc],
  "topics": ["AI", "ML", "Cloud", etc],
  "recurring": boolean,
  "recurringPattern": "weekly|monthly|null"
}

Important:
- Convert German dates like "15. März" to ISO format
- "Jeden ersten Mittwoch" means monthly recurring
- If unsure about a field, use null
- Return empty array [] if no events found

Return ONLY a JSON array of events, no other text.`
    }]
  });

  try {
    const events = JSON.parse(response.content[0].text);

    // Post-process and validate
    return events.map(event => ({
      ...event,
      source: `newsletter_${source}`,
      extractedAt: new Date(),
      confidence: calculateConfidence(event)
    }));
  } catch (error) {
    console.error('[CLAUDE] Failed to parse response:', error);
    return [];
  }
}

function calculateConfidence(event) {
  let score = 0;
  if (event.title) score += 0.3;
  if (event.date) score += 0.3;
  if (event.location?.name) score += 0.2;
  if (event.registrationUrl) score += 0.2;
  return Math.min(score, 1.0);
}
```

#### Step 4: Deduplication with Claude
```javascript
// lib/claude-dedup.js
export async function deduplicateWithClaude(newEvent, existingEvents) {
  // Pre-filter to reduce Claude calls
  const candidates = existingEvents.filter(e => {
    const dateDiff = Math.abs(new Date(e.date) - new Date(newEvent.date));
    return dateDiff < 86400000; // Within 24 hours
  });

  if (candidates.length === 0) return null;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    temperature: 0,
    messages: [{
      role: 'user',
      content: `Compare this new event with existing events to find duplicates.

New Event:
${JSON.stringify(newEvent, null, 2)}

Existing Events:
${JSON.stringify(candidates, null, 2)}

Rules:
- Same date + similar title = likely duplicate
- Same venue + same time = very likely duplicate
- Consider typos and language differences (DE/EN)
- Newsletter events might have less detail

Return JSON:
{
  "isDuplicate": boolean,
  "matchedEventId": "id of matching event or null",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}`
    }]
  });

  return JSON.parse(response.content[0].text);
}
```

#### Step 5: Newsletter Subscription Manager
```javascript
// scripts/subscribe-newsletters.js
const newsletters = [
  { name: 'Startup.Tirol', email: 'newsletter@startup.tirol', subscribeUrl: 'https://startup.tirol/newsletter' },
  { name: 'AI Austria', email: 'office@aiaustria.com', subscribeUrl: 'https://aiaustria.substack.com' },
  { name: 'WKO Tirol', email: 'digitalisierung@wko.at', subscribeUrl: 'https://wko.at/newsletter' },
  { name: 'DIH West', email: 'info@dih-west.at', subscribeUrl: 'https://dih-west.at/newsletter' },
  { name: 'MCI', email: 'events@mci.edu', subscribeUrl: 'https://mci.edu/newsletter' },
  // ... add all sources
];

// Track subscriptions in Redis
async function trackSubscription(newsletter) {
  await redis.hset('radar:newsletter:subscriptions', newsletter.name, {
    email: newsletter.email,
    subscribedAt: new Date(),
    lastReceived: null,
    eventCount: 0
  });
}

// Monitor newsletter health
async function checkNewsletterHealth() {
  const subs = await redis.hgetall('radar:newsletter:subscriptions');
  const unhealthy = [];

  for (const [name, data] of Object.entries(subs)) {
    const lastReceived = new Date(data.lastReceived);
    const daysSinceLastEmail = (Date.now() - lastReceived) / (1000 * 60 * 60 * 24);

    if (daysSinceLastEmail > 30) {
      unhealthy.push({ name, lastReceived, daysSinceLastEmail });
    }
  }

  if (unhealthy.length > 0) {
    console.warn('[NEWSLETTER] Unhealthy subscriptions:', unhealthy);
    // Send alert or resubscribe
  }
}
```

#### Step 6: Cost Monitoring
```javascript
// lib/cost-tracker.js
export async function trackClaudeUsage(tokens, model = 'haiku') {
  const costs = {
    'haiku': { input: 0.00025, output: 0.00125 }, // per 1K tokens
    'sonnet': { input: 0.003, output: 0.015 }
  };

  const cost = (tokens.input / 1000 * costs[model].input) +
               (tokens.output / 1000 * costs[model].output);

  // Store daily usage
  const today = new Date().toISOString().split('T')[0];
  await redis.hincrby(`radar:costs:${today}`, 'claude_tokens', tokens.input + tokens.output);
  await redis.hincrbyfloat(`radar:costs:${today}`, 'claude_cost_eur', cost);

  // Check budget
  const monthlyBudget = 10; // €10/month
  const monthCost = await getMonthlyClaudeCost();
  if (monthCost > monthlyBudget * 0.8) {
    console.warn(`[COST] Approaching budget limit: €${monthCost}/${monthlyBudget}`);
  }
}
```

### Groq API Testing Script

```javascript
// scripts/test-groq-extraction.js
import Groq from 'groq-sdk';
import fs from 'fs';

const groq = new Groq({
  apiKey: process.env.RADAR_GROQ_API_KEY
});

async function testGroqExtraction() {
  // Test with real newsletter sample
  const testNewsletter = `
    Liebe KI-Enthusiasten,

    wir laden Sie herzlich zu unserem nächsten AI Workshop ein:

    **Workshop: Large Language Models in der Praxis**
    Datum: 15. März 2025
    Zeit: 18:00 - 20:00 Uhr
    Ort: InnCubator, Eduard-Bodem-Gasse 5, Innsbruck

    Anmeldung unter: https://example.com/workshop-llm

    Außerdem findet jeden ersten Mittwoch im Monat unser
    AI-Stammtisch im Stiftskeller statt, 19:00 Uhr.

    Mit besten Grüßen,
    Das Team
  `;

  console.log('Testing Groq event extraction...');
  console.time('Extraction time');

  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct", // Specified scout model
    messages: [{
      role: "system",
      content: `Extract events from this German newsletter as JSON.

ONLY include events that are:
1. FREE (kostenlos/gratis) - no cost
2. In TYROL (Innsbruck, Hall, Wattens, etc.)
3. AI/ML/Data Science related
4. PUBLIC (open registration)

Exclude all paid events, events outside Tyrol, and private events.`
    }, {
      role: "user",
      content: testNewsletter
    }],
    temperature: 0.1,
    max_tokens: 1024
  });

  console.timeEnd('Extraction time');

  const extracted = JSON.parse(response.choices[0].message.content);
  console.log('Extracted events:', JSON.stringify(extracted, null, 2));

  // Test token usage
  console.log('Tokens used:', response.usage);
  console.log('Free tier remaining:', 300000 - response.usage.total_tokens);
}

testGroqExtraction();
```

### Testing Strategy

```javascript
// tests/newsletter-processing.test.js
describe('Newsletter Processing', () => {
  test('Extract events from Startup.Tirol newsletter', async () => {
    const sample = fs.readFileSync('samples/startup-tirol.html', 'utf8');
    const events = await processNewsletterWithClaude({
      source: 'startup_tirol',
      subject: 'Startup.Tirol Newsletter März 2025',
      content: sample
    });

    expect(events).toHaveLength(3);
    expect(events[0]).toHaveProperty('title');
    expect(events[0]).toHaveProperty('date');
  });

  test('Deduplicate newsletter events', async () => {
    const newEvent = { title: 'AI Workshop Innsbruck', date: '2025-03-15' };
    const existing = [{ id: '123', title: 'AI Workshop in Innsbruck', date: '2025-03-15' }];

    const result = await deduplicateWithClaude(newEvent, existing);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchedEventId).toBe('123');
  });
});
```

### Deployment Checklist

```
□ Set up radar@in.kinn.at in Resend
□ Configure forwarding rule for opt-in emails to thomas@kinn.at
□ Deploy webhook handler to Vercel
□ Set ANTHROPIC_API_KEY in Vercel env
□ Subscribe to first 5 newsletters manually (see Newsletter Subscription Guide below)
□ Test with sample newsletter forward
□ Monitor first week's processing
□ Calculate actual costs vs estimates
□ Subscribe to remaining newsletters
□ Set up cost alerts at €8/month
□ Document any source-specific quirks
```

---

## Newsletter Subscription Guide

### Step-by-Step Subscription Process for Each Source

#### 1. **Startup.Tirol** ✅ EASY
- **URL**: https://www.startup.tirol/newsletter/
- **Process**:
  1. Visit URL
  2. Select: Anrede (Herr/Frau/Divers)
  3. Enter: Name (Thomas KINN)
  4. Enter: Email (radar@in.kinn.at)
  5. Check: Datenschutz consent
  6. Submit → No double opt-in needed
- **Frequency**: Monthly (1st Wednesday)
- **Language**: German

#### 2. **AI Austria (Substack)** ✅ EASY
- **URL**: https://aiaustria.substack.com/
- **Process**:
  1. Visit URL
  2. Enter: radar@in.kinn.at in signup box
  3. Click Subscribe
  4. **IMPORTANT**: Confirmation email will arrive
  5. Forward to thomas@kinn.at for opt-in click
- **Frequency**: Monthly
- **Language**: English

#### 3. **WKO Tirol (Tiroler Wirtschaft)** ⚠️ MEDIUM
- **URL**: https://newsletter.wko.at/Form?frm=d29226b3-af65-4ec5-a5e4-3af3d6da3e8f
- **Alternative**: https://www.wko.at/epu/newsletter-anmeldung
- **Process**:
  1. Visit URL
  2. Fill form (details vary)
  3. Use email: radar@in.kinn.at
  4. **IMPORTANT**: Double opt-in likely
  5. Forward confirmation to thomas@kinn.at
- **Frequency**: Bi-weekly
- **Language**: German

#### 4. **DIH West** 📧 EMAIL REQUIRED
- **No direct signup form**
- **Process**:
  1. Send email to: info@dih-west.at
  2. Subject: "Newsletter Anmeldung für KI Events"
  3. Body:
     ```
     Sehr geehrtes DIH West Team,

     wir möchten gerne den DIH West Newsletter für KI und
     Digitalisierungs-Events abonnieren.

     Email: radar@in.kinn.at
     Organisation: KINN (KI Treff Innsbruck)
     Zweck: Event-Aggregation für die Tiroler KI-Community

     Mit freundlichen Grüßen,
     Thomas Jost
     KINN
     ```
- **Alternative**: Monitor RSS feed: https://dih-west.at/feed/

#### 5. **MCI Innsbruck** ⚠️ COMPLEX
- **No direct link** - navigate from homepage
- **Process**:
  1. Visit www.mci.edu or www.mci4me.at
  2. Look for newsletter signup (varies)
  3. Enter: Title (optional), Name, Email (radar@in.kinn.at)
  4. **IMPORTANT**: Double opt-in required
  5. Forward confirmation to thomas@kinn.at
- **Unsubscribe**: unsubscribe@mci.edu
- **Frequency**: Monthly
- **Language**: German/English

#### 6. **University of Innsbruck CS** ❌ NO NEWSLETTER
- **No email newsletter available**
- **Alternative Strategy**:
  1. Monitor: https://www.uibk.ac.at/informatik/news/
  2. Check: https://www.uibk.ac.at/informatik/events/
  3. Consider: Direct contact with department
  4. Email: informatik@uibk.ac.at for event notifications

#### 7. **FH Kufstein** ✅ MEDIUM
- **URL**: https://www.fh-kufstein.ac.at/eng/Newsletter-Registration-Magazine-subscription
- **Alternative**: http://eignungstest.fh-kufstein.ac.at/Newsletter-Abo
- **Process**:
  1. Visit URL
  2. Fill registration form
  3. Email: radar@in.kinn.at
  4. Likely double opt-in
  5. Forward confirmation to thomas@kinn.at
- **Also offers**: "watch*out" magazine (Feb/Oct)
- **Language**: German/English

#### 8. **InnCubator** ✅ EASY
- **URL**: https://inncubator.at/en/news/
- **Process**:
  1. Visit news page
  2. Find subscription form (usually footer/sidebar)
  3. Enter: radar@in.kinn.at
  4. Submit
  5. If double opt-in, forward to thomas@kinn.at
- **Language**: German/English

#### 9. **Engineering Kiosk Alps** 💬 DISCORD/CONTACT
- **No newsletter** - Discord-based community
- **Process**:
  1. Join Discord: https://engineeringkiosk.dev/meetup/alps/
  2. OR contact organizers directly
  3. Request event notifications to radar@in.kinn.at
- **Events**: Monthly meetups (usually 18:30)
- **Location**: sigma star gmbh, Eduard-Bodem-Gasse 5, Innsbruck

#### 10. **AustrianStartups** ✅ MEDIUM
- **URL**: https://austrianstartups.com/
- **Process**:
  1. Look for newsletter signup (footer)
  2. Choose: "Startup Event Newsletter"
  3. Enter: radar@in.kinn.at
  4. Likely double opt-in required
  5. Forward to thomas@kinn.at
- **Options**: "Startup Melange" and "Startup Event" newsletters
- **Language**: German/English

### Summary Table: Subscription Complexity

| Newsletter | Difficulty | Direct Link | Double Opt-in | Action |
|------------|-----------|-------------|---------------|--------|
| Startup.Tirol | ✅ Easy | Yes | No | Subscribe directly |
| AI Austria | ✅ Easy | Yes | Yes | Forward opt-in |
| WKO Tirol | ⚠️ Medium | Yes | Yes | Forward opt-in |
| DIH West | 📧 Manual | No | N/A | Send email |
| MCI | ⚠️ Complex | No | Yes | Navigate + Forward |
| Uni IBKCS | ❌ None | No | N/A | Monitor website |
| FH Kufstein | ✅ Medium | Yes | Likely | Forward opt-in |
| InnCubator | ✅ Easy | Yes | Likely | Forward opt-in |

### Opt-In Confirmation Process

**For thomas@kinn.at:**
1. Monitor inbox for forwarded opt-in emails
2. Subject will be: "[ACTION REQUIRED] Opt-in: [Newsletter Source]"
3. Click confirmation link in forwarded email
4. Log confirmation in tracking sheet
5. Update Redis: Mark newsletter as "confirmed"

### Tracking Sheet Template

```
| Source | Subscribed | Opt-in Sent | Confirmed | First Email | Notes |
|--------|-----------|-------------|-----------|-------------|--------|
| Startup.Tirol | 2025-12-07 | N/A | ✅ | Pending | No opt-in needed |
| AI Austria | 2025-12-07 | 2025-12-07 | Pending | - | Substack |
| WKO Tirol | 2025-12-07 | 2025-12-07 | Pending | - | Form complex |
| DIH West | 2025-12-07 | N/A | Pending | - | Email sent |
```

### Expected Results

**Week 1:**
- 5 newsletters subscribed
- ~10 events extracted
- Cost: <€1

**Month 1:**
- 15+ newsletters active
- 50+ events/month extracted
- Cost: €3-5
- Deduplication rate: 20-30%

**Month 3:**
- Full automation
- 100+ events/month
- Cost: €5-8
- Manual intervention: <1hr/month

---

## Appendix D: SLC Event Overview Solutions

### Multiple Approaches for Event Management & Review

#### Option 1: Google Sheets Auto-Sync (RECOMMENDED FOR MVP)

**Implementation: Minimal Code, Maximum Value**

```javascript
// lib/google-sheets-sync.js
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const SHEET_ID = process.env.KINN_RADAR_SHEET_ID;
const SHEET_RANGE = 'Events!A:M';

// Service account auth (no OAuth needed)
const auth = new JWT({
  email: process.env.GOOGLE_SERVICE_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

export async function syncEventsToSheet(events) {
  // Transform events to sheet rows
  const rows = events.map(e => [
    e.id,
    e.title,
    e.date,
    e.time,
    e.location?.name || 'Online',
    e.source,
    e.registrationUrl || '',
    e.language,
    e.type,
    e.description,
    e.confidence || 1,
    e.extractedAt,
    e.status || 'active'
  ]);

  // Add header row
  const values = [
    ['ID', 'Title', 'Date', 'Time', 'Location', 'Source',
     'Registration', 'Language', 'Type', 'Description',
     'Confidence', 'Extracted', 'Status'],
    ...rows
  ];

  // Clear and update sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: SHEET_RANGE
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: SHEET_RANGE,
    valueInputOption: 'USER_ENTERED',
    resource: { values }
  });

  // Add conditional formatting for review
  await addConditionalFormatting(SHEET_ID);

  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}`;
}

// Webhook for sheet changes (manual corrections)
export async function handleSheetChange(req, res) {
  const { range, values } = req.body;

  // Sync corrections back to Redis
  for (const row of values) {
    if (row[12] === 'deleted') {
      await redis.hdel('radar:events', row[0]);
    } else {
      await redis.hset('radar:events', row[0], {
        ...parseRowToEvent(row),
        manuallyReviewed: true
      });
    }
  }
}
```

**Google Sheets Template Features:**
```
╔═══════════════════════════════════════════════════════╗
║ KINN-RADAR Event Management                          ║
╠═══════════════════════════════════════════════════════╣
║ Tabs:                                                 ║
║ 1. 📅 Upcoming (Auto-filtered next 30 days)         ║
║ 2. 📊 All Events (Full list with filters)           ║
║ 3. 🔍 Review Queue (Low confidence events)          ║
║ 4. ❌ Duplicates (Potential duplicates for review)   ║
║ 5. 📈 Analytics (Charts & stats)                     ║
╚═══════════════════════════════════════════════════════╝

Features:
- Color coding by source (DIH=Blue, WKO=Green, etc.)
- Confidence highlighting (Red < 0.7, Yellow < 0.9)
- Quick actions: Mark as reviewed/duplicate/deleted
- Auto-refresh every 5 minutes
- Mobile-friendly view
```

**Pros:**
- ✅ Zero UI development
- ✅ Familiar interface for non-techies
- ✅ Real-time collaboration
- ✅ Mobile access
- ✅ Export to any format
- ✅ Version history
- ✅ Comments & notes

**Cons:**
- ❌ Google dependency
- ❌ 10MB size limit (≈50K events)
- ❌ API rate limits

---

#### Option 2: Static CSV Export with Web Viewer

**Implementation: Ultra-Simple**

```javascript
// api/radar/export.csv.js
export async function GET(req, res) {
  const events = await getRadarEvents();

  const csv = [
    'Date,Time,Title,Location,Source,Registration,Status',
    ...events.map(e =>
      `"${e.date}","${e.time}","${e.title}","${e.location?.name}",` +
      `"${e.source}","${e.registrationUrl}","${e.status}"`
    )
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=kinn-radar-events.csv');
  res.send(csv);
}

// Simple HTML table viewer
// public/events-table.html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/simple-datatables@latest/dist/style.css">
</head>
<body>
  <h1>KINN-RADAR Events</h1>
  <table id="events-table"></table>

  <script src="https://cdn.jsdelivr.net/npm/simple-datatables@latest"></script>
  <script>
    fetch('/api/radar/events.json')
      .then(r => r.json())
      .then(data => {
        new simpleDatatables.DataTable("#events-table", {
          data: {
            headings: ["Date", "Title", "Location", "Source"],
            data: data.events.map(e => [
              e.date,
              `<a href="${e.registrationUrl}">${e.title}</a>`,
              e.location?.name,
              e.source
            ])
          },
          searchable: true,
          sortable: true,
          perPage: 25
        });
      });
  </script>
</body>
</html>
```

**Pros:**
- ✅ Simplest possible implementation
- ✅ No dependencies
- ✅ Works everywhere
- ✅ Fast loading

**Cons:**
- ❌ No real-time updates
- ❌ Manual refresh needed
- ❌ No collaboration

---

#### Option 3: Airtable Integration (Best UX)

```javascript
// lib/airtable-sync.js
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_KEY })
  .base(process.env.AIRTABLE_BASE);

export async function syncToAirtable(events) {
  const table = base('Events');

  // Bulk upsert
  const records = events.map(e => ({
    fields: {
      'Title': e.title,
      'Date': e.date,
      'Time': e.time,
      'Location': e.location?.name,
      'Source': e.source,
      'Status': { select: e.status },
      'Confidence': e.confidence,
      'Registration URL': e.registrationUrl,
      'Tags': e.topics,
      'Reviewed': e.manuallyReviewed || false
    }
  }));

  await table.create(records);
}
```

**Airtable Views:**
1. **Calendar View** - Visual month view
2. **Kanban by Status** - Drag to update
3. **Gallery View** - Card layout
4. **Form View** - Manual event submission

**Pros:**
- ✅ Beautiful UI
- ✅ Multiple views
- ✅ Automation rules
- ✅ Forms for manual input
- ✅ API + Webhooks

**Cons:**
- ❌ Costs €20+/mo
- ❌ Limited free tier

---

#### Option 4: Admin Dashboard (Most Control)

```jsx
// pages/admin/events.jsx
export default function EventsDashboard() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');

  return (
    <div className="p-6">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Events" value={events.length} />
        <StatCard title="This Week" value={thisWeekCount} />
        <StatCard title="Sources" value={uniqueSources} />
        <StatCard title="Review Needed" value={lowConfidence} />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="flex justify-between p-4 border-b">
          <input
            type="search"
            placeholder="Search events..."
            className="px-4 py-2 border rounded"
          />
          <div className="space-x-2">
            <button onClick={exportCSV}>📥 Export CSV</button>
            <button onClick={syncGoogleSheets}>📊 Sync Sheets</button>
            <button onClick={generateICS}>📅 Download ICS</button>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Source</th>
              <th>Confidence</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <EventRow
                key={event.id}
                event={event}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onMarkReviewed={handleMarkReviewed}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Features:**
- Real-time updates via WebSocket
- Bulk operations
- Advanced filtering
- Inline editing
- Duplicate detection UI
- Source quality metrics

---

### Recommended SLC Approach

#### Phase 1: Google Sheets (Week 1) ✅
```bash
# Immediate setup
1. Create Google Sheet
2. Add service account
3. Deploy sync function
4. Share sheet with Thomas

Time: 2 hours
Cost: €0
Value: High
```

#### Phase 2: Static Viewer (Week 2)
```bash
# Quick addition
1. Add CSV export endpoint
2. Deploy HTML table page
3. Add to navigation

Time: 1 hour
Cost: €0
Value: Medium
```

#### Phase 3: Dashboard (Month 2)
```bash
# When validated
1. Build React dashboard
2. Add edit capabilities
3. Implement review workflow

Time: 8 hours
Cost: €0
Value: High
```

### Quick Win: Combined Approach

```javascript
// api/radar/overview.js
export async function GET(req, res) {
  const { format } = req.query;
  const events = await getRadarEvents();

  switch(format) {
    case 'csv':
      return sendCSV(res, events);

    case 'json':
      return res.json({ events });

    case 'sheet':
      const url = await syncToGoogleSheets(events);
      return res.redirect(url);

    default:
      // Return simple HTML table
      return res.send(generateHTMLTable(events));
  }
}
```

**Access URLs:**
```
https://kinn.at/api/radar/overview          # HTML table
https://kinn.at/api/radar/overview?format=csv    # Download CSV
https://kinn.at/api/radar/overview?format=json   # JSON API
https://kinn.at/api/radar/overview?format=sheet  # Google Sheet
```

---

## Appendix E: Data Source Details

### Confirmed Event Sources in Tirol

| Source | Type | Method | Events/Month | Priority |
|--------|------|--------|--------------|----------|
| Applied AI Meetup Innsbruck | Meetup | API/Scrape | 2-3 | HIGH |
| University of Innsbruck CS | Website | Scrape | 3-4 | HIGH |
| FH Kufstein AI Events | Website | Scrape | 1-2 | HIGH |
| MCI Data Science | Website | Scrape | 1-2 | MEDIUM |
| InnCubator | Website | Scrape | 2-3 | MEDIUM |
| Engineering Kiosk Alps | Discord | Manual | 1 | MEDIUM |
| WK Tirol Digital Events | Website | Scrape | 2-3 | MEDIUM |
| Startup.Tirol | Newsletter | Parse | 3-5 | LOW |
| Impact Hub Tirol | Website | Scrape | 1-2 | LOW |
| SKInnovation (March) | Annual | Manual | Special | LOW |

### Event Discovery Channels

#### Newsletters (for manual monitoring)
1. Startup.Tirol Newsletter (1st Wednesday monthly)
2. AI Austria Substack (monthly)
3. MCI Newsletter (bi-weekly)
4. AustrianStartups Event Newsletter
5. WK Tirol DIGI.talk announcements

#### Social Media Monitoring
- LinkedIn: #AIAustria, #TirolTech
- Facebook: Innsbruck tech groups
- Telegram: Tech & AI channels
- Discord: Local dev communities

---

## Conclusion

KINN-RADAR represents a natural evolution of the KINN event system, expanding from internal events to become THE authoritative source for AI/tech events in Tirol. By leveraging existing infrastructure and following a phased approach, the project can launch quickly with minimal investment while maintaining flexibility for future growth.

### Next Steps
1. **Approval**: Review and approve plan with KINN team
2. **Setup**: Initialize radar-specific Redis structure
3. **MVP Build**: Implement Phase 1 (2 weeks)
4. **Testing**: Beta test with 10 users
5. **Launch**: Public announcement via KINN channels

### Success Factors
- **Reuse existing KINN infrastructure** (Redis, ICS, Vercel)
- **Start simple** with 2-3 sources, expand gradually
- **Focus on quality** over quantity of events
- **Maintain GDPR compliance** throughout
- **Build community trust** through transparency

---

*Document prepared by: KINN Technical Team*
*Last updated: 2025-12-07*
*Status: Ready for Implementation*