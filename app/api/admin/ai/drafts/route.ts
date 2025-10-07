import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { DatabaseService } from '@/lib/database-service'
import type { AIDraftStatus, Category } from '@/types/literary'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (!session || role !== 'admin') {
    return null
  }
  return session
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const status = (url.searchParams.get('status') || 'all') as AIDraftStatus | 'all'
    const category = (url.searchParams.get('category') || 'all') as Category | 'all'
    const provider = (url.searchParams.get('provider') || 'all') as string | 'all'
    const tag = url.searchParams.get('tag')
    const search = url.searchParams.get('q')
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)

    const result = await DatabaseService.listDrafts({
      status,
      category,
      provider,
      tag,
      search,
      page,
      limit,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[admin/ai/drafts] Failed to fetch drafts', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch drafts' }, { status: 500 })
  }
}
