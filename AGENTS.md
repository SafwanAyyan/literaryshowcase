# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains the App Router pages, nested dashboards (`admin/`) and API routes; surface state management via loaders in `lib`.
- `components/` stores client UI; reuse primitives from `components/ui/` while feature-specific shells live alongside routes.
- `lib/` holds service classes (AI, Prisma, caching) and `lib/env.ts` for typed config; edits here often pair with schema updates.
- `prisma/` stores the schema, migrations, and the SQLite dev DB (`prisma/prisma/dev.db`); rerun `npm run db:reset` after schema changes.
- `scripts/`, `hooks/`, `types/`, and `styles/` provide setup helpers, shared hooks, TypeScript contracts, and Tailwind tokens; static assets sit in `public/`.

## Build, Test, and Development Commands
- `npm run setup` copies `.env.example` interactively and seeds baseline content.
- `npm run dev` launches the Next.js server with hot reload.
- `npm run lint` runs the Next.js ESLint preset, including Tailwind and accessibility checks.
- `npm run build` regenerates the Prisma client then builds for production; this mirrors the Vercel pipeline.
- `npm run db:studio` opens Prisma Studio; `npm run db:reset` wipes and re-seeds the local database.

## Coding Style & Naming Conventions
- Write TypeScript with two-space indentation and trailing commas; rely on ESLint autofix.
- Keep files kebab-case (`content-card.tsx`), export PascalCase React components, and prefix hooks with `use`.
- Tailwind utilities belong inline in JSX; global overrides live in `styles/globals.css` and `lib/theme-tokens.ts`.
- Read config through `lib/env.ts` rather than touching `process.env` directly.

## Testing Guidelines
- Adopt Vitest plus React Testing Library; place specs beside modules as `*.test.ts(x)` or under `__tests__/`.
- Mock Prisma via the generated client and exercise service layers (`lib/unified-ai-service.ts`, `lib/database-service.ts`) end-to-end.
- Fuzz AI adapters with fixture responses to verify fallbacks and error handling before touching live providers.

## Commit & Pull Request Guidelines
- Source archive ships without Git metadata; follow Conventional Commits (`feat(admin): add moderation filter`) to keep history legible.
- Document schema or env updates in PR descriptions, attach screenshots for UI shifts, and reference Jira or Linear tickets when available.
- Run `npm run lint` plus `npm run build` before requesting review; note any skipped checks and manual QA performed.
