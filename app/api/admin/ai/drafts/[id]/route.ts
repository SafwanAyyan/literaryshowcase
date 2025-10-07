import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { DatabaseService } from '@/lib/database-service'
import type { Category, AIDraftStatus } from '@/types/literary'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (!session || role !== 'admin') {
    return null
  }
  return session
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Draft ID is required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { content, category, type, tags, status, reviewNotes } = body || {}

    const updated = await DatabaseService.updateDraft(
      id,
      {
        content: typeof content === 'string' ? content : undefined,
        category: category as Category | undefined,
        type: type as 'quote' | 'poem' | 'reflection' | undefined,
        tags: Array.isArray(tags)
          ? tags
          : typeof tags === 'string'
            ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
            : undefined,
        status: status as AIDraftStatus | undefined,
        reviewNotes: typeof reviewNotes === 'string' ? reviewNotes : undefined,
      },
      {
        id: (session.user as any)?.id || null,
        name: session.user?.name || (session.user as any)?.email || null,
      }
    )

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, draft: updated })
  } catch (error) {
    console.error(`[admin/ai/drafts/${(params as any)?.id}] Failed to update draft`, error)
    return NextResponse.json({ success: false, error: 'Failed to update draft' }, { status: 500 })
  }
}
