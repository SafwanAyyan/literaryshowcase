import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { shouldToggleLike } from '@/lib/engagement'

// POST /api/content/[id]/like - toggle like with cookie-based state
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const decision = shouldToggleLike(request, params.id)

    const delta = decision.like ? 1 : -1
    // Update likes, ensuring it never goes below 0
    await prisma.$transaction(async (tx) => {
      const current = await tx.contentItem.findUnique({ where: { id: params.id }, select: { likes: true } })
      if (!current) return
      const nextLikes = Math.max(0, (current.likes || 0) + delta)
      await tx.contentItem.update({ where: { id: params.id }, data: { likes: nextLikes } })
    })

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (decision.setCookie) headers['Set-Cookie'] = decision.setCookie
    if (decision.clearCookie) headers['Set-Cookie'] = decision.clearCookie

    return new NextResponse(JSON.stringify({ success: true, liked: decision.like }), { status: 200, headers })
  } catch (error) {
    console.error('Error toggling like:', error)
    return NextResponse.json({ success: false, error: 'Failed to toggle like' }, { status: 500 })
  }
}


