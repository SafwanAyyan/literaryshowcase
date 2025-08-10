import { NextRequest, NextResponse } from 'next/server'
import { GeminiService } from '@/lib/gemini-service'
import { CacheService } from '@/lib/cache-service'
import crypto from 'crypto'

// POST /api/ai/analyze - deep literary analysis using Gemini 2.5 Pro
export async function POST(request: NextRequest) {
  try {
    const { id, content, author, category, type, source } = await request.json()
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing content' }, { status: 400 })
    }
    const hash = crypto.createHash('sha1').update(content).digest('hex')
    const cacheKey = `analysis:${id || 'noid'}:${hash}`
    const analysis = await CacheService.getOrSet(cacheKey, () =>
      GeminiService.analyzeLiterary(content, { author, category, type, source })
    , CacheService.TTL.LONG)
    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('AI analyze error:', error)
    return NextResponse.json({ success: false, error: 'Failed to analyze' }, { status: 500 })
  }
}


