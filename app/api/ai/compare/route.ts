import { NextRequest, NextResponse } from 'next/server'
import { UnifiedAIService } from '@/lib/unified-ai-service'
import { PromptService } from '@/lib/prompt-service'
import { CacheService } from '@/lib/cache-service'
import { z } from 'zod'
import crypto from 'crypto'

const CompareSchema = z.object({
  item1: z.object({
    id: z.string(),
    content: z.string(),
    author: z.string(),
    category: z.string(),
    type: z.string().optional(),
  }),
  item2: z.object({
    id: z.string(),
    content: z.string(),
    author: z.string(),
    category: z.string(),
    type: z.string().optional(),
  }),
})

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CompareSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const { item1, item2 } = parsed.data

    // Create cache key from content hashes + active model (provider/model) to avoid cross-model collisions
    const hash1 = crypto.createHash('sha256').update(item1.content).digest('hex').slice(0, 16)
    const hash2 = crypto.createHash('sha256').update(item2.content).digest('hex').slice(0, 16)
    let modelTag = 'unknown'
    try {
      const active = await UnifiedAIService.getActiveModel('explain')
      modelTag = `${active.provider}:${active.model}`
    } catch {}
    const cacheKey = `compare:${modelTag}:${hash1}:${hash2}`

    // Check cache first
    const cached = CacheService.get<string>(cacheKey)
    if (cached) {
      return NextResponse.json({
        success: true,
        comparison: cached,
        cached: true,
      })
    }

    // Get custom prompt from admin panel if exists
    let systemPrompt = ''
    try {
      systemPrompt = await PromptService.getActivePrompt('compare' as any) || ''
    } catch {
      // Use default if not configured
      systemPrompt = `You are an expert literary analyst. Compare two pieces with deep insight, focusing on themes, techniques, emotional impact, and contextual meaning. Be specific and reference exact phrases.`
    }

    // Build a compact content payload and rely on systemPromptOverride for structure
    const contentPair = [
      `FIRST:\n"${item1.content}"\n— ${item1.author} (${item1.category}${item1.type ? `, ${item1.type}` : ''})`,
      `SECOND:\n"${item2.content}"\n— ${item2.author} (${item2.category}${item2.type ? `, ${item2.type}` : ''})`
    ].join('\n\n')

    const comparison = await UnifiedAIService.explainText?.(
      contentPair,
      'Provide a comparative analysis per sections in the system instructions.',
      { systemPromptOverride: [
        systemPrompt,
        'Compare the two inputs and produce ONLY well-formatted Markdown with these sections in order:',
        '## Similarities',
        '## Differences',
        '## Literary Techniques',
        '## Emotional Impact',
        '## Contextual Analysis',
        '## Synthesis',
        'Be specific, reference exact phrases, avoid bullet spam, and keep it concise and insightful.'
      ].join('\n') }
    )

    if (!comparison) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate comparison' },
        { status: 500 }
      )
    }

    // Cache the result
    CacheService.set(cacheKey, comparison, CacheService.TTL.LONG)

    return NextResponse.json({
      success: true,
      comparison,
      cached: false,
    })
  } catch (error) {
    console.error('Error comparing items:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to compare items' },
      { status: 500 }
    )
  }
}

