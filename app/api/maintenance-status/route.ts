import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get maintenance mode setting from database
    const maintenanceSetting = await prisma.adminSettings.findUnique({
      where: { key: 'maintenanceMode' }
    })

    const isMaintenanceMode = maintenanceSetting?.value === 'true'

    // Get maintenance message and allowed emails
    const messageSetting = await prisma.adminSettings.findUnique({
      where: { key: 'maintenanceMessage' }
    })

    const emailsSetting = await prisma.adminSettings.findUnique({
      where: { key: 'allowedMaintenanceEmails' }
    })

    return NextResponse.json({
      maintenanceMode: isMaintenanceMode,
      message: messageSetting?.value || 'The Literary Showcase is currently undergoing maintenance. Please check back soon!',
      allowedEmails: emailsSetting?.value || process.env.ADMIN_EMAIL || ''
    })
  } catch (error) {
    console.error('Error checking maintenance status:', error)
    // Return false by default if there's an error
    return NextResponse.json({
      maintenanceMode: false,
      message: 'The Literary Showcase is currently undergoing maintenance. Please check back soon!',
      allowedEmails: process.env.ADMIN_EMAIL || ''
    })
  }
}