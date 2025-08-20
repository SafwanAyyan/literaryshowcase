import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { UnifiedAIService } from '@/lib/unified-ai-service'
import type { AIProvider } from '@/lib/unified-ai-service'
import { DatabaseService } from '@/lib/database-service'
import type { Category } from '@/types/literary'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { category, type, theme, tone, quantity, writingMode, provider } = body

    if (!category || !type || !tone || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const qty = typeof quantity === 'string' ? parseInt(quantity) : Number(quantity)
    if (!Number.isFinite(qty) || qty < 1 || qty > 20) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be between 1 and 20' },
        { status: 400 }
      )
    }

    const generationParams = {
      category: category as Category,
      type: type as "quote" | "poem" | "reflection",
      theme: theme || undefined,
      tone,
      quantity: qty,
      writingMode: writingMode || 'original-ai'
    }

    try {
      // Respect explicit provider selection from UI; support "both" aggregation
      let generated: any[] = []
      const seen = new Set<string>()

      const pushUnique = (items: any[]) => {
        for (const it of items) {
          const key = (it?.content || '').toLowerCase().trim()
          if (!key || seen.has(key)) continue
          seen.add(key)
          generated.push(it)
        }
      }

      if (provider === 'both') {
        const [openaiItems, geminiItems] = await Promise.all([
          UnifiedAIService.generateContent(generationParams, { provider: 'openai' as AIProvider }),
          UnifiedAIService.generateContent(generationParams, { provider: 'gemini' as AIProvider })
        ])
        pushUnique(openaiItems)
        pushUnique(geminiItems)

        // If still short, attempt DeepSeek when configured
        if (generated.length < generationParams.quantity) {
          try {
            const deepseekItems = await UnifiedAIService.generateContent(generationParams, { provider: 'deepseek' as AIProvider })
            pushUnique(deepseekItems)
          } catch {
            // ignore tertiary failure
          }
        }

        generated = generated.slice(0, generationParams.quantity)
      } else {
        const selected = provider as AIProvider | undefined
        generated = await UnifiedAIService.generateContent(generationParams, selected ? { provider: selected } : undefined)
      }

      // Log the generation attempt
      await DatabaseService.logGeneration({
        prompt: `Generate ${quantity} ${type}s in ${tone} tone about ${theme || 'general'} for ${category}`,
        parameters: { ...generationParams, provider: provider || 'auto' },
        itemsCount: generated.length,
        success: true
      })
      
      return NextResponse.json({
        success: true,
        data: generated
      })
    } catch (aiError: any) {
      // Log the failed generation
      await DatabaseService.logGeneration({
        prompt: `Generate ${quantity} ${type}s in ${tone} tone about ${theme || 'general'} for ${category}`,
        parameters: generationParams,
        itemsCount: 0,
        success: false,
        error: aiError.message
      })
      
      return NextResponse.json(
        { success: false, error: aiError.message || 'Failed to generate content' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in AI generation:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}