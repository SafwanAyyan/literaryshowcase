import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check actual environment variable status
    const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true'
    const allowedEmails = process.env.ALLOWED_MAINTENANCE_EMAILS || process.env.ADMIN_EMAIL || ''

    return NextResponse.json({
      success: true,
      data: {
        maintenanceMode: isMaintenanceMode ? 'true' : 'false',
        allowedEmails
      }
    })
  } catch (error: any) {
    console.error('Error checking maintenance status:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}