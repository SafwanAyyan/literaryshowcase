import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/admin/metrics/ingest { date: 'YYYY-MM-DD', type: 'pageview' | 'visit' }
// This is intentionally unauthenticated but should be throttled/behind CDN in production.
export async function POST(request: NextRequest) {
  try {
    const { date, type } = await request.json()
    if (!date || typeof date !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid date' }, { status: 400 })
    }
    const visitsDelta = type === 'visit' ? 1 : 0
    const viewsDelta = type === 'pageview' ? 1 : 0
    // Prefer Prisma client if available (after generate); otherwise fallback to raw SQL (SQLite)
    const client: any = prisma as any
    // Ensure table exists (guards against missing migration in fresh envs)
    try {
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "DailyMetric" (
        "date" TEXT PRIMARY KEY NOT NULL,
        "visits" INTEGER NOT NULL DEFAULT 0,
        "pageviews" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );`
    } catch {}
    if (client.dailyMetric?.upsert) {
      await client.dailyMetric.upsert({
        where: { date },
        update: { visits: { increment: visitsDelta }, pageviews: { increment: viewsDelta } },
        create: { date, visits: visitsDelta, pageviews: viewsDelta },
      })
    } else {
      await prisma.$executeRaw`INSERT INTO "DailyMetric" ("date", "visits", "pageviews", "createdAt", "updatedAt")
        VALUES (${date}, ${visitsDelta}, ${viewsDelta}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT("date") DO UPDATE SET
          "visits" = "visits" + ${visitsDelta},
          "pageviews" = "pageviews" + ${viewsDelta},
          "updatedAt" = CURRENT_TIMESTAMP`
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error ingesting metric:', error)
    return NextResponse.json({ success: false, error: 'Failed to ingest' }, { status: 500 })
  }
}


