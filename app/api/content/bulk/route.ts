import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { DatabaseService } from '@/lib/database-service'

// POST /api/content/bulk - Add multiple content items
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
    const { items } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid items array' },
        { status: 400 }
      )
    }

    // Validate and clean each item
    const cleanedItems = items.map((item) => {
      if (!item.content || !item.category || !item.type) {
        return null // Will be filtered out
      }
      return {
        ...item,
        author: item.author || 'Anonymous' // Default to Anonymous if not provided
      }
    }).filter(Boolean) // Remove null items

    if (cleanedItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid items to add' },
        { status: 400 }
      )
    }

    const newItems = await DatabaseService.bulkAddContent(cleanedItems)
    return NextResponse.json({ success: true, data: newItems })
  } catch (error) {
    console.error('Error bulk adding content:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add content items' },
      { status: 500 }
    )
  }
}