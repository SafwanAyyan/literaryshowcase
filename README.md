# Literary Showcase

Production-ready Next.js (App Router) with Prisma (SQLite) and Vercel deployment.

## Requirements
- Node 18.x LTS
- npm 10+

## Environment
Create `.env` in the project root:

```
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="please-set-a-strong-secret"

# Optional AI providers
OPENAI_API_KEY=""
GEMINI_API_KEY=""
```

## Install & Dev
```
npm ci
npm run dev
```

## Database
```
npx prisma generate
npx prisma migrate dev --name init
```

Prisma Studio (optional):
```
npm run db:studio
```

## Build
```
npm run build
```

## Deploy to Vercel
1. Push to GitHub and import the repo in Vercel.
2. Project Settings → Environment Variables:
   - `DATABASE_URL = file:./prisma/dev.db`
   - `NEXTAUTH_SECRET = <your-strong-secret>`
   - `NEXTAUTH_URL = https://<your-vercel-domain>`
   - Optional: `OPENAI_API_KEY`, `GEMINI_API_KEY`
3. Build uses `npm run vercel-build` (runs `prisma generate`, `prisma db push`, `next build`).

## Metrics
Middleware samples pageviews (hourly) and visits (daily) with cookies. Admin dashboard charts daily and weekly series.

## Assets
Large assets live in `public/assets/...`.
