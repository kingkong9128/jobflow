# JobFlow Deployment Guide

## Opensource (Self-Hosted)

See the main README.md for the simple self-hosted setup. The `setup.sh` script handles everything.

```bash
./setup.sh
npm run dev
```

## Hosted Solution (jobflow.app)

The hosted solution uses the same codebase but with:
- PostgreSQL (Neon) instead of SQLite
- R2/S3 for file storage
- OpenRouter for centralized AI
- Paddle for payments
- Resend for transactional emails

### Architecture

```
                    ┌─────────────────┐
                    │   Cloudflare     │
                    │   (CDN + Edge)  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐         ┌────▼────┐        ┌────▼────┐
    │  Web    │         │ Frontend │        │  API    │
    │ (Vercel)│         │ (Vercel)│        │(Railway)│
    │ Landing │         │Dashboard │        │ Express │
    └────┬────┘         └────┬────┘        └────┬────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼────────┐
                    │     Neon        │
                    │  PostgreSQL     │
                    └─────────────────┘
```

### Deployment Steps

#### 1. Prepare Environment

Create a hosted `.env` file:

```bash
# Database - Neon PostgreSQL
DATABASE_URL=postgresql://user:password@host.neon.tech/jobflow?sslmode=require

# AI - OpenRouter (aggregates OpenAI, Anthropic)
OPENROUTER_API_KEY=sk-or-...

# Job APIs (hosted has centralized keys)
JOOBLE_API_KEY=...
INDEED_API_KEY=...
ADZUNA_API_KEY=...
ADZUNA_APP_ID=...

# Storage - Cloudflare R2 (S3-compatible)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=jobflow-uploads
R2_PUBLIC_URL=https://assets.jobflow.app

# Email - Resend
RESEND_API_KEY=re_...

# Payments - Paddle (when ready)
PADDLE_VENDOR_ID=...
PADDLE_API_KEY=...
PADDLE_WEBHOOK_SECRET=...

# Auth
JWT_SECRET=generate-a-long-random-string
```

#### 2. Deploy Backend (Railway)

```bash
# Install Railway CLI
npm install -g railway

# Login
railway login

# Init project
railway init

# Add environment variables
railway variables set DATABASE_URL="..."
railway variables set OPENROUTER_API_KEY="..."

# Deploy
railway up
```

Or connect GitHub repo to Railway for automatic deployments.

#### 3. Deploy Frontend (Vercel)

```bash
cd frontend

# Add environment variables
vercel env add DATABASE_URL
vercel env add OPENROUTER_API_KEY

# Deploy
vercel --prod
```

Or connect GitHub repo to Vercel.

#### 4. Deploy Web/Landing (Vercel)

```bash
cd web

vercel --prod
```

#### 5. Custom Domain

- Vercel: Add domain in project settings
- Railway: Add domain in networking settings

### Database Migrations (Neon)

```bash
# Connect to Neon
psql "postgresql://user:password@host.neon.tech/jobflow?sslmode=require"

# Run migrations
cd backend
npx prisma migrate deploy
```

### Update Schema for PostgreSQL

The current schema uses SQLite. For PostgreSQL:

1. Generate Prisma client for PostgreSQL:
```bash
npx prisma generate
```

2. Use `pg` type instead of `text` for JSON fields if needed.

### Monitoring

- **Railway**: `railway logs` for backend logs
- **Vercel**: Dashboard for frontend/web logs
- **Neon**: Dashboard for database insights

### Cron Job for Job Alerts

Set up a cron to trigger `/api/alerts/check-all`:

```bash
# Every hour
0 * * * * curl -X POST https://api.jobflow.app/api/alerts/check-all
```

Use Railway's cron triggers or an external service like EasyCron.

## Docker Production Deploy

For a single-server production deploy:

```bash
# Build
docker-compose -f docker-compose.prod.yml build

# Run
docker-compose -f docker-compose.prod.yml up -d
```

See `docker-compose.yml` in the repo for the production config.

## Environment Checklist

Before going live, ensure:

- [ ] `DATABASE_URL` points to production PostgreSQL
- [ ] `JWT_SECRET` is a strong random string
- [ ] All API keys are production keys
- [ ] `FRONTEND_URL` points to production frontend
- [ ] SMTP/RESEND configured for job alerts
- [ ] R2/S3 bucket created and accessible
- [ ] Custom domain configured and SSL enabled