import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { UnifiedAIService } from '@/lib/unified-ai-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { content } = await request.json()

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    try {
      const sourceInfo = await UnifiedAIService.findSourceInfo(content.trim())
      return NextResponse.json({ success: true, data: sourceInfo })
    } catch (error: any) {
      console.error('Error finding source with AI provider:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to find source information' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in find source API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error during source lookup' },
      { status: 500 }
    )
  }
}