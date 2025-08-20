import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { DatabaseService } from '@/lib/database-service'
import type { ContentItem } from '@/types/literary'

export const runtime = 'nodejs'

// GET /api/content - Get all content
export async function GET() {
  try {
    const content = await DatabaseService.getAllContent()
    return NextResponse.json({ success: true, data: content })
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}

// POST /api/content - Add new content
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
    const { content, author, source, category, type } = body

    if (!content || !category || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: content, category, and type are required' },
        { status: 400 }
      )
    }

    const newItem = await DatabaseService.addContent({
      content,
      author: author || 'Anonymous', // Default to Anonymous if not provided
      source: source || undefined,
      category,
      type
    })

    return NextResponse.json({ success: true, data: newItem })
  } catch (error) {
    console.error('Error adding content:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add content' },
      { status: 500 }
    )
  }
}