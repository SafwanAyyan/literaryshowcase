# 📚 Literary Showcase

Modern, production-ready literary platform built with Next.js App Router, Prisma, Tailwind, and Vercel – featuring AI analysis, OCR, rich browsing, and an admin suite.

## Requirements
- Node 18.x LTS
- npm 10+

## Environment
Create `.env` in the project root (PostgreSQL for production on Vercel is recommended). An example is provided in `.env.example`:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="please-set-a-strong-secret"

# Optional AI providers
OPENAI_API_KEY=""
GEMINI_API_KEY=""
DEEPSEEK_API_KEY=""

# OCR.space
OCR_SPACE_API_KEY=""
OCR_SPACE_ENDPOINT="https://api.ocr.space/parse/image"
```

## Install & Dev
```
npm ci
npm run dev
```

## Database
```
npx prisma generate
npx prisma db push
```

If you are deploying fresh to Vercel, Prisma migrations will be applied during the build via `prisma migrate deploy`.

Prisma Studio (optional):
```
npm run db:studio
```

## Build
```
npm run build
```
If you need to create initial migration files locally:
```
npx prisma migrate dev --name init
```

## Deploy to Vercel
1. Push to GitHub and import the repo in Vercel.
2. Project Settings → Environment Variables:
   - `DATABASE_URL = <your Postgres connection string>`
    - `NEXTAUTH_SECRET = <your-strong-secret>` (must be set for auth and signed cookies)
   - `NEXTAUTH_URL = https://<your-vercel-domain>`
   - Optional: `OPENAI_API_KEY`, `GEMINI_API_KEY`
3. Build uses `npm run vercel-build` (runs `prisma generate`, `prisma db push`, `next build`).
4. On Vercel, ensure the project is on the Node.js runtime (not Edge) for API routes that use Prisma. This repo already sets Node runtime via route exports.
5. If you see a provider mismatch error (sqlite vs postgresql), deploy with `db push` first (this repo does that) or reset your local migrations and re-create them.
6. If you do not yet have a production database provisioned, the metrics ingest endpoint will safely no-op to avoid errors. Set `DATABASE_URL` later to enable metrics persistence.

## ✨ Features
- 🔎 Public browsing & search (debounced input, filters, sorting, paging)
- 🧠 AI: analyze themes/metaphors/devices, explain Q&A, generate content
- 🖼️ OCR: OCR.space primary (form-encoded), Gemini fallback, rate limits
- 🧰 Admin: content manager, bulk import, submissions, settings, export
- 🎭 Authors & Guides: Shakespeare/Dostoevsky with streaming media, PDF viewer
- 🛡️ Maintenance mode, JWT role checks, allow-listed bypass
- 📈 Metrics: middleware sampling + admin charts
- 🚀 Vercel-ready: per-route Node runtime for Prisma/fs; Speed Insights (prod)

## Metrics
Middleware samples pageviews (hourly) and visits (daily) with cookies. Admin dashboard charts daily and weekly series.

## Assets
Large assets live in `public/assets/...`.

Note: Large file streaming routes under `app/authors/...` explicitly use the Node.js runtime and `force-dynamic` to avoid edge incompatibilities and CDN caching of large payloads.

## ☁️ Deploying to Vercel (Detailed)
1) Import repo into Vercel
2) Set Environment Variables
   - Required: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
   - Optional: `OCR_SPACE_API_KEY`, `OCR_SPACE_ENDPOINT`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
3) Build command (via `vercel.json`): `npm run vercel-build`
4) Runtime: Node ensured per API route via `export const runtime = 'nodejs'`
5) Troubleshooting
   - Prisma provider mismatch: default build uses `db push`; or re-create migrations for Postgres
   - Missing DB: metrics ingest returns success+skipped (no-op) until configured

## 🔌 Selected API Endpoints
- `GET /api/content/public` – list with filters: `category, author, q, orderBy, page, limit`
- `GET /api/content/public/authors` – distinct authors
- `GET /api/content/public/random` – one random item
- `POST /api/content/[id]/view` – view counter
- `POST /api/content/[id]/like` – toggle like
- `POST /api/ai/analyze` – deep analysis
- `POST /api/ai/explain` – Q&A
- `POST /api/ai/generate` – generate items (admin)
- `POST /api/ai/image-to-text` – OCR (admin)
- `GET/POST /api/admin/settings` – settings
- `GET /api/admin/stats`, `GET /api/admin/performance-metrics` – stats & runtime
- `POST /api/admin/metrics/ingest` – visit/pageview sample
- `GET /api/admin/export` – export data
- `POST /api/admin/toggle-maintenance` – maintenance

## 🔒 Security & Performance
- Likes/Views: signed cookies (HMAC with `NEXTAUTH_SECRET`) + cooldowns
- OCR: strict file checks, timeouts, rate limiting
- Admin routes: session role checks (NextAuth)
- Middleware: guard metrics and maintenance flow; no-op if DB unreachable
- Speed Insights: loaded client-side in production only

## 🤝 Contributing
PRs welcome. Keep changes focused, typed, and aligned with current formatting.

## 📄 License
MIT (if included). Third-party assets remain property of their owners.
