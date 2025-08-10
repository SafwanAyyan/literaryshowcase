import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { OCRService } from '@/lib/ocr-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get OCR provider status with enhanced error handling
    try {
      const providers = await OCRService.getProvidersStatus()
      
      return NextResponse.json({
        success: true,
        providers: providers.map(p => ({
          provider: p.provider,
          available: p.available,
          error: p.error || null,
          description: getProviderDescription(p.provider),
          lastChecked: new Date().toISOString()
        }))
      })
    } catch (ocrError: any) {
      console.error('OCR Service error:', ocrError)
      // Return fallback status
      return NextResponse.json({
        success: true,
        providers: [
          { provider: 'ocr-space', available: false, error: 'Service check failed', description: 'OCR.space API' },
          { provider: 'gemini', available: false, error: 'Service check failed', description: 'Google Gemini Vision' },
          { provider: 'free-ocr-ai', available: false, error: 'Service check failed', description: 'FreeOCR.AI' }
        ]
      })
    }
  } catch (error: any) {
    console.error('Error checking OCR provider status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check OCR provider status' },
      { status: 500 }
    )
  }
}

function getProviderDescription(provider: string): string {
  const descriptions: Record<string, string> = {
    'ocr-space': 'Free tier with 25,000 requests/month. Reliable and fast.',
    'gemini': 'Google Gemini Vision API. Excellent for complex layouts.',
    'free-ocr-ai': 'Latest VLM technology. Best format preservation.',
  }
  return descriptions[provider] || 'OCR provider'
}