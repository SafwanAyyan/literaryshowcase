import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { OpenAIService } from '@/lib/openai-service'
import { GeminiService } from '@/lib/gemini-service'
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
    const { category, type, theme, tone, quantity, provider } = body

    if (!category || !type || !tone || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    if (quantity < 1 || quantity > 20) {
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
      quantity: parseInt(quantity)
    }

    try {
      let generated: any[] = []
      let errors: string[] = []
      const selectedProvider = provider || 'openai'

      // Try generating with selected provider(s)
      if (selectedProvider === 'both') {
        // Try both providers and combine results
        const halfQuantity = Math.ceil(generationParams.quantity / 2)
        const remainingQuantity = generationParams.quantity - halfQuantity

        // Try OpenAI first
        try {
          const openaiResult = await OpenAIService.generateContent({
            ...generationParams,
            quantity: halfQuantity
          })
          generated.push(...openaiResult)
        } catch (openaiError: any) {
          console.error('OpenAI generation failed:', openaiError.message)
          errors.push(`OpenAI: ${openaiError.message}`)
        }

        // Try Gemini for remaining
        if (remainingQuantity > 0) {
          try {
            const geminiResult = await GeminiService.generateContent({
              ...generationParams,
              quantity: remainingQuantity
            })
            generated.push(...geminiResult)
          } catch (geminiError: any) {
            console.error('Gemini generation failed:', geminiError.message)
            errors.push(`Gemini: ${geminiError.message}`)
          }
        }
      } else if (selectedProvider === 'gemini') {
        try {
          generated = await GeminiService.generateContent(generationParams)
        } catch (geminiError: any) {
          errors.push(`Gemini: ${geminiError.message}`)
          // Fallback to OpenAI if Gemini fails
          try {
            generated = await OpenAIService.generateContent(generationParams)
          } catch (openaiError: any) {
            errors.push(`OpenAI fallback: ${openaiError.message}`)
            throw new Error(`Both providers failed: ${errors.join(', ')}`)
          }
        }
      } else {
        // Default to OpenAI
        try {
          generated = await OpenAIService.generateContent(generationParams)
        } catch (openaiError: any) {
          errors.push(`OpenAI: ${openaiError.message}`)
          // Fallback to Gemini if OpenAI fails
          try {
            generated = await GeminiService.generateContent(generationParams)
          } catch (geminiError: any) {
            errors.push(`Gemini fallback: ${geminiError.message}`)
            throw new Error(`Both providers failed: ${errors.join(', ')}`)
          }
        }
      }

      // If no content was generated, throw error
      if (generated.length === 0) {
        throw new Error(`No content generated. Errors: ${errors.join(', ')}`)
      }
      
      // Log the generation attempt
      await DatabaseService.logGeneration({
        prompt: `Generate ${quantity} ${type}s in ${tone} tone about ${theme || 'general'} for ${category} using ${selectedProvider}`,
        parameters: { ...generationParams, provider: selectedProvider },
        itemsCount: generated.length,
        success: true
      })
      
      return NextResponse.json({ 
        success: true, 
        data: generated,
        provider: selectedProvider,
        warnings: errors.length > 0 ? errors : undefined
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