import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { CacheService } from '@/lib/cache-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all settings
    const settings = await prisma.adminSettings.findMany()
    
    // Convert to key-value object
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    // Add default values for missing settings
    const defaultSettings = {
      maintenanceMode: 'false',
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
      defaultAiProvider: 'openai',
      openaiModel: 'gpt-4o',
      geminiModel: 'gemini-2.5-pro',
      deepseekModel: 'deepseek-chat-v3',
      maintenanceMessage: 'The Literary Showcase is currently undergoing maintenance. Please check back soon!',
      siteName: 'Literary Showcase',
      allowedMaintenanceEmails: process.env.ADMIN_EMAIL || 'admin@literaryshowcase.com',
      // OCR Settings
      ocrDefaultProvider: 'ocr-space',
      ocrFallbackEnabled: 'true',
      ocrLanguage: 'eng',
      ocrQuality: 'balanced',
      ocrEnhanceImage: 'true',
      ocrDetectOrientation: 'true',
      ocrMaxFileSize: '5',
      ocrTimeout: '30',
      ocrCacheDuration: '30',
      ocrRateLimit: '100',
      ocrLogRequests: 'true',
      ocrSecureMode: 'true',
      ocrSpaceEnabled: 'true',
      ocrSpaceApiKey: process.env.OCR_SPACE_API_KEY || '',
      ocrSpaceEndpoint: process.env.OCR_SPACE_ENDPOINT || 'https://api.ocr.space/parse/image',
      geminiOcrEnabled: 'true',
      freeOcrAiEnabled: 'false'
    }

    const allSettings = { ...defaultSettings, ...settingsObject }

    return NextResponse.json({ success: true, data: allSettings })
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid settings data' },
        { status: 400 }
      )
    }

    // Update or create each setting
    const updatePromises = Object.entries(settings).map(async ([key, value]) => {
      return prisma.adminSettings.upsert({
        where: { key },
        update: { 
          value: String(value),
          updatedAt: new Date()
        },
        create: {
          key,
          value: String(value),
          description: getSettingDescription(key)
        }
      })
    })

    await Promise.all(updatePromises)

    // Invalidate settings cache after update
    CacheService.invalidate('admin-settings')

    return NextResponse.json({ success: true, message: 'Settings updated successfully' })
  } catch (error: any) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getSettingDescription(key: string): string {
  const descriptions: Record<string, string> = {
    maintenanceMode: 'Enable or disable maintenance mode for the website',
    openaiApiKey: 'OpenAI API key for AI content generation and source finding',
    geminiApiKey: 'Google Gemini API key for AI content generation and source finding',
    deepseekApiKey: 'DeepSeek API key for AI content generation and source finding (via OpenRouter)',
    defaultAiProvider: 'Default AI provider for content generation (openai, gemini, or deepseek)',
    openaiModel: 'OpenAI model to use (e.g., gpt-4o, gpt-3.5-turbo)',
    geminiModel: 'Gemini model to use (e.g., gemini-2.5-pro, gemini-2.0-flash-exp)',
    deepseekModel: 'DeepSeek model to use (e.g., deepseek-chat-v3, deepseek-chat-v3-0324)',
    maintenanceMessage: 'Message displayed to users during maintenance mode',
    siteName: 'Name of the website displayed in headers and titles',
    allowedMaintenanceEmails: 'Email addresses that can access the site during maintenance (comma-separated)'
  }
  
  return descriptions[key] || `Configuration setting: ${key}`
}