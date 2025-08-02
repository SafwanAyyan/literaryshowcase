import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { OpenAIService } from '@/lib/openai-service'
import { GeminiService } from '@/lib/gemini-service'

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
    const { provider, apiKey } = body

    if (!provider || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Provider and API key are required' },
        { status: 400 }
      )
    }

    try {
      let result: { success: boolean; message: string }

      if (provider === 'openai') {
        // Temporarily set the API key for testing
        const originalKey = process.env.OPENAI_API_KEY
        process.env.OPENAI_API_KEY = apiKey
        
        try {
          result = await OpenAIService.testConnection()
        } finally {
          // Restore original key
          process.env.OPENAI_API_KEY = originalKey
        }
      } else if (provider === 'gemini') {
        // Temporarily set the API key for testing
        const originalKey = process.env.GEMINI_API_KEY
        process.env.GEMINI_API_KEY = apiKey
        
        try {
          result = await GeminiService.testConnection()
        } finally {
          // Restore original key
          process.env.GEMINI_API_KEY = originalKey
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid provider' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: result.success,
        message: result.message,
        provider
      })
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || `Failed to test ${provider} connection` },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error testing API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}