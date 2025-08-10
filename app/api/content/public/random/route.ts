import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const count = await prisma.contentItem.count({ where: { published: true } })
    if (count === 0) {
      return NextResponse.json({ success: true, item: null })
    }
    const skip = Math.max(0, Math.floor(Math.random() * count))
    const item = await prisma.contentItem.findFirst({
      where: { published: true },
      skip,
      take: 1,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, item })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch random item' }, { status: 500 })
  }
}


