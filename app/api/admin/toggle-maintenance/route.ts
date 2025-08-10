import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

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
    const { enabled, allowedEmails } = body

    // Update maintenance mode in database
    try {
      // Update maintenance mode setting
      await prisma.adminSettings.upsert({
        where: { key: 'maintenanceMode' },
        update: { value: enabled ? 'true' : 'false' },
        create: { 
          key: 'maintenanceMode', 
          value: enabled ? 'true' : 'false',
          description: 'Controls whether the website is in maintenance mode'
        }
      })

      // Update allowed emails setting if provided
      if (allowedEmails !== undefined) {
        await prisma.adminSettings.upsert({
          where: { key: 'allowedMaintenanceEmails' },
          update: { value: allowedEmails },
          create: { 
            key: 'allowedMaintenanceEmails', 
            value: allowedEmails,
            description: 'Comma-separated list of emails allowed during maintenance'
          }
        })
      }

      return NextResponse.json({ 
        success: true, 
        message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully!`
      })
    } catch (error: any) {
      console.error('Error updating maintenance mode:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update maintenance mode settings' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error toggling maintenance mode:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}