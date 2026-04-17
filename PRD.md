# JobFlow — Opensource Job Search & Application Prep

**Version:** 1.0  
**Date:** April 17, 2026  
**Status:** BUILD COMPLETE (all 7 slices implemented)  

---

## Overview

JobFlow is a standalone, opensource job search and application preparation tool. Users upload their CV first, then discover jobs across multiple aggregators, customize their application materials with AI, and track their job search — all manual apply (no automated submissions).

**Opensource model:** Anyone can deploy with their own API keys (OpenRouter, job APIs). Optional managed service with paid keys.

**Application approach:** Auto-fill with user review (safe). True auto-submit on company career pages only (opt-in per job, user reviews first). Never auto-submit to LinkedIn/Indeed/Glassdoor — ban risk isn't worth it.

---

## Tech Stack

### Two Deployment Models

#### Opensource (Self-Host)
Users deploy with their own infrastructure. Designed for easy setup.

| Layer | Technology | Reason |
|-------|------------|--------|
| Frontend | Next.js | SSR, easy deploy |
| Backend | Express | Job aggregation, AI calls |
| Database | **SQLite** (file-based) | Zero setup, single file, easy backup |
| AI | User-provided keys | OpenAI, Claude, MiniMax |
| Job Sources | User-provided keys | Jooble, Indeed, Adzuna |
| Storage | Local filesystem | No external dependency |
| Deployment | Docker Compose | One command setup |

#### Hosted (Managed Service)
Production deployment at jobflow.app with multi-tenant architecture.

| Layer | Technology | Reason |
|-------|------------|--------|
| Frontend | Next.js (Vercel) | SSR, edge deployment |
| Backend | Express (Railway) | Reliable compute |
| Database | **Neon PostgreSQL** | Serverless, multi-tenant |
| AI | Centralized keys | OpenRouter (aggregator) |
| Job Sources | Centralized keys | Jooble, Indeed, Adzuna |
| Storage | R2 (Cloudflare) | S3-compatible, free tier |
| Payments | Paddle | Subscription billing |
| Email | Resend | Transactional emails |

### AI Provider Support

Supports multiple AI providers (user selects in opensource, default in hosted):

| Provider | Models | Opensource | Hosted |
|----------|--------|------------|--------|
| OpenAI | GPT-4o, GPT-4o-mini | ✅ | ✅ (via OpenRouter) |
| Anthropic | Claude 3.5 Sonnet, 3.5 Haiku | ✅ | ✅ (via OpenRouter) |
| MiniMax | MiniMax-Text-01 | ✅ | ✅ (direct) |

**Environment variables (opensource):**
```bash
# AI - user picks one or multiple
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
MINIMAX_API_KEY=...
OPENROUTER_API_KEY=sk-or-...  # optional, fallback

# Job APIs
JOOBLE_API_KEY=...
INDEED_API_KEY=...
ADZUNA_API_KEY=...
ADZUNA_APP_ID=...

# Storage (optional, defaults to local filesystem)
STORAGE_TYPE=local  # or 's3'
S3_ENDPOINT=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=...
```

---

## Core Features

### 1. CV Upload & Management

**Input flow (CV first):**
1. User uploads PDF or DOCX
2. System extracts text (pdf.js client-side)
3. AI parses into structured JSON (name, email, experience, education, skills)
4. User reviews/edits parsed data
5. Stored as "Base CV"

**Sources:**
| Source | Data Extracted |
|--------|---------------|
| Upload PDF/DOCX | Parse via pdf.js + AI |
| Paste text | Direct AI parsing |
| Manual entry | Structured form fallback |

**Storage:**
- Raw file → S3/R2
- Parsed data → Neon PostgreSQL JSON field
- Generated CVs/Cover letters → S3/R2

### 2. Job Discovery

**Primary Sources (free APIs):**
| Source | API | Coverage |
|--------|-----|----------|
| Jooble | REST API | Global, good aggregation |
| Indeed | Publisher API (RapidAPI) | Global, large inventory |
| Adzuna | API | US, UK, EU |

**Fallback:** RSS feeds for niche sources

**Search Parameters:**
- Job title / keywords
- Location (city, country, remote)
- Remote/hybrid/onsite filter
- Salary range
- Experience level (entry, mid, senior)
- Date posted (24h, 7d, 30d)

**Features:**
- Save jobs to "Interested" list
- Job detail view with full description
- Apply URL (opens in new tab — manual apply)

### 3. Auto-Fill Applications (Core Feature)

**Browser Extension (Chrome/Edge/Firefox):**
- Detects job application forms on career pages
- Auto-fills form fields from user's stored CV data
- User reviews all fields before submission
- Works on any site — company career pages, LinkedIn Easy Apply, etc.

**Auto-Fill Flow:**
```
1. User visits job application page
2. Clicks "Fill with JobFlow" extension icon
3. Extension detects form fields (name, email, phone, experience, etc.)
4. Populates fields from user's parsed CV
5. User reviews every field, edits if needed
6. User clicks submit (manual — we don't auto-submit)
```

**Company Career Pages (True Auto-Submit — Optional):**
- User enables "Auto-submit to company sites" in settings
- System detects if it's a company career page (not LinkedIn/Indeed/Glassdoor)
- Pre-fills form, user reviews, then system submits after 5-second review window
- User gets notification after submission
- User can always disable auto-submit per-job

**Supported Form Fields:**
| Field | Source |
|-------|--------|
| First/Last name | CV parsed data |
| Email | CV parsed data |
| Phone | CV parsed data |
| Address/Location | CV parsed data |
| Current company | CV experience |
| Job title | CV experience |
| Resume/CV upload | Generated customized CV |
| Cover letter | Generated cover letter |
| LinkedIn URL | CV profile |
| Portfolio/Website | CV parsed data |
| Custom questions | Mapped from CV where possible |

### 4. Application Preparation

**For each job, generate:**

| Output | Input | Description |
|--------|-------|-------------|
| Customized CV | Base CV + Job Description | Keywords matched, experience reordered |
| Cover Letter | Base CV + Job Description + Company | 250-400 words, tailored |
| Match Score | Base CV + Job Description | % alignment (like Fitly's Response Chance) |

**AI Customization Flow:**
```
1. User selects saved job
2. User clicks "Tailor for this job"
3. System uses Base CV + Job Description
4. AI generates:
   - Matched CV (keywords highlighted)
   - Cover letter (company-specific)
   - Match score (0-100%)
5. User downloads/edits
6. User applies (or uses auto-fill browser extension)

### 5. Application Tracker

### 5. Application Tracker

**Kanban Board:**
- Saved → Applied → In Review → Interview → Offer → Rejected → Accepted

**Per application:**
- Job details
- CV used (customized version)
- Cover letter used
- Status (manual update, or auto-updated if auto-submit used)
- Applied date
- Notes
- Interview dates (calendar integration later)
- Auto-submit indicator (if used)

**Analytics:**
- Applications sent
- Response rate
- Time in each stage

### 6. Job Alerts

- Save search criteria
- Email digest (daily/weekly)
- Frequency configurable
- Pause/resume alerts

---

## Data Model

### Opensource (SQLite)
Single-file database, zero configuration. Schema is simplified.

```sql
-- Users (simple auth)
CREATE TABLE users (
  id TEXT PRIMARY KEY,  -- UUID stored as text
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Base CVs
CREATE TABLE base_cvs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_path TEXT,  -- local filesystem path
  parsed_data TEXT NOT NULL,  -- JSON stored as text (SQLite has no JSONB)
  original_filename TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Saved Jobs
CREATE TABLE saved_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  remote INTEGER DEFAULT 0,  -- SQLite: 0/1 instead of BOOLEAN
  salary_min INTEGER,
  salary_max INTEGER,
  description TEXT,
  url TEXT,
  posted_at DATETIME,
  saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, source, source_id)
);

-- Job Alerts
CREATE TABLE job_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  criteria TEXT NOT NULL,  -- JSON stored as text
  frequency TEXT DEFAULT 'daily',
  active INTEGER DEFAULT 1,
  last_sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Applications
CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT,
  base_cv_id TEXT,
  customized_cv_path TEXT,
  cover_letter_path TEXT,
  status TEXT DEFAULT 'applied',
  applied_at DATETIME,
  applied_via TEXT DEFAULT 'manual',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES saved_jobs(id) ON DELETE SET NULL,
  FOREIGN KEY (base_cv_id) REFERENCES base_cvs(id)
);

-- Apply Settings
CREATE TABLE apply_settings (
  user_id TEXT PRIMARY KEY,
  auto_submit_enabled INTEGER DEFAULT 0,
  auto_submit_companies INTEGER DEFAULT 1,
  review_window_seconds INTEGER DEFAULT 5,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Customized CVs
CREATE TABLE cv_customizations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  base_cv_id TEXT,
  job_id TEXT,
  customized_data TEXT NOT NULL,  -- JSON stored as text
  match_score INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Hosted (PostgreSQL/Neon)
Multi-tenant schema with row-level security.

```sql
-- Same schema as above but with:
-- - UUID PRIMARY KEY (instead of TEXT)
-- - JSONB (instead of TEXT for JSON storage)
-- - Additional tenant_id for row-level security

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Schema notes:**
- Opensource and hosted share same application logic
- Database layer abstracts differences (Prisma handles both SQLite and PostgreSQL)
- Migrations run differently (file-based for SQLite, versioned for PostgreSQL)

---

## API Design

### Backend Routes (Express)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/cv                    -- Get user's base CV
POST   /api/cv/upload             -- Upload + parse CV
PUT    /api/cv/:id                -- Update parsed CV data
GET    /api/cv/fill-data           -- Get data for browser extension auto-fill

GET    /api/jobs/search            -- Search jobs (Jooble, Indeed, Adzuna)
POST   /api/jobs/save             -- Save job to list
GET    /api/jobs/saved            -- Get saved jobs
DELETE /api/jobs/saved/:id        -- Remove saved job

POST   /api/ai/tailor             -- Generate customized CV
POST   /api/ai/cover-letter       -- Generate cover letter
GET    /api/ai/match-score        -- Calculate match score

POST   /api/applications          -- Create application
GET    /api/applications          -- List applications (filter by status)
PATCH  /api/applications/:id      -- Update status/notes

GET    /api/alerts                -- List alerts
POST   /api/alerts                -- Create alert
PATCH  /api/alerts/:id            -- Update alert
DELETE /api/alerts/:id            -- Delete alert

POST   /api/export/pdf            -- Generate PDF
POST   /api/export/docx           -- Generate DOCX

GET    /api/apply/settings        -- Get user's apply settings
PUT    /api/apply/settings         -- Update auto-submit settings
POST   /api/apply/track-submit     -- Track auto-submit event
```

### Job Aggregation Logic

```javascript
// Pseudocode for job search
async function searchJobs(query, location, remote, sources = ['jooble', 'indeed', 'adzuna']) {
  const results = [];
  
  if (sources.includes('jooble')) {
    const joobleJobs = await fetchJooble(query, location, remote);
    results.push(...joobleJobs);
  }
  
  if (sources.includes('indeed')) {
    const indeedJobs = await fetchIndeed(query, location, remote);
    results.push(...indeedJobs);
  }
  
  if (sources.includes('adzuna')) {
    const adzunaJobs = await fetchAdzuna(query, location, remote);
    results.push(...adzunaJobs);
  }
  
  // Deduplicate by source_id
  return deduplicateBySourceId(results);
}
```

---

## Implementation: Vertical Slice Approach

Build one working end-to-end flow at a time. Each slice delivers value independently.

### Slice 1: CV Upload + Basic Job Search (Week 1-2)

**Goal:** User can upload CV and search jobs (no AI customization yet)

**Components:**
1. Auth (email/password)
2. CV upload + parse (file → text → AI structured JSON)
3. Job search (Jooble API only for MVP)
4. Save jobs to list
5. View saved jobs

**Deliverable:** User uploads CV, searches jobs, saves interesting ones.

**API Endpoints:**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/cv/upload`
- `GET /api/cv`
- `GET /api/jobs/search` (Jooble only)
- `POST /api/jobs/save`
- `GET /api/jobs/saved`

---

### Slice 2: AI Customization + Export (Week 2-3)

**Goal:** User can tailor CV and generate cover letter for saved jobs

**Components:**
1. CV tailoring (match keywords to job description)
2. Cover letter generation
3. Match score calculation
4. PDF export
5. DOCX export

**Deliverable:** User selects saved job, gets AI-customized CV + cover letter, downloads as PDF.

**API Endpoints:**
- `POST /api/ai/tailor`
- `POST /api/ai/cover-letter`
- `GET /api/ai/match-score`
- `POST /api/export/pdf`
- `POST /api/export/docx`

---

### Slice 3: Application Tracker (Week 3-4)

**Goal:** User can track applications through stages

**Components:**
1. Create application from saved job
2. Kanban board view
3. Status updates
4. Notes per application
5. Basic analytics (applications sent, response rate)

**Deliverable:** User tracks full application pipeline from saved job to offer/rejection.

**API Endpoints:**
- `POST /api/applications`
- `GET /api/applications`
- `PATCH /api/applications/:id`

---

### Slice 4: Multi-Source Aggregation (Week 4-5)

**Goal:** Aggregate from Indeed + Adzuna in addition to Jooble

**Components:**
1. Indeed API integration (RapidAPI)
2. Adzuna API integration
3. Deduplication across sources
4. Unified response format
5. Better search parameters

**Deliverable:** Broader job coverage, better results for users.

---

### Slice 5: Browser Extension — Auto-Fill (Week 5-6)

**Goal:** User can auto-fill job application forms on any site

**Components:**
1. Chrome/Edge/Firefox extension (manifest v3)
2. Form detection (reads DOM for input fields)
3. Field mapping (CV data → form fields)
4. Auto-fill with user review (user confirms before populate)
5. Manual submit trigger (user clicks submit)
6. Settings: enable/disable per site

**Deliverable:** User installs extension, visits job application page, clicks extension icon, fields auto-fill from CV data, user reviews and clicks submit.

**Tech:**
- Extension: Vanilla JS + Manifest v3
- Form detection: DOM queries, common field name matching
- CV data sync: Extension calls `/api/cv/fill-data` authenticated endpoint

**API Endpoints:**
- `GET /api/cv/fill-data` — returns user's CV data for extension

**Blocked Sites (never auto-fill/submit):**
- LinkedIn, Indeed, Glassdoor, ZipRecruiter
- Any site using strict bot detection

---

### Slice 6: Job Alerts (Week 6-7)

**Goal:** User gets notified of new matching jobs

**Components:**
1. Create job alert from search criteria
2. Email digest (daily/weekly)
3. Alert management (pause/resume/delete)
4. Alert matching logic (background worker)

**Deliverable:** User sets up alerts, receives email with new matching jobs.

**API Endpoints:**
- `POST /api/alerts`
- `GET /api/alerts`
- `PATCH /api/alerts/:id`
- `DELETE /api/alerts/:id`

---

### Slice 7: Polish & Opensource Prep (Week 7-8)

**Goal:** Clean up UX, prepare for opensource release

**Components:**
1. Additional CV templates (2-3 more)
2. Better error handling and edge cases
3. Rate limiting and caching layer
4. Documentation (README, deployment guide, contribution guide)
5. Docker compose for one-command setup
6. Clean up code structure for contributors
7. Landing page (for hosted service)

**Deliverable:** Deployable opensource project + hosted landing page.

---

## Opensource Model

### Design Philosophy

1. **Zero-config default** — User clones, sets API keys, runs. Works out of the box.
2. **Own your data** — All data stored locally (SQLite, local filesystem). No external dependencies.
3. **Bring your own keys** — Users provide their own API keys (AI, job aggregators). No centralized key management needed for opensource.
4. **Easy upgrade** — Schema designed so hosted version can use same codebase with different configuration.

```
jobflow/
├── frontend/              # Next.js app
│   ├── app/
│   │   ├── (auth)/       # login, register
│   │   ├── (dashboard)/  # main app
│   │   │   ├── jobs/
│   │   │   ├── cv/
│   │   │   ├── applications/
│   │   │   └── alerts/
│   │   └── api/          # internal API routes (optional)
│   ├── components/
│   └── lib/
├── backend/              # Express API
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── index.js
├── extension/            # Browser extension (Chrome/FF/Edge)
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   └── popup/
├── prisma/
│   ├── schema.sqlite     # Opensource schema
│   └── schema.postgres   # Hosted schema (Neon)
├── docker-compose.yml
├── .env.example
└── README.md
```

### Hosted Service Structure (jobflow.app)

```
jobflow/
├── web/                  # Landing page (Next.js)
│   ├── app/
│   │   ├── page.tsx      # Landing
│   │   ├── pricing/
│   │   ├── docs/
│   │   └── blog/
│   └── components/
├── app/                  # Main application
│   ├── frontend/         # Next.js dashboard
│   ├── backend/          # Express API
│   ├── extension/        # Browser extension
│   ├── jobs/             # Background job workers
│   └── workers/          # Alert email workers
├── shared/               # Shared types, schemas
├── infra/                # Terraform/pipeline configs
└── docs/                 # Deployment docs
```

**Key difference:** Opensource is a single repo. Hosted splits landing (marketing) from application.

### Deployment Options

**Self-host (opensource):**
1. Clone repo
2. Set environment variables (API keys)
3. `docker-compose up`
4. Works with user's own OpenRouter, Jooble, Indeed, Adzuna keys

**Managed service (optional paid):**
- Pre-configured keys
- Paddle billing
- Priority support
- Hosted at jobflow.app (future)

### Environment Variables

#### Opensource (Self-Host)

```bash
# Database - SQLite file path
DATABASE_URL=file:./jobflow.db

# Server
PORT=3001
FRONTEND_URL=http://localhost:3000

# AI Providers (user provides their own)
OPENAI_API_KEY=sk-...           # OpenAI GPT-4o
ANTHROPIC_API_KEY=sk-ant-...    # Claude 3.5 Sonnet
MINIMAX_API_KEY=...             # MiniMax
OPENROUTER_API_KEY=sk-or-...    # Optional fallback

# Job APIs (user provides their own)
JOOBLE_API_KEY=...
INDEED_API_KEY=...              # RapidAPI key
ADZUNA_API_KEY=...
ADZUNA_APP_ID=...

# Auth
JWT_SECRET=your-secret-here

# Storage (optional - defaults to local filesystem)
STORAGE_TYPE=local  # or 's3'
# If S3:
S3_ENDPOINT=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=...

# Email (for job alerts - optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=noreply@example.com
```

#### Hosted Service (jobflow.app)

```bash
# Database - Neon PostgreSQL
DATABASE_URL=postgresql://user:pass@host/db

# AI - centralized (OpenRouter)
OPENROUTER_API_KEY=sk-or-...

# Job APIs - centralized
JOOBLE_API_KEY=...
INDEED_API_KEY=...
ADZUNA_API_KEY=...
ADZUNA_APP_ID=...

# Storage - R2
S3_ENDPOINT=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=...

# Email - Resend
RESEND_API_KEY=re_...

# Payments - Paddle
PADDLE_VENDOR_ID=...
PADDLE_API_KEY=...
PADDLE_WEBHOOK_SECRET=...

# Multi-tenant
TENANT_MODE=hosted
```

---

## Pricing (Managed Service — Future)

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Unlimited job search, 5 tailored CVs/mo, basic templates |
| Pro | $15/mo | Unlimited tailoring, all templates, job alerts, priority support |
| Pro+ | $29/mo | Everything + bulk export, analytics, API access |

**Opensource stays free** — deploy with own keys, no restrictions.

---

## User Flow

```
Landing Page
    ↓
Sign Up (email/password or continue with Google)
    ↓
Onboarding: Upload CV (or paste text)
    ↓
CV Processing: AI parses → User reviews/edits
    ↓
Dashboard (Jobs tab active)
    ↓
Search Jobs → View Results → Save Interesting
    ↓
Select Saved Job → "Tailor for this job"
    ↓
AI generates: Matched CV + Cover Letter + Match Score
    ↓
Download PDF/DOCX → Apply manually
    ↓
Track in Applications Kanban
    ↓
Set up Job Alerts (optional)
```

---

## Tech Stack Details

### Frontend (Next.js)
- App Router with RSC
- Server actions for mutations
- TanStack Query for client state
- Tailwind CSS for styling
- React Hook Form for forms
- Zustand for client state (kanban, etc)

### Backend (Express)
- REST API
- Rate limiting (express-rate-limit)
- CORS configured for Vercel frontend
- File upload handling (multer to S3)

### AI Integration (Multi-Provider)

The system routes AI requests to the provider of user's choice. User configures their preferred provider in settings (opensource) or it's pre-configured (hosted).

```javascript
// AI Service Abstraction Layer
class AIService {
  constructor() {
    this.providers = {
      openai: new OpenAIProvider(process.env.OPENAI_API_KEY),
      anthropic: new AnthropicProvider(process.env.ANTHROPIC_API_KEY),
      minimax: new MiniMaxProvider(process.env.MINIMAX_API_KEY),
      openrouter: new OpenRouterProvider(process.env.OPENROUTER_API_KEY),
    };
  }

  async generate(prompt, model) {
    const provider = this.getProviderForModel(model);
    return provider.complete(prompt);
  }

  async tailorCV(cvText, jobDescription, model = 'claude-3-sonnet') {
    const provider = this.getProviderForModel(model);
    return provider.complete(`You are a professional resume writer. 
    Given this resume and job description, create a tailored CV that:
    1. Highlights relevant experience matching job requirements
    2. Includes keywords from the job description
    3. Reorders experience to prioritize most relevant roles
    
    Resume: ${cvText}
    
    Job Description: ${jobDescription}
    
    Return the tailored CV in the same format.`);  }
}
```

**Model routing:**
| User Model Preference | Provider Used |
|----------------------|---------------|
| gpt-4o, gpt-4o-mini | OpenAI (direct) |
| claude-3-sonnet, claude-3-5-haiku | Anthropic (direct) |
| minimax-text-01 | MiniMax (direct) |
| Any model via OpenRouter | OpenRouter (aggregator) |

**Opensource:** User configures their own API keys. All providers available.
**Hosted:** Centralized OpenRouter key (supports all models via single endpoint). MiniMax available directly.

### CV Parsing
```javascript
// Client-side: Extract text from PDF
import { getDocument } from 'pdfjs-dist';
const text = await extractTextFromPDF(file);

// Send to AI for structured parsing
const parsed = await ai.extractStructuedData(text);

// Store in database (SQLite for opensource, PostgreSQL for hosted)
await db.base_cvs.create({ data: { user_id, parsed_data: parsed } });
```

### File Storage

| Deployment | Storage | Notes |
|------------|---------|-------|
| Opensource | Local filesystem (`./uploads`) | Default, zero config |
| Opensource (optional) | S3-compatible | User provides R2/S3 credentials |
| Hosted | R2 (Cloudflare) | S3-compatible API |

### File Export
- PDF: `@react-pdf/renderer` or `pdf-lib`
- DOCX: `docx` library
- Files stored in configured storage, paths saved to database

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| CV parsing fails | Fall back to manual entry form |
| Job API down | Show cached results + error message |
| AI generation fails | Show error, allow retry |
| Invalid file type | Client-side validation before upload |
| Rate limit hit | Queue requests, show user-friendly message |

---

## Security Considerations

- Password hashing (bcrypt)
- JWT tokens (httpOnly cookies)
- Rate limiting on auth endpoints
- Input sanitization
- File upload validation (type, size)
- User data isolation (row-level security in queries)

---

## Success Metrics

| Metric | Target |
|--------|--------|
| CV upload completion | > 70% of signups |
| Job search usage | > 50% of CV-uploaders |
| Tailored CV generation | > 3 per user/month avg |
| Application tracking | > 30% of users track |
| Job alerts setup | > 20% of active users |

---

## Timeline

| Week | Slice | Deliverable |
|------|-------|-------------|
| 1-2 | Slice 1 | Auth + CV upload + Jooble search |
| 2-3 | Slice 2 | AI tailoring + PDF/DOCX export |
| 3-4 | Slice 3 | Application tracker (Kanban) |
| 4-5 | Slice 4 | Multi-source aggregation (Indeed + Adzuna) |
| 5-6 | Slice 5 | Browser extension (auto-fill) |
| 6-7 | Slice 6 | Job alerts (email digest) |
| 7-8 | Slice 7 | Polish + Opensource release + Landing page |

**Total: 8 weeks to opensource MVP**

---

## Open Questions

| Question | Decision Needed |
|----------|-----------------|
| **Prisma vs raw SQL?** | Prisma (type-safe, works with SQLite + PostgreSQL) |
| **Email provider for alerts?** | Resend (easy integration, good free tier) |
| **Database migrations?** | Prisma migrations (works for both SQLite and PostgreSQL) |
| **Self-host update mechanism?** | Git pull + migrate command (manual, simple) |
| **Landing page tech?** | Next.js (same repo, keeps it simple) |