import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { DatabaseService } from '@/lib/database-service'


// GET /api/content/public - Get all published content (no auth required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const category = searchParams.get('category')
    const author = searchParams.get('author')
    const search = searchParams.get('q')
    const orderBy = (searchParams.get('orderBy') as any) || 'newest'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : null
    const page = searchParams.get('page') ? parseInt(searchParams.get('page') as string, 10) : null

    const result = await DatabaseService.getPublicContent({
      category,
      author,
      search,
      orderBy,
      limit,
      page,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error fetching public content:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}