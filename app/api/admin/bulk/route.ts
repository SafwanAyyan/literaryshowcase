import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { DatabaseService } from '@/lib/database-service'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 60

const BulkActionSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'delete', 'category', 'feature', 'tag']),
  itemIds: z.array(z.string()).min(1),
  value: z.any().optional(),
})

// POST /api/admin/bulk - Perform bulk operations
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
    const parsed = BulkActionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const { action, itemIds, value } = parsed.data

    let result: any
    let affected = 0

    switch (action) {
      case 'publish':
        result = await prisma.contentItem.updateMany({
          where: { id: { in: itemIds } },
          data: { published: true, updatedAt: new Date() },
        })
        affected = result.count
        break

      case 'unpublish':
        result = await prisma.contentItem.updateMany({
          where: { id: { in: itemIds } },
          data: { published: false, updatedAt: new Date() },
        })
        affected = result.count
        break

      case 'delete':
        // Delete in batches to avoid timeout
        const deletePromises = itemIds.map(id =>
          prisma.contentItem.delete({ where: { id } }).catch(() => null)
        )
        const deleteResults = await Promise.all(deletePromises)
        affected = deleteResults.filter(Boolean).length
        break

      case 'category':
        if (!value || typeof value !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Category value required' },
            { status: 400 }
          )
        }
        result = await prisma.contentItem.updateMany({
          where: { id: { in: itemIds } },
          data: { category: value, updatedAt: new Date() },
        })
        affected = result.count
        break

      case 'feature':
        const featured = value === true || value === 'true'
        result = await prisma.contentItem.updateMany({
          where: { id: { in: itemIds } },
          data: { featured, updatedAt: new Date() },
        })
        affected = result.count
        break

      case 'tag':
        if (!value || typeof value !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Tag value required' },
            { status: 400 }
          )
        }
        // For tags, we need to update individually to append tags
        const tagPromises = itemIds.map(async id => {
          const item = await prisma.contentItem.findUnique({
            where: { id },
          })
          if (!item) return false

          const existingTags = item.tags ? item.tags.split(',').map(t => t.trim()) : []
          const newTags = value.split(',').map((t: string) => t.trim())
          const mergedTags = Array.from(new Set([...existingTags, ...newTags]))

          await prisma.contentItem.update({
            where: { id },
            data: {
              tags: mergedTags.join(', '),
              updatedAt: new Date(),
            },
          })
          return true
        })
        const tagResults = await Promise.all(tagPromises)
        affected = tagResults.filter(Boolean).length
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      affected,
      message: `Successfully ${action === 'delete' ? 'deleted' : 'updated'} ${affected} item(s)`,
    })
  } catch (error) {
    console.error('Error performing bulk operation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}

// GET /api/admin/bulk/export - Export selected items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    
    if (!idsParam) {
      return NextResponse.json(
        { success: false, error: 'No item IDs provided' },
        { status: 400 }
      )
    }

    const itemIds = idsParam.split(',')

    const items = await prisma.contentItem.findMany({
      where: { id: { in: itemIds } },
    })

    // Format as JSON export
    const exportData = {
      exportDate: new Date().toISOString(),
      count: items.length,
      items: items.map(item => ({
        id: item.id,
        content: item.content,
        author: item.author,
        source: item.source,
        category: item.category,
        type: item.type,
        tags: item.tags,
        featured: item.featured,
        published: item.published,
        views: item.views,
        likes: item.likes,
        createdAt: item.createdAt,
      })),
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="export_${Date.now()}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exporting items:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export items' },
      { status: 500 }
    )
  }
}
