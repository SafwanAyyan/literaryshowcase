# CRUSH.md - Literary Showcase Agent Guide

## Essential Commands
- Dev server: `npm run dev`
- Build: `npm run build` 
- Lint: `npm run lint`
- Database setup: `npx prisma db push` then `npm run db:seed`
- Prisma Studio: `npm run db:studio`

## Code Style
- TypeScript with strict typing
- Next.js App Router conventions
- Tailwind for styling with shadcn/ui components
- Prisma for database operations
- Function components with hooks
- Named exports preferred
- PascalCase for components, camelCase for variables/functions
- Descriptive variable names
- JSDoc for complex functions
- Error handling with try/catch and user-facing messages

## Import Order
1. External libraries (react, next, etc.)
2. Third-party components/hooks
3. Project utilities/libraries
4. Relative imports (components, lib, etc.)
5. Type imports at bottom

## Testing
No existing test framework found. Use manual verification.

## Deployment
- Vercel-ready with `npm run vercel-build`
- Environment variables required: DATABASE_URL, NEXTAUTH_SECRET