import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { UnifiedAIService } from '@/lib/unified-ai-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { provider, apiKey } = await request.json()

    if (!provider || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Provider and API key are required' },
        { status: 400 }
      )
    }

    if (!['openai', 'gemini', 'deepseek'].includes(provider)) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider. Must be openai, gemini, or deepseek' },
        { status: 400 }
      )
    }

    try {
      const result = await UnifiedAIService.testConnection(provider as any, apiKey)
      
      return NextResponse.json({
        success: result.success,
        message: result.message,
        provider
      })
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        message: error.message || 'Connection test failed',
        provider
      })
    }
  } catch (error: any) {
    console.error('Error testing provider connection:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}