import { PrismaClient } from '@prisma/client'

// Prevent exhausting database connections in dev with hot reloads
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    // Prefer Prisma Accelerate URL for runtime; fall back to POSTGRES_URL
    datasources: {
      db: {
        // Resolve in this order to avoid Vercel/CLI mismatches
        // 1) PRISMA_DATABASE_URL (Accelerate / proxy)
        // 2) DATABASE_URL (standard Prisma default)
        // 3) POSTGRES_URL (legacy in this repo)
        url: process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL,
      },
    },
  })

// Debug: which env var is selected for Prisma datasource URL (no secrets printed)
const urlSource =
  process.env.PRISMA_DATABASE_URL
    ? 'PRISMA_DATABASE_URL'
    : (process.env.DATABASE_URL
        ? 'DATABASE_URL'
        : (process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'NONE'));

if (process.env.NODE_ENV !== 'production') {
  console.log('[prisma] datasource url source:', urlSource)
  globalForPrisma.prisma = prisma
}