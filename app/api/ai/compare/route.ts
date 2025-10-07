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

    // Create cache key from content hashes
    const hash1 = crypto.createHash('sha256').update(item1.content).digest('hex').slice(0, 16)
    const hash2 = crypto.createHash('sha256').update(item2.content).digest('hex').slice(0, 16)
    const cacheKey = `compare:${hash1}:${hash2}`

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

    // Build comparison prompt
    const userPrompt = `${systemPrompt}

Compare these two literary pieces:

**FIRST PIECE:**
"${item1.content}"
— ${item1.author} (${item1.category}${item1.type ? `, ${item1.type}` : ''})

**SECOND PIECE:**
"${item2.content}"
— ${item2.author} (${item2.category}${item2.type ? `, ${item2.type}` : ''})

Provide analysis in these sections:

## Similarities
What themes, emotions, or messages do they share?

## Differences
How do their approaches, tones, or perspectives differ?

## Literary Techniques
Compare their use of metaphor, imagery, rhythm, and structure.

## Emotional Impact
How does each piece affect the reader? What feelings do they evoke?

## Contextual Analysis
Considering the authors, categories, and time periods, what insights emerge?

## Synthesis
What deeper understanding do we gain by reading these together?

Be specific, insightful, and reference exact phrases from both texts.`

    // Use explainText for detailed comparison (it returns clean prose)
    const comparison = await UnifiedAIService.explainText?.(
      userPrompt,
      'comparison'
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

