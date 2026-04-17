# JobFlow

**Opensource job search and application preparation tool.**

JobFlow helps you discover jobs across multiple aggregators, customize your CV with AI, and track your applications — all with manual apply (no automated submissions to LinkedIn/Indeed/Glassdoor).

## Features

- **CV Upload & Parsing** — Upload PDF/DOCX, AI extracts structured data
- **Job Search** — Jooble, Indeed, Adzuna APIs with smart deduplication
- **AI Customization** — Tailor CV and generate cover letters for any job
- **4 CV Templates** — Modern, Classic, Creative, Minimal
- **Application Tracker** — Kanban board with drag-and-drop + Analytics dashboard
- **Job Alerts** — Daily/weekly email digests with matching jobs
- **Browser Extension** — Auto-fill job application forms on company career pages

## Quick Start

### Setup (one time)
```bash
./setup.sh
```

### Start (one command)
```bash
npm run dev
```

This starts both backend (port 3001) and frontend (port 3000).

For all services (backend + frontend + landing page):
```bash
npm run dev:all
```

### Manual Setup

**1. Install dependencies:**
```bash
npm install
cd backend && npm install && cd ../frontend && npm install && cd ../web && npm install
```

**2. Copy and edit environment:**
```bash
cp .env.example .env
# Edit .env - add at least one AI provider key
```

**3. Setup database:**
```bash
cd backend && npx prisma db push
```

**4. Start services:**
```bash
# Backend + Frontend
npm run dev

# Or individually:
npm run dev:backend  # http://localhost:3001
npm run dev:frontend # http://localhost:3000
```

### Browser Extension

```bash
# Load as unpacked extension in Chrome:
1. Go to chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the extension/ folder
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite: `file:./jobflow.db` |
| `JWT_SECRET` | Yes | Secret for JWT tokens |
| `OPENAI_API_KEY` | One required | OpenAI GPT-4 |
| `ANTHROPIC_API_KEY` | One required | Claude 3.5 Sonnet |
| `MINIMAX_API_KEY` | One required | MiniMax |
| `OPENROUTER_API_KEY` | Optional | Fallback aggregator |
| `JOOBLE_API_KEY` | Optional | Jooble job search |
| `INDEED_API_KEY` | Optional | Indeed via RapidAPI |
| `ADZUNA_API_KEY` | Optional | Adzuna job search |
| `ADZUNA_APP_ID` | Optional | Adzuna app ID |
| `SMTP_HOST` | Optional | For job alert emails |
| `SMTP_USER` | Optional | SMTP username |
| `SMTP_PASS` | Optional | SMTP password |
| `EMAIL_FROM` | Optional | From address for emails |

## Architecture

```
┌─────────────────────────────────────────────┐
│  Next.js Frontend (Port 3000)              │
│  - Dashboard                               │
│  - CV management                            │
│  - Job search UI                           │
│  - Application tracker                      │
└────────────────┬────────────────────────────┘
                 │ REST API
┌────────────────▼────────────────────────────┐
│  Express Backend (Port 3001)               │
│  - Auth (JWT)                               │
│  - Job aggregation (Jooble, Indeed, Adzuna)│
│  - AI services (OpenAI, Anthropic, MiniMax) │
│  - Application tracking                      │
│  - Job alerts (SMTP)                        │
└────────────────┬────────────────────────────┘
                 │
     ┌──────────▼───────────┐
     │  SQLite Database      │
     │  (file-based)          │
     └────────────────────────┘

┌─────────────────────────────────────────────┐
│  Browser Extension                         │
│  - Form detection (content.js)             │
│  - Popup UI (popup/)                       │
│  - Background service worker               │
└─────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS, Zustand
- **Backend:** Express, TypeScript, Prisma ORM
- **Database:** SQLite (opensource), PostgreSQL (hosted)
- **AI:** OpenAI, Anthropic, MiniMax, OpenRouter
- **Job Sources:** Jooble, Indeed, Adzuna APIs
- **Browser Extension:** Vanilla JS, Manifest V3

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user

### CV
- `POST /api/cv/upload` — Upload + parse CV (PDF/DOCX)
- `GET /api/cv` — List user's CVs
- `GET /api/cv/:id` — Get specific CV
- `PUT /api/cv/:id` — Update parsed CV data
- `GET /api/cv/fill-data` — Get CV data for browser extension

### Jobs
- `GET /api/jobs/search` — Search jobs (query: keywords, location, remote, sources)
- `POST /api/jobs/save` — Save job to list
- `GET /api/jobs/saved` — Get saved jobs
- `DELETE /api/jobs/saved/:id` — Remove saved job

### AI
- `POST /api/ai/tailor` — Generate customized CV
- `POST /api/ai/cover-letter` — Generate cover letter
- `GET /api/ai/match-score` — Calculate CV-job match percentage

### Applications
- `POST /api/applications` — Create application
- `GET /api/applications` — List applications
- `PATCH /api/applications/:id` — Update status/notes
- `GET /api/applications/stats` — Get application analytics

### Alerts
- `GET /api/alerts` — List job alerts
- `POST /api/alerts` — Create alert
- `PATCH /api/alerts/:id` — Update alert
- `DELETE /api/alerts/:id` — Delete alert
- `POST /api/alerts/:id/test` — Preview matching jobs

### Export
- `POST /api/export/docx` — Generate DOCX (body: cvData, template?)
- `POST /api/export/pdf` — Generate HTML for printing

## Opensource vs Hosted

| Feature | Opensource | Hosted |
|---------|------------|--------|
| Database | SQLite (file) | PostgreSQL (Neon) |
| Storage | Local filesystem | S3/R2 |
| AI Keys | Bring your own | Provided |
| Job APIs | Bring your own | Provided |
| Job Alerts | SMTP setup | Built-in |
| Payments | N/A | Paddle |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT