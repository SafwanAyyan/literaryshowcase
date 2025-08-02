import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

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
      defaultAiProvider: 'openai',
      maintenanceMessage: 'The Literary Showcase is currently undergoing maintenance. Please check back soon!',
      siteName: 'Literary Showcase',
      allowedMaintenanceEmails: process.env.ADMIN_EMAIL || 'admin@literaryshowcase.com'
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
    openaiApiKey: 'OpenAI API key for AI content generation',
    geminiApiKey: 'Google Gemini API key for AI content generation',
    defaultAiProvider: 'Default AI provider for content generation',
    maintenanceMessage: 'Message displayed to users during maintenance mode',
    siteName: 'Name of the website displayed in headers and titles',
    allowedMaintenanceEmails: 'Email addresses that can access the site during maintenance (comma-separated)'
  }
  
  return descriptions[key] || `Configuration setting: ${key}`
}