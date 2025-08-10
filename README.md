# Literary Showcase

Production-ready Next.js (App Router) with Prisma (PostgreSQL for production) and Vercel deployment.

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
```

## Install & Dev
```
npm ci
npm run dev
```

## Database
```
npx prisma generate
npx prisma migrate dev
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

## Metrics
Middleware samples pageviews (hourly) and visits (daily) with cookies. Admin dashboard charts daily and weekly series.

## Assets
Large assets live in `public/assets/...`.

Note: Large file streaming routes under `app/authors/...` explicitly use the Node.js runtime and `force-dynamic` to avoid edge incompatibilities and CDN caching of large payloads.
