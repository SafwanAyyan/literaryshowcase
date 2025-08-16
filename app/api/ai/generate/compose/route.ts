import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { UnifiedAIService } from '@/lib/unified-ai-service'
import type { Category } from '@/types/literary'

/**
 * POST /api/ai/generate/compose
 * Admin-only endpoint that returns the fully composed generation prompt
 * (system base + tokens + category overrides), without calling any provider.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { category, type, theme, tone, quantity, writingMode } = body || {}

    if (!category || !type || !tone || !quantity) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 })
    }

    const qty = typeof quantity === 'string' ? parseInt(quantity) : Number(quantity)
    if (!Number.isFinite(qty) || qty < 1 || qty > 20) {
      return NextResponse.json({ success: false, error: 'Quantity must be between 1 and 20' }, { status: 400 })
    }

    const params = {
      category: category as Category,
      type: type as 'quote' | 'poem' | 'reflection',
      theme: theme || undefined,
      tone,
      quantity: qty,
      writingMode: writingMode || 'original-ai',
    }

    const composed = await UnifiedAIService.composeGenerationPrompt(params)
    return NextResponse.json({ success: true, prompt: composed })
  } catch (error: any) {
    console.error('Error composing generation prompt:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}