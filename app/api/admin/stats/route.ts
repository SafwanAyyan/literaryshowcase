import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { DatabaseService } from '@/lib/database-service'
import { CacheService } from '@/lib/cache-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const stats = await CacheService.getOrSet('content-statistics', () => DatabaseService.getStatistics(), CacheService.TTL.STATS)
    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}