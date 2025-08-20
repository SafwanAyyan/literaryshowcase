import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { DatabaseService } from '@/lib/database-service'

// PATCH /api/submissions/[id] - Approve/reject submission (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, adminNotes } = body // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const adminEmail = session.user?.email || 'unknown'

    // Update submission status using database service
    const result = await DatabaseService.updateSubmissionStatus(
      params.id,
      action,
      adminNotes,
      adminEmail
    )

    if (action === 'approve') {
      return NextResponse.json({
        success: true,
        data: {
          message: 'Submission approved and added to content',
          contentId: result?.contentId
        }
      })
    } else {
      return NextResponse.json({
        success: true,
        data: {
          message: 'Submission rejected'
        }
      })
    }
  } catch (error: any) {
    console.error('Error updating submission:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update submission' },
      { status: 500 }
    )
  }
}

// GET /api/submissions/[id] - Get specific submission (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get submission using database service (direct lookup)
    const submission = await DatabaseService.getSubmissionById(params.id)

    if (!submission) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: submission
    })
  } catch (error: any) {
    console.error('Error fetching submission:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch submission' },
      { status: 500 }
    )
  }
} 