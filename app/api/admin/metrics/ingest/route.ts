import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Ensure Node.js runtime (required for Prisma)
export const runtime = 'nodejs'

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


