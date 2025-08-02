import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database-service'

// GET /api/content/public - Get all published content (no auth required)
export async function GET() {
  try {
    const content = await DatabaseService.getAllContent()
    return NextResponse.json({ success: true, data: content })
  } catch (error) {
    console.error('Error fetching public content:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}