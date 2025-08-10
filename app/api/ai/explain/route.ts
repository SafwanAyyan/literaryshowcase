import { NextRequest, NextResponse } from 'next/server'
import { GeminiService } from '@/lib/gemini-service'

// POST /api/ai/explain - explain a piece of writing using Gemini
export async function POST(request: NextRequest) {
  try {
    const { content, question, author, category, source, type } = await request.json()
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing content' }, { status: 400 })
    }
    const answer = await GeminiService.explainText(
      [
        category ? `Category: ${category}` : null,
        type ? `Type: ${type}` : null,
        author ? `Author: ${author}` : null,
        source ? `Source: ${source}` : null,
        '',
        content,
      ]
        .filter(Boolean)
        .join('\n'),
      question || ''
    )
    return NextResponse.json({ success: true, answer })
  } catch (error) {
    console.error('AI explain error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get explanation' }, { status: 500 })
  }
}


