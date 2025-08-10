import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// GET /api/admin/metrics?days=30
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = Math.max(7, Math.min(90, parseInt(searchParams.get('days') || '30', 10)))
    const group = (searchParams.get('group') || 'day').toLowerCase() // 'day' | 'week'

    const since = new Date()
    since.setDate(since.getDate() - days)

    let metrics: { date: string; visits: number; pageviews: number }[] = []
    const client: any = prisma as any
    if (client.dailyMetric?.findMany) {
      metrics = await client.dailyMetric.findMany({
        orderBy: { date: 'asc' },
        where: { createdAt: { gte: since } },
      })
    } else {
      // Fallback raw query if Prisma model isn't available yet (fresh dev env)
      metrics = await prisma.$queryRawUnsafe(
        `SELECT date, visits, pageviews FROM "DailyMetric" WHERE datetime(createdAt) >= datetime(?) ORDER BY date ASC`,
        since.toISOString()
      ) as any
    }

    // Normalize to a complete series
    const series: { date: string; visits: number; pageviews: number }[] = []
    if (group === 'week') {
      // Build weekly buckets (last N days rolled into weeks)
      const byWeek = new Map<string, { visits: number; pageviews: number }>()
      const cursor = new Date(since)
      const end = new Date()
      while (cursor <= end) {
        const y = cursor.getUTCFullYear()
        const firstJan = new Date(Date.UTC(y, 0, 1))
        const diff = (Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate()) - Date.UTC(y, 0, 1)) / 86400000
        const week = Math.floor((diff + firstJan.getUTCDay()) / 7)
        const weekKey = `${y}-W${String(week).padStart(2, '0')}`
        const dStr = cursor.toISOString().slice(0, 10)
        const m = metrics.find(mm => mm.date === dStr)
        const agg = byWeek.get(weekKey) || { visits: 0, pageviews: 0 }
        agg.visits += m?.visits ?? 0
        agg.pageviews += m?.pageviews ?? 0
        byWeek.set(weekKey, agg)
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      }
      const sortedKeys = Array.from(byWeek.keys()).sort()
      for (const k of sortedKeys) {
        const v = byWeek.get(k)!
        series.push({ date: k, visits: v.visits, pageviews: v.pageviews })
      }
    } else {
      const byDate = new Map(metrics.map(m => [m.date, m]))
      const cursor = new Date(since)
      for (let i = 0; i < days; i++) {
        const d = cursor.toISOString().slice(0, 10)
        const m = byDate.get(d)
        series.push({ date: d, visits: m?.visits ?? 0, pageviews: m?.pageviews ?? 0 })
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    const totals = series.reduce(
      (acc, m) => {
        acc.visits += m.visits
        acc.pageviews += m.pageviews
        return acc
      },
      { visits: 0, pageviews: 0 }
    )

    return NextResponse.json({ success: true, data: { metrics: series, totals } })
  } catch (error) {
    console.error('Error fetching admin metrics:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch metrics' }, { status: 500 })
  }
}


