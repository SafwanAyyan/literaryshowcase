import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { UnifiedAIService } from '@/lib/unified-ai-service'
import { CacheService } from '@/lib/cache-service'
import crypto from 'crypto'

// In-flight request deduplication to avoid N+1 and dogpiling
const pending = new Map<string, Promise<any>>()

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    p.then((v) => {
      clearTimeout(t)
      resolve(v)
    }).catch((e) => {
      clearTimeout(t)
      reject(e)
    })
  })
}

// POST /api/ai/analyze - deep literary analysis with caching/dedupe/timeouts
export async function POST(request: NextRequest) {
  try {
    const { id, content, author, category, type, source } = await request.json()
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing content' }, { status: 400 })
    }

    // Cache key: work id + language + active model + content hash (v2)
    const hash = crypto.createHash('sha1').update(content).digest('hex')
    const langHeader = request.headers.get('accept-language') || 'en'
    const lang = (langHeader.split(',')[0] || 'en').slice(0, 2)
    const { model } = await UnifiedAIService.getActiveModel('analyze')
    const cacheKey = `analysis:v2:${id || 'noid'}:${lang}:${model}:${hash}`

    const cached = CacheService.get<any>(cacheKey)
    if (cached) {
      return NextResponse.json({ success: true, analysis: cached })
    }

    if (pending.has(cacheKey)) {
      const analysis = await pending.get(cacheKey)!
      return NextResponse.json({ success: true, analysis })
    }

    const runner = (async () => {
      let attempt = 0
      let lastError: any
      while (attempt < 2) {
        try {
          const analysis = await withTimeout(
            UnifiedAIService.analyzeText(content, { author, category, type, source }),
            25_000
          )
          CacheService.set(cacheKey, analysis, CacheService.TTL.LONG)
          return analysis
        } catch (e) {
          lastError = e
          attempt++
          // brief backoff
          await new Promise(r => setTimeout(r, 250))
        }
      }
      throw lastError
    })()

    pending.set(cacheKey, runner)
    try {
      const analysis = await runner
      return NextResponse.json({ success: true, analysis })
    } finally {
      pending.delete(cacheKey)
    }
  } catch (error) {
    console.error('AI analyze error:', error)
    return NextResponse.json({ success: false, error: 'Failed to analyze' }, { status: 500 })
  }
}


