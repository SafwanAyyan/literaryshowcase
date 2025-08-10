import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      )
    }

    const results = {
      keyFormat: analyzeKeyFormat(apiKey),
      aiStudioTest: await testAIStudio(apiKey),
      cloudVisionTest: await testCloudVision(apiKey),
      recommendation: ''
    }

    // Determine recommendation
    if (results.aiStudioTest.success) {
      results.recommendation = 'ai-studio'
    } else if (results.cloudVisionTest.success) {
      results.recommendation = 'cloud-vision'
    } else {
      results.recommendation = 'unknown'
    }

    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error: any) {
    console.error('Error diagnosing API key:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function analyzeKeyFormat(apiKey: string) {
  if (apiKey.startsWith('AIza')) {
    return {
      type: 'Google API Key',
      format: 'Standard Google API format',
      compatible: ['AI Studio', 'Cloud Services']
    }
  } else if (apiKey.startsWith('sk-')) {
    return {
      type: 'OpenAI API Key',
      format: 'OpenAI format',
      compatible: ['OpenAI services only']
    }
  } else {
    return {
      type: 'Unknown',
      format: 'Unrecognized format',
      compatible: ['Cannot determine']
    }
  }
}

async function testAIStudio(apiKey: string) {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Simple test prompt
    const result = await model.generateContent("Say 'test'")
    const response = await result.response
    const text = response.text()

    return {
      success: true,
      service: 'Google AI Studio',
      endpoint: 'generativelanguage.googleapis.com',
      model: 'gemini-1.5-flash',
      response: text?.toLowerCase().includes('test') ? 'Valid response' : 'Unexpected response'
    }
  } catch (error: any) {
    return {
      success: false,
      service: 'Google AI Studio',
      endpoint: 'generativelanguage.googleapis.com',
      error: error.message || 'Unknown error'
    }
  }
}

async function testCloudVision(apiKey: string) {
  try {
    // Test Cloud Vision API with a simple request
    const testUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{
          image: {
            content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' // 1x1 transparent pixel
          },
          features: [{
            type: 'TEXT_DETECTION',
            maxResults: 1
          }]
        }]
      })
    })

    if (response.ok) {
      return {
        success: true,
        service: 'Google Cloud Vision',
        endpoint: 'vision.googleapis.com',
        api: 'Vision API',
        response: 'API key is valid for Cloud Vision'
      }
    } else {
      const errorData = await response.json()
      return {
        success: false,
        service: 'Google Cloud Vision',
        endpoint: 'vision.googleapis.com',
        error: errorData.error?.message || 'API key invalid for Cloud Vision'
      }
    }
  } catch (error: any) {
    return {
      success: false,
      service: 'Google Cloud Vision',
      endpoint: 'vision.googleapis.com',
      error: error.message || 'Unknown error'
    }
  }
}