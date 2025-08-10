import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { shouldCountView } from '@/lib/engagement'

// POST /api/content/[id]/view - increment view with abuse protection
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = shouldCountView(request, params.id)
    if (!guard.allow) {
      return new NextResponse(JSON.stringify({ success: true, counted: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await prisma.contentItem.update({
      where: { id: params.id },
      data: { views: { increment: 1 } },
    })

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (guard.setCookie) headers['Set-Cookie'] = guard.setCookie

    return new NextResponse(JSON.stringify({ success: true, counted: true }), { status: 200, headers })
  } catch (error) {
    console.error('Error counting view:', error)
    return NextResponse.json({ success: false, error: 'Failed to count view' }, { status: 500 })
  }
}


