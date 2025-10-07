import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { DatabaseService } from '@/lib/database-service'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (!session || role !== 'admin') {
    return null
  }
  return session
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const ids = Array.isArray(body?.ids) ? body.ids.map(String) : []
    if (!ids.length) {
      return NextResponse.json({ success: false, error: 'No draft IDs provided' }, { status: 400 })
    }

    const result = await DatabaseService.bulkPublishDrafts(ids, {
      id: (session.user as any)?.id || null,
      name: session.user?.name || (session.user as any)?.email || null,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[admin/ai/drafts/bulk-publish] Failed to publish drafts', error)
    return NextResponse.json({ success: false, error: 'Failed to publish drafts' }, { status: 500 })
  }
}
