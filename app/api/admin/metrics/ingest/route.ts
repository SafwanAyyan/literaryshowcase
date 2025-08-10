import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Ensure Node.js runtime (required for Prisma)
export const runtime = 'nodejs'

// Cache DB reachability to avoid spamming failed connections
let lastDbCheck = 0
let lastDbOk = true
const DB_RECHECK_MS = 5 * 60 * 1000 // 5 minutes

async function isDatabaseReachable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false
  const now = Date.now()
  if (now - lastDbCheck < DB_RECHECK_MS) return lastDbOk
  try {
    await prisma.$queryRaw`SELECT 1`
    lastDbOk = true
  } catch {
    lastDbOk = false
  } finally {
    lastDbCheck = now
  }
  return lastDbOk
}

// POST /api/admin/metrics/ingest { date: 'YYYY-MM-DD', type: 'pageview' | 'visit' }
// This is intentionally unauthenticated but should be throttled/behind CDN in production.
export async function POST(request: NextRequest) {
  try {
    // If DB is not configured or unreachable, no-op successfully
    if (!(await isDatabaseReachable())) {
      return NextResponse.json({ success: true, skipped: true })
    }
    const { date, type } = await request.json()
    if (!date || typeof date !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid date' }, { status: 400 })
    }
    const visitsDelta = type === 'visit' ? 1 : 0
    const viewsDelta = type === 'pageview' ? 1 : 0
    // Upsert via Prisma (schema/table is created via migrations or db push during build)
    await prisma.dailyMetric.upsert({
      where: { date },
      update: { visits: { increment: visitsDelta }, pageviews: { increment: viewsDelta } },
      create: { date, visits: visitsDelta, pageviews: viewsDelta },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error ingesting metric:', error)
    return NextResponse.json({ success: false, error: 'Failed to ingest' }, { status: 500 })
  }
}


