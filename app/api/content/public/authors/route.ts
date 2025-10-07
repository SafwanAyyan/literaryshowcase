import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { DatabaseService } from '@/lib/database-service'

// GET /api/content/public/authors - Get distinct authors for filters
export async function GET() {
  try {
    const authors = await DatabaseService.getAuthors()
    return NextResponse.json({ success: true, authors })
  } catch (error) {
    console.error('Error fetching authors:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch authors' },
      { status: 500 }
    )
  }
}

