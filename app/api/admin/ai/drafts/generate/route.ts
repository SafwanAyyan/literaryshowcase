import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { UnifiedAIService } from '@/lib/unified-ai-service'
import { DatabaseService } from '@/lib/database-service'
import type { Category } from '@/types/literary'
import type { AIProvider } from '@/lib/unified-ai-service'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (!session || role !== 'admin') {
    return null
  }
  return session
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { category, type, tone, quantity, theme, writingMode, tags, provider } = body || {}

    if (!category || !type || !tone || !quantity) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 })
    }

    const qty = typeof quantity === 'string' ? parseInt(quantity, 10) : Number(quantity)
    if (!Number.isFinite(qty) || qty < 1 || qty > 20) {
      return NextResponse.json({ success: false, error: 'Quantity must be between 1 and 20' }, { status: 400 })
    }

    const generationParams = {
      category: category as Category,
      type: type as 'quote' | 'poem' | 'reflection',
      tone: String(tone),
      theme: theme ? String(theme) : undefined,
      writingMode: (writingMode as 'known-writers' | 'original-ai') || 'original-ai',
      quantity: qty,
    }

    let generationResult: {
      items: any[]
      prompt: string
      provider: string
      model: string
      metadata?: Record<string, any>
    }

    if (provider === 'both') {
      const [openaiResult, geminiResult] = await Promise.all([
        UnifiedAIService.generateContent(generationParams, { provider: 'openai' }),
        UnifiedAIService.generateContent(generationParams, { provider: 'gemini' }),
      ])

      const seen = new Set<string>()
      const aggregated: typeof openaiResult.items = []
      const pushUnique = (items: typeof openaiResult.items) => {
        for (const item of items) {
          const key = (item.content || '').toLowerCase().trim()
          if (!key || seen.has(key)) continue
          seen.add(key)
          aggregated.push(item)
        }
      }

      pushUnique(openaiResult.items)
      pushUnique(geminiResult.items)

      if (aggregated.length < generationParams.quantity) {
        try {
          const deepseekResult = await UnifiedAIService.generateContent(generationParams, { provider: 'deepseek' })
          pushUnique(deepseekResult.items)
        } catch (error) {
          console.warn('[admin/ai/drafts/generate] DeepSeek fallback failed', error)
        }
      }

      generationResult = {
        items: aggregated.slice(0, generationParams.quantity),
        prompt: openaiResult.prompt || geminiResult.prompt,
        provider: 'hybrid',
        model: 'openai+gemini',
        metadata: {
          providers: [
            { provider: openaiResult.provider, model: openaiResult.model },
            { provider: geminiResult.provider, model: geminiResult.model },
          ],
        },
      }
    } else {
      const forcedProvider = provider ? (String(provider) as AIProvider) : undefined
      const singleResult = await UnifiedAIService.generateContent(
        generationParams,
        forcedProvider ? { provider: forcedProvider } : undefined
      )
      generationResult = {
        items: singleResult.items,
        prompt: singleResult.prompt,
        provider: singleResult.provider,
        model: singleResult.model,
      }
    }

    if (!generationResult.items.length) {
      return NextResponse.json({ success: false, error: 'AI did not return any content. Please adjust the prompt and try again.' }, { status: 502 })
    }

    const createdDrafts = await DatabaseService.createDraftsFromGeneration({
      items: generationResult.items,
      category: generationParams.category,
      type: generationParams.type,
      theme: generationParams.theme || null,
      tone: generationParams.tone,
      writingMode: generationParams.writingMode,
      prompt: generationResult.prompt,
      provider: generationResult.provider,
      model: generationResult.model,
      metadata: {
        quantity: generationParams.quantity,
        ...(generationResult.metadata || {}),
      },
      createdBy: {
        id: (session.user as any)?.id || null,
        name: session.user?.name || (session.user as any)?.email || null,
      },
      tags: Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
          ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
          : [],
    })

    await DatabaseService.logGeneration({
      prompt: generationResult.prompt,
      parameters: { ...generationParams, provider: generationResult.provider },
      itemsCount: generationResult.items.length,
      success: true,
    })

    return NextResponse.json({
      success: true,
      drafts: createdDrafts,
      meta: {
        provider: generationResult.provider,
        model: generationResult.model,
      },
    })
  } catch (error: any) {
    console.error('[admin/ai/drafts/generate] Failed to generate drafts', error)
    await DatabaseService.logGeneration({
      prompt: 'admin-drafts-generate',
      parameters: { error: error?.message },
      itemsCount: 0,
      success: false,
      error: error?.message,
    })
    return NextResponse.json({ success: false, error: error?.message || 'Failed to generate drafts' }, { status: 500 })
  }
}
