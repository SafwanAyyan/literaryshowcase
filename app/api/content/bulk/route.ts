import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { DatabaseService } from '@/lib/database-service'
import { CacheService } from '@/lib/cache-service'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { items, submissions, action } = body

    let contentImported = 0
    let submissionsImported = 0
    let totalSkipped = 0

    // Admin bulk actions
    if (action && action.type) {
      const ids: string[] = Array.isArray(action.ids) ? action.ids : []
      if (ids.length === 0) {
        return NextResponse.json({ success: false, error: 'No IDs provided' }, { status: 400 })
      }

      if (action.type === 'delete') {
        await prisma.contentItem.deleteMany({ where: { id: { in: ids } } })
      } else if (action.type === 'setAuthor') {
        const newAuthor = (action.value || '').toString().trim() || 'Anonymous'
        await prisma.contentItem.updateMany({ where: { id: { in: ids } }, data: { author: newAuthor } })
      }

      CacheService.invalidatePattern('content')
      CacheService.invalidate('content-statistics')
      return NextResponse.json({ success: true, data: { affected: ids.length } })
    }

    // Handle content items import
    if (items && Array.isArray(items)) {
      const validItems = items.filter(item => 
        item.content && 
        item.author && 
        item.category && 
        item.type
      )

      if (validItems.length > 0) {
        const created = await DatabaseService.bulkAddContent(validItems)
        contentImported = created.length
      }
      totalSkipped += items.length - validItems.length
    }

    // Handle submissions
    if (submissions && Array.isArray(submissions)) {
      const validSubmissions = submissions.filter(sub => 
        sub.content && 
        sub.author && 
        sub.category && 
        sub.type
      )

      if (validSubmissions.length > 0) {
        submissionsImported = await DatabaseService.bulkImportSubmissions(validSubmissions)
      }
      totalSkipped += submissions.length - validSubmissions.length
    }

    // If no valid data found
    if (contentImported === 0 && submissionsImported === 0 && (!items && !submissions)) {
      return NextResponse.json(
        { success: false, error: 'Invalid data format. Expected "items" or "submissions" arrays.' },
        { status: 400 }
      )
    }

    // Invalidate all relevant caches to ensure statistics are updated
    CacheService.invalidatePattern('content')
    CacheService.invalidatePattern('submissions')
    CacheService.invalidatePattern('admin-stats')
    CacheService.invalidate('content-statistics')

    return NextResponse.json({
      success: true,
      data: {
        contentImported,
        submissionsImported,
        totalSkipped,
        total: (items?.length || 0) + (submissions?.length || 0)
      }
    })
  } catch (error: any) {
    console.error('Error in bulk import:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to import data' },
      { status: 500 }
    )
  }
}