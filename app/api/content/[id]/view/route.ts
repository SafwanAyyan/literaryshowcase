import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { shouldCountView } from '@/lib/engagement'
import { CacheService } from '@/lib/cache-service'
import { UnifiedAIService } from '@/lib/unified-ai-service'
import crypto from 'crypto'

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

    // Fire-and-forget: warm analysis cache on first counted view
    ;(async () => {
      try {
        const item = await prisma.contentItem.findUnique({ where: { id: params.id } })
        if (!item || !item.published) return
        const { model } = await UnifiedAIService.getActiveModel('analyze')
        const hash = crypto.createHash('sha1').update(item.content).digest('hex')
        const lang = 'en'
        const cacheKey = `analysis:v2:${item.id}:${lang}:${model}:${hash}`
        const existing = CacheService.get(cacheKey)
        if (!existing) {
          const analysis = await UnifiedAIService.analyzeText(item.content, {
            author: item.author,
            category: item.category,
            type: item.type,
            source: item.source || undefined,
          })
          CacheService.set(cacheKey, analysis, CacheService.TTL.LONG)
        }
      } catch {
        // silent warm failure
      }
    })()

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (guard.setCookie) headers['Set-Cookie'] = guard.setCookie

    return new NextResponse(JSON.stringify({ success: true, counted: true }), { status: 200, headers })
  } catch (error) {
    console.error('Error counting view:', error)
    return NextResponse.json({ success: false, error: 'Failed to count view' }, { status: 500 })
  }
}


