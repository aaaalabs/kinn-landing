# KINN Use Case Collection Pipeline
## Coding Agent Briefing - Code-Agnostic Implementation Guide

---

## 🎯 Projekt-Kontext

**Ziel:** Integration eines "Use Case einreichen"-Buttons im kinn.at User Dashboard, der ein Modal mit einer mehrstufigen Pipeline zum Sammeln und Validieren von KI Use Cases öffnet.

**Zweck:** Sammlung verifizierter, produktiver KI Use Cases für den "KI Praxis Report Tirol 2026" und das KINN:RAUS Podcast-Format.

**Bestehendes System:** kinn.at - Community-Plattform mit User Dashboard, Skill Matching, Event Calendar

---

## 📐 Bestehender Tech Stack (kinn.at)

```
Frontend:     Next.js (React-basiert)
Styling:      Tailwind CSS
Backend:      Next.js API Routes / Serverless Functions
Database:     [zu ermitteln - wahrscheinlich Vercel KV, Supabase, oder Postgres]
Auth:         [zu ermitteln - wahrscheinlich NextAuth oder custom]
Email:        Resend.com
Orchestration: Make.com (für Workflows)
AI:           Claude API (für Content Generation)
Hosting:      Vercel (wahrscheinlich)
```

**Wichtig:** Vor Implementation bestehende Codebase analysieren für:
- Aktuelle Component-Struktur und Naming Conventions
- State Management Pattern (Context, Zustand, Redux, etc.)
- API Route Struktur
- Database Schema und ORM (Prisma, Drizzle, raw SQL)
- Bestehende Modal/Dialog Components
- Form Handling Pattern (React Hook Form, Formik, native)

---

## 🔲 Feature-Übersicht

### 1. Dashboard Button
Ein prominenter CTA-Button im User Dashboard, der das Use Case Submission Modal öffnet.

### 2. Multi-Step Modal Wizard
Ein mehrstufiger Wizard mit:
- Qualifizierungsfragen (Gating)
- Use Case Details Formular
- Verifizierungs-Informationen
- Transparente Pipeline-Visualisierung

### 3. Backend Pipeline
- Submission Storage
- Status Tracking
- Admin Review Interface
- Notification System

---

## 📊 Data Model

### UseCase Entity

```typescript
interface UseCase {
  // Identifiers
  id: string;                    // UUID
  submitterId: string;           // Reference to User
  createdAt: Date;
  updatedAt: Date;
  
  // Qualification Answers
  isProductive: boolean;         // Must be true to proceed
  region: 'tirol' | 'austria' | 'dach' | 'international';
  tirolConnection?: 'office' | 'partner' | 'none';
  visibility: 'full' | 'anonymized' | 'report_only';
  
  // Computed Flags
  priority: 'high' | 'medium' | 'low';
  section: 'tirol' | 'tirol_connected' | 'austria' | 'network';
  podcastEligible: boolean;
  
  // Use Case Content
  headline: string;              // Max 100 chars
  problem: string;               // What was the problem?
  solution: string;              // What AI solution was implemented?
  result: string;                // Measurable outcome/ROI
  toolsUsed: string[];           // Array of tools (ChatGPT, Claude, etc.)
  industry: string;
  industryCustom?: string;       // If industry = 'Andere'
  companySize: 'solo' | 'micro' | 'small' | 'medium' | 'large';
  
  // Confirmer (for verification)
  confirmer: {
    name: string;
    role: string;
    company: string;
    linkedin?: string;
  };
  
  // Pipeline Status
  status: UseCaseStatus;
  statusHistory: StatusChange[];
  
  // Admin Fields
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  podcastScheduledDate?: Date;
  publishedAt?: Date;
}

type UseCaseStatus = 
  | 'submitted'      // Initial state
  | 'in_review'      // Being reviewed by KINN team
  | 'needs_info'     // Requires additional information
  | 'verified'       // Passed verification call
  | 'scheduled'      // Podcast scheduled
  | 'published'      // In report/podcast
  | 'rejected';      // Did not qualify

interface StatusChange {
  from: UseCaseStatus;
  to: UseCaseStatus;
  changedAt: Date;
  changedBy: string;
  note?: string;
}
```

### Pipeline Statistics (for display)

```typescript
interface PipelineStats {
  submitted: number;
  verified: number;
  scheduled: number;
  published: number;
  goal: number;        // Target: 50 verified use cases
}
```

---

## 🎨 UI Flow Specification

### Step 0: Dashboard Entry Point

**Location:** User Dashboard (nach Login)

**Button Spec:**
```
Position:     Prominent placement in dashboard sidebar or main content area
Label:        "Use Case einreichen" or "KI Praxis Report 2026"
Icon:         Microphone/Report icon (optional)
Style:        Primary CTA (KINN brand colors - see KINN_BRAND_STYLEGUIDE.md)
Badge:        Optional - "NEU" or current submission count
```

**Behavior:**
- Click → Open Modal
- If user has existing submissions → Show "Meine Use Cases" link alongside

---

### Step 1: Intro Screen

**Purpose:** Context setting, show pipeline transparency, motivate submission

**Content:**
```
Header:       "KI Praxis Report Tirol 2026"
Subheader:    "Der erste unabhängige Report zu produktiven KI-Lösungen in Tirol.
              Verifiziert. Mit echten Zahlen. Von echten Unternehmen."

Pipeline Stats (live from DB):
  - [X] eingereicht
  - [X] verifiziert
  - [X] Podcast geplant
  - [X] veröffentlicht
  
Progress Bar: [verified / goal * 100]%
Goal Text:    "Ziel: 50 verifizierte Use Cases"

Deadline:     "Einreichschluss: 31. März 2026"
              "Report-Release im April 2026"

CTA:          "Meinen Use Case einreichen →"
Footer:       "Dauert ca. 5 Minuten. Nur produktive Cases."
```

---

### Step 2: Qualification Question 1 - Produktiv?

**Purpose:** Gate non-productive cases early

```
Question:     "Ist dein KI Use Case bereits produktiv im Einsatz?"
Subtext:      "Wir suchen Lösungen, die nachweislich funktionieren - 
              keine Demos oder Prototypen."

Options:      
  ✅ "Ja, läuft produktiv" → Continue to Step 3
  ⚠️ "Noch in Entwicklung" → Exit Screen A
```

**Exit Screen A (Not Productive):**
```
Icon:         🔧
Header:       "Fast geschafft!"
Text:         "Wir sammeln aktuell nur Cases, die bereits produktiv laufen.
              Sobald dein Projekt live ist, freuen wir uns auf deine Einreichung!"
              
CTA:          "Erinnere mich in 3 Monaten" (optional - sets reminder)
Secondary:    "← Zurück zur Startseite"
```

---

### Step 3: Qualification Question 2 - Region

**Purpose:** Determine priority and report section

```
Question:     "Wo ist dein Unternehmen oder Projekt angesiedelt?"

Options:
  🏔️ "Tirol" → priority: high, section: tirol, Continue to Step 4
  🇦🇹 "Österreich (außerhalb Tirols)" → priority: medium, section: austria, Continue to Step 4
  🌍 "Deutschland/Schweiz/International" → Continue to Step 3b
```

---

### Step 3b: Tirol Connection (for non-Tirol)

**Purpose:** Find Tirol connection for international cases

```
Question:     "Hast du eine Verbindung nach Tirol?"

Options:
  🏢 "Ja, Niederlassung/Kunden in Tirol" → priority: medium, section: tirol_connected, Continue to Step 4
  🤝 "Ja, über Partner/Netzwerk" → priority: low, section: network, Continue to Step 4
  ❌ "Keine direkte Verbindung" → Exit Screen B
```

**Exit Screen B (No Tirol Connection):**
```
Icon:         🗺️
Header:       "Danke für dein Interesse!"
Text:         "Unser Fokus liegt aktuell auf dem Tiroler Ökosystem.
              Aber: Wir bauen ein DACH-weites Netzwerk auf."
              
CTA:          "Für DACH-Report anmelden" (optional - collects email for future)
Secondary:    "← Zurück"
```

---

### Step 4: Qualification Question 3 - Visibility

**Purpose:** Determine if podcast eligible

```
Question:     "Wie darf dein Use Case veröffentlicht werden?"

Options:
  📺 "Öffentlich mit Namen" → podcastEligible: true, Continue to Step 5
  👤 "Anonymisiert" → Continue to Step 4b
```

---

### Step 4b: Report Only Option

```
Question:     "Möchtest du trotzdem im Report erscheinen?"

Options:
  📊 "Ja, anonymisiert im Report" → podcastEligible: false, Continue to Step 5
  🔒 "Nein, komplett vertraulich" → Exit Screen C
```

**Exit Screen C (Confidential):**
```
Icon:         🔒
Header:       "Verstanden - deine Daten bleiben privat"
Text:         "Danke fürs Interesse! Wenn sich die Situation ändert,
              freuen wir uns auf deine Einreichung."
              
CTA:          "← Zurück zur Startseite"
```

---

### Step 5: Use Case Details Form

**Purpose:** Collect the actual use case information

**Form Fields:**

```
Section: "Dein Use Case"

1. Headline * (input, max 100 chars)
   Placeholder: "z.B. Angebotserstellung automatisiert"
   Helper:      "Ein Satz, der den Case zusammenfasst"

2. Problem * (textarea, max 500 chars)
   Placeholder: "Welches Problem wurde gelöst?"
   Helper:      "Was war die Ausgangssituation?"

3. Solution * (textarea, max 500 chars)
   Placeholder: "Wie wurde KI eingesetzt?"
   Helper:      "Welche Tools/Modelle? Wie implementiert?"

4. Result * (textarea, max 500 chars)
   Placeholder: "Was ist das messbare Ergebnis?"
   Helper:      "Zeitersparnis? Kostenreduktion? Zahlen helfen!"

5. Tools Used * (multi-select chips)
   Options:     [
                  'ChatGPT / GPT-4',
                  'Claude',
                  'Midjourney / DALL-E',
                  'Custom ML Model',
                  'Microsoft Copilot',
                  'Google Gemini',
                  'Open Source LLM',
                  'Andere'
                ]
   Min:         1 selection required

6. Industry * (select)
   Options:     [
                  'IT & Software',
                  'Handwerk & Produktion',
                  'Tourismus & Gastro',
                  'Handel & E-Commerce',
                  'Beratung & Agentur',
                  'Gesundheit & Medizin',
                  'Bau & Architektur',
                  'Andere'
                ]
   
   If 'Andere' → Show industryCustom input

7. Company Size * (radio cards)
   Options:     [
                  { value: 'solo', label: 'Solo / EPU', desc: '1 Person' },
                  { value: 'micro', label: 'Kleinstunternehmen', desc: '2-9 MA' },
                  { value: 'small', label: 'Kleinunternehmen', desc: '10-49 MA' },
                  { value: 'medium', label: 'Mittleres Unternehmen', desc: '50-249 MA' },
                  { value: 'large', label: 'Großunternehmen', desc: '250+ MA' }
                ]

Navigation:   "← Zurück" | "Weiter →"
Validation:   All * fields required before proceeding
```

---

### Step 6: Confirmer Details

**Purpose:** Collect verification contact

```
Header:       "Wer kann diesen Use Case bestätigen?"
Subtext:      "Das muss nicht der Kunde sein - kann auch ein Projektpartner 
              oder Kollege sein, der den Case kennt."

Form Fields:

1. Name * (input)
   Placeholder: "Max Mustermann"

2. Role * (input)
   Placeholder: "z.B. Geschäftsführer, Projektleiter, CTO"

3. Company * (input)
   Placeholder: "Firmenname"

4. LinkedIn (input, optional)
   Placeholder: "https://linkedin.com/in/..."
   Validation:  URL format if provided

CTA:          "Use Case einreichen ✓" (green/success color)
Navigation:   "← Zurück"
```

---

### Step 7: Success Screen

**Purpose:** Confirm submission, set expectations, show pipeline

```
Icon:         🎉
Header:       "Danke! Dein Use Case ist eingereicht"

Pipeline Visualization:
  ✓ Eingereicht (green checkmark)
  ⏳ Review durch KINN Team (1-2 Wochen) (blue/pending)
  ○ Verifizierung (Kurzer Check-Call) (gray/future)
  ○ Podcast-Termin (only if podcastEligible) (gray/future)

Text:         "Wir schauen uns deinen Case an und melden uns innerhalb 
              von 1-2 Wochen. Bei Fragen kontaktieren wir dich vorab."

Info Box:     "Aktuell sind [X] Use Cases in der Pipeline,
              davon [Y] verifiziert und [Z] bereits veröffentlicht."

CTA:          "← Zurück zur Startseite" (closes modal)
Optional:     "Weiteren Use Case einreichen" (resets form)
```

---

## 🔄 Backend Implementation

### API Endpoints

```
POST   /api/use-cases              Create new submission
GET    /api/use-cases              List user's submissions
GET    /api/use-cases/:id          Get single submission
PATCH  /api/use-cases/:id          Update submission (if status allows)

GET    /api/use-cases/stats        Get pipeline statistics (public)

# Admin endpoints (protected)
GET    /api/admin/use-cases        List all submissions with filters
PATCH  /api/admin/use-cases/:id    Update status, add notes
```

### Submission Flow

```
1. User submits form
   ↓
2. Backend validates data
   ↓
3. Compute priority/section/podcastEligible flags
   ↓
4. Store in database with status: 'submitted'
   ↓
5. Trigger Make.com webhook (optional):
   - Send confirmation email to user (Resend)
   - Notify admin channel (Slack/Discord)
   - Add to review queue
   ↓
6. Return success response with submission ID
```

### Priority/Section Calculation Logic

```javascript
function computeFlags(answers) {
  let priority = 'medium';
  let section = 'austria';
  let podcastEligible = true;

  // Region-based priority
  if (answers.region === 'tirol') {
    priority = 'high';
    section = 'tirol';
  } else if (answers.region === 'austria') {
    priority = 'medium';
    section = 'austria';
  } else if (answers.tirolConnection === 'office') {
    priority = 'medium';
    section = 'tirol_connected';
  } else if (answers.tirolConnection === 'partner') {
    priority = 'low';
    section = 'network';
  }

  // Visibility-based podcast eligibility
  if (answers.visibility === 'report_only' || answers.visibility === 'anonymized') {
    podcastEligible = false;
  }

  return { priority, section, podcastEligible };
}
```

### Email Notifications (via Resend)

**On Submission:**
```
To:       User email
Subject:  "Dein Use Case wurde eingereicht - KINN"
Content:  
  - Confirmation of receipt
  - Summary of submitted data
  - Expected timeline
  - Contact for questions
```

**On Status Change:**
```
To:       User email
Subject:  "Update zu deinem Use Case - KINN"
Content:  
  - New status
  - Next steps
  - If needs_info: What's needed
```

---

## 🔐 Security & Validation

### Input Validation

```javascript
const validationSchema = {
  headline: { required: true, maxLength: 100 },
  problem: { required: true, maxLength: 500 },
  solution: { required: true, maxLength: 500 },
  result: { required: true, maxLength: 500 },
  toolsUsed: { required: true, minItems: 1, allowedValues: TOOLS_LIST },
  industry: { required: true, allowedValues: INDUSTRIES_LIST },
  industryCustom: { requiredIf: (data) => data.industry === 'Andere', maxLength: 100 },
  companySize: { required: true, allowedValues: ['solo', 'micro', 'small', 'medium', 'large'] },
  confirmer: {
    name: { required: true, maxLength: 100 },
    role: { required: true, maxLength: 100 },
    company: { required: true, maxLength: 100 },
    linkedin: { required: false, pattern: /^https:\/\/(www\.)?linkedin\.com\/.*/ }
  }
};
```

### Authorization

```
- Submission: Requires authenticated user
- View own submissions: Requires authenticated user, user.id === submission.submitterId
- Admin endpoints: Requires authenticated user with admin role
- Public stats: No auth required
```

### Rate Limiting

```
- Submissions: Max 5 per user per day
- Stats endpoint: Standard API rate limits
```

---

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile First */
sm: 640px   /* Modal: full screen */
md: 768px   /* Modal: centered, max-width: 560px */
lg: 1024px  /* Same as md */
```

### Mobile Considerations

- Full-screen modal on mobile
- Touch-friendly tap targets (min 44x44px)
- Keyboard-aware (scroll to focused input)
- Progress indicator always visible
- "Back" button always accessible

---

## 🧪 Testing Checklist

### Functional Tests

```
□ Complete happy path (Tirol, public, all fields)
□ Exit path: Not productive
□ Exit path: No Tirol connection
□ Exit path: Confidential
□ All form validations work
□ Multi-select tools works
□ Industry "Andere" shows custom field
□ Submission creates database entry
□ Stats update after submission
□ Email notification sent
□ User can view their submissions
```

### Edge Cases

```
□ User submits multiple use cases
□ User refreshes mid-flow
□ User closes and reopens modal
□ Long text in fields
□ Special characters in inputs
□ LinkedIn URL validation
□ Network error during submission
```

### Accessibility

```
□ Keyboard navigation works
□ Screen reader announces steps
□ Focus management in modal
□ Error messages associated with fields
□ Color contrast meets WCAG AA
```

---

## 📁 File Structure Suggestion

```
/components/
  /use-case-wizard/
    index.tsx                 # Main modal wrapper
    WizardContext.tsx         # State management
    IntroStep.tsx
    QualificationSteps.tsx    # Q1, Q2, Q2b, Q3, Q3b
    DetailsForm.tsx
    ConfirmerForm.tsx
    SuccessStep.tsx
    ExitScreens.tsx           # Not productive, No connection, Confidential
    PipelineStats.tsx         # Reusable stats component
    ProgressIndicator.tsx

/lib/
  /use-cases/
    schema.ts                 # Zod/Yup validation schema
    types.ts                  # TypeScript interfaces
    api.ts                    # API client functions
    flags.ts                  # Priority/section computation

/pages/api/  (or /app/api/)
  /use-cases/
    route.ts                  # POST, GET handlers
    [id]/
      route.ts                # GET, PATCH handlers
    stats/
      route.ts                # GET pipeline stats

/pages/api/admin/  (or /app/api/admin/)
  /use-cases/
    route.ts                  # Admin list/filter
    [id]/
      route.ts                # Admin update
```

---

## 🔗 Integration Points

### Make.com Webhook

Trigger on new submission for:
1. Send confirmation email (Resend)
2. Post to admin Slack/Discord channel
3. Add to Notion/Airtable review board (optional)
4. Schedule follow-up reminder

**Webhook Payload:**
```json
{
  "event": "use_case_submitted",
  "submission_id": "uuid",
  "submitter_email": "user@example.com",
  "headline": "...",
  "priority": "high",
  "section": "tirol",
  "podcastEligible": true,
  "submitted_at": "2025-12-24T10:00:00Z"
}
```

### Dashboard Integration

```
Location: User Dashboard sidebar or main content
Trigger:  Button click opens modal
State:    If user has submissions, show count badge
Link:     "Meine Use Cases" → List view of user's submissions
```

---

## 🎯 Success Metrics

Track:
- Conversion: Dashboard visitors → Submissions
- Completion rate: Started wizard → Completed submission
- Drop-off points: Which step has highest abandonment
- Quality: Submissions → Verified (admin review)
- Time to submit: Average time from start to completion

---

## 📝 Implementation Notes

### Before Starting

1. **Analyze existing codebase:**
   - Component patterns
   - Form handling approach
   - Modal/Dialog implementation
   - API route structure
   - Database setup

2. **Clarify with stakeholder:**
   - Exact placement of dashboard button
   - Brand colors/styling to match
   - Admin interface requirements
   - Email template approval

3. **Database migration:**
   - Create use_cases table
   - Create status_history table
   - Add indexes for common queries

### Phase 1: Core Flow
- Modal with all steps
- Form validation
- Database storage
- Basic success confirmation

### Phase 2: Polish
- Pipeline stats (live from DB)
- Email notifications
- User submissions list
- Progress persistence (localStorage)

### Phase 3: Admin
- Admin review interface
- Status management
- Export functionality

---

## 📎 Reference

**Mockup:** `/mockup_test.html` - Vollständiger UI-Flow als Referenz
**Brand Guide:** `KINN_BRAND_STYLEGUIDE.md` - Farben, Fonts, Components
**Tech Stack:** Next.js, Tailwind, Resend.com, Make.com

---

*Briefing Version: 1.0*
*Erstellt: Dezember 2025*
*Für: KINN Use Case Collection Pipeline*
