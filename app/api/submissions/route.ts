import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { DatabaseService } from '@/lib/database-service'

// POST /api/submissions - Create a new submission (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      content, 
      author, 
      source, 
      category, 
      type, 
      submitterName, 
      submitterEmail, 
      submitterMessage 
    } = body

    // Validation
    if (!content || !author || !category || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: content, author, category, type' },
        { status: 400 }
      )
    }

    if (content.length < 10 || content.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Content must be between 10 and 5000 characters' },
        { status: 400 }
      )
    }

    if (author.length < 1 || author.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Author name must be between 1 and 200 characters' },
        { status: 400 }
      )
    }

    // Validate category and type
    const validCategories = ['found-made', 'cinema', 'literary-masters', 'spiritual', 'original-poetry', 'heartbreak']
    const validTypes = ['quote', 'poem', 'reflection']

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category' },
        { status: 400 }
      )
    }

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type' },
        { status: 400 }
      )
    }

    // Create submission using database service
    const submission = await DatabaseService.createSubmission({
      content,
      author,
      source,
      category,
      type,
      submitterName,
      submitterEmail,
      submitterMessage
    })

    return NextResponse.json({
      success: true,
      data: {
        id: submission.id,
        message: 'Your submission has been received and is pending review. Thank you for contributing to our literary collection!'
      }
    })
  } catch (error: any) {
    console.error('Error creating submission:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit content. Please try again.' },
      { status: 500 }
    )
  }
}

// GET /api/submissions - Get submissions (admin only)
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
    const status = searchParams.get('status') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get submissions using database service
    const result = await DatabaseService.getSubmissions({
      status,
      page,
      limit
    })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch submissions' },
      { status: 500 }
    )
  }
} 