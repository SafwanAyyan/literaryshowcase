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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Draft ID is required' }, { status: 400 })
    }

    const history = await DatabaseService.getDraftHistory(id)
    return NextResponse.json({ success: true, history })
  } catch (error) {
    console.error(`[admin/ai/drafts/${(params as any)?.id}/events] Failed to fetch history`, error)
    return NextResponse.json({ success: false, error: 'Failed to fetch draft history' }, { status: 500 })
  }
}
