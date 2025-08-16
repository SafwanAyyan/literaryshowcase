import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { loadOverrides, saveOverrides } from '@/lib/prompt-overrides'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function bad(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status })
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return bad('Unauthorized', 401)
    }
    const data = await loadOverrides()
    return ok({ overrides: data })
  } catch (e: any) {
    console.error('GET /api/admin/prompt-overrides failed:', e)
    return bad('Failed to load overrides', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return bad('Unauthorized', 401)
    }
    const body = await request.json().catch(() => ({}))
    const overrides = body?.overrides
    if (!overrides || typeof overrides !== 'object') {
      return bad('Invalid overrides payload')
    }
    await saveOverrides(overrides)
    return ok({ saved: true })
  } catch (e: any) {
    console.error('POST /api/admin/prompt-overrides failed:', e)
    return bad('Failed to save overrides', 500)
  }
}