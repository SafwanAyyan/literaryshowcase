import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { OCRService } from '@/lib/ocr-service'

// Rate limiting map to prevent abuse
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10 // requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting by user email
    const userEmail = session.user?.email || 'anonymous'
    const now = Date.now()
    const userRequest = requestCounts.get(userEmail)
    
    if (userRequest) {
      if (now < userRequest.resetTime) {
        if (userRequest.count >= RATE_LIMIT) {
          return NextResponse.json(
            { success: false, error: `Rate limit exceeded. Please wait before uploading more images.` },
            { status: 429 }
          )
        }
        userRequest.count++
      } else {
        // Reset window
        requestCounts.set(userEmail, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
      }
    } else {
      requestCounts.set(userEmail, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    }

    const formData = await request.formData()
    const image = formData.get('image') as File

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      )
    }

    // Enhanced file validation
    const maxSize = 5 * 1024 * 1024 // Reduced to 5MB for better performance
    if (image.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Image size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Validate file type more strictly
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(image.type.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Only JPG, PNG, GIF, and WebP images are supported' },
        { status: 400 }
      )
    }

    // Check if file has content
    if (image.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Image file appears to be empty' },
        { status: 400 }
      )
    }

    try {
      console.log(`[ImageToText] Processing ${image.type} image (${(image.size / 1024).toFixed(1)}KB) with enhanced OCR service`)

      // Convert image to buffer for OCR processing
      const bytes = await image.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      if (!buffer || buffer.length === 0) {
        throw new Error('Failed to process image file')
      }

      // Use enhanced OCR service with multiple providers and fallbacks
      const result = await OCRService.extractText(buffer, image.type, userEmail)

      if (!result.text || result.text.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'No readable text found in the image. Please try an image with clearer text.' },
          { status: 400 }
        )
      }

      console.log(`[ImageToText] Successfully extracted ${result.text.length} characters using ${result.provider}`)

      return NextResponse.json({
        success: true,
        text: result.text,
        metadata: {
          originalSize: image.size,
          extractedLength: result.text.length,
          processingTime: result.processingTime,
          provider: result.provider,
          confidence: result.confidence
        }
      })

    } catch (apiError: any) {
      console.error('Gemini API error:', apiError)
      
      // Handle specific Gemini API errors with detailed messages
      if (apiError.message?.includes('API key') || apiError.message?.includes('API_KEY_INVALID')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid Gemini API key. Please get a free API key from Google AI Studio and add it in Settings → AI Providers.' 
          },
          { status: 400 }
        )
      }
      
      if (apiError.message?.includes('quota') || apiError.message?.includes('limit') || apiError.message?.includes('429')) {
        return NextResponse.json(
          { success: false, error: 'Gemini API quota exceeded. Please try again in a few minutes.' },
          { status: 429 }
        )
      }

      if (apiError.message?.includes('timeout')) {
        return NextResponse.json(
          { success: false, error: 'Request timed out. Please try with a smaller image.' },
          { status: 408 }
        )
      }

      if (apiError.message?.includes('SAFETY')) {
        return NextResponse.json(
          { success: false, error: 'Image was blocked by content policy. Please try a different image.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to process image with AI. Please try again with a clearer image.' 
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Error in image-to-text API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Remove deprecated config - Next.js 14 handles this automatically