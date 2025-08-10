import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const secret = process.env.NEXTAUTH_SECRET

// Enhanced in-memory cache for maintenance status (resets on server restart)
let maintenanceCache: {
  enabled: boolean
  lastCheck: number
  allowedEmails: string
} = {
  enabled: false,
  lastCheck: 0,
  allowedEmails: ''
}

const CACHE_DURATION = 60000 // 60 seconds (increased from 30s for better performance)

// Helper function to check if maintenance mode is enabled
async function isMaintenanceModeEnabled(): Promise<{ enabled: boolean; allowedEmails: string }> {
  const now = Date.now()
  
  // Check cache first
  if (now - maintenanceCache.lastCheck < CACHE_DURATION) {
    return {
      enabled: maintenanceCache.enabled,
      allowedEmails: maintenanceCache.allowedEmails
    }
  }

  try {
    // Check database via API (more reliable than env variables)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/maintenance-status`, {
      cache: 'no-store'
    })
    const result = await response.json()
    
    // Update cache
    maintenanceCache = {
      enabled: result.maintenanceMode === true,
      lastCheck: now,
      allowedEmails: result.allowedEmails || ''
    }
    
    return {
      enabled: maintenanceCache.enabled,
      allowedEmails: maintenanceCache.allowedEmails
    }
  } catch (error) {
    console.error('Error checking maintenance status:', error)
    // Fallback to environment variable if API fails
    const envMaintenance = process.env.MAINTENANCE_MODE === 'true'
    const allowedEmails = process.env.ALLOWED_MAINTENANCE_EMAILS || process.env.ADMIN_EMAIL || ''
    
    maintenanceCache = {
      enabled: envMaintenance,
      lastCheck: now,
      allowedEmails
    }
    
    return {
      enabled: envMaintenance,
      allowedEmails
    }
  }
}

// Helper function to check if user is an admin
async function isUserAdmin(request: NextRequest): Promise<boolean> {
  try {
    const token = await getToken({ 
      req: request, 
      secret,
      secureCookie: process.env.NODE_ENV === 'production'
    })
    
    return token?.role === 'admin'
  } catch {
    return false
  }
}

// Helper function to check if email is in allowed maintenance emails
function isEmailAllowedDuringMaintenance(email: string, allowedEmails: string): boolean {
  const emailList = allowedEmails.split(',').map(e => e.trim().toLowerCase())
  return emailList.includes(email.toLowerCase())
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for API routes, static files, and certain paths
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') ||
    pathname === '/maintenance' ||
    pathname.startsWith('/admin/login')
  ) {
    return NextResponse.next()
  }

  // Lightweight pageview/visit counter for admin metrics
  let response = NextResponse.next()
  try {
    // Count all real pages (including admin), skip static and API
    const isPage = !pathname.startsWith('/api/') && !pathname.startsWith('/_next/') && !pathname.includes('.')
    if (isPage) {
      const now = new Date()
      const today = now.toISOString().slice(0, 10)
      const hourKey = now.toISOString().slice(0, 13) // YYYY-MM-DDTHH
      const origin = request.nextUrl.origin || process.env.NEXTAUTH_URL || 'http://localhost:3000'
      // Record a pageview at most once per hour per client
      const pvCookieName = `pv_${hourKey}`
      const hasPv = request.cookies.get(pvCookieName)
      if (!hasPv) {
        fetch(`${origin}/api/admin/metrics/ingest`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: today, type: 'pageview' })
        }).catch(() => {})
        response.cookies.set(pvCookieName, '1', {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 // 1 hour
        })
      }

      // Record a visit once per day via cookie guard
      const visitCookieName = `v_${today}`
      const hasVisit = request.cookies.get(visitCookieName)
      if (!hasVisit) {
        fetch(`${origin}/api/admin/metrics/ingest`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: today, type: 'visit' })
        }).catch(() => {})
        response.cookies.set(visitCookieName, '1', {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 // 1 day
        })
      }
    }
  } catch {}

  // Check if maintenance mode is enabled
  const maintenanceStatus = await isMaintenanceModeEnabled()
  
  if (maintenanceStatus.enabled) {
    const isAdmin = await isUserAdmin(request)
    
    // Allow admins to bypass maintenance mode (only for /admin routes)
    if (isAdmin && pathname.startsWith('/admin')) {
      return NextResponse.next()
    }

    // Check if user email is in the allowed list
    try {
      const token = await getToken({ 
        req: request, 
        secret,
        secureCookie: process.env.NODE_ENV === 'production'
      })
      
      if (token?.email && isEmailAllowedDuringMaintenance(token.email, maintenanceStatus.allowedEmails)) {
        return NextResponse.next()
      }
    } catch {
      // Continue to maintenance page if token check fails
    }

    // Allow access to admin routes for authentication
    if (pathname.startsWith('/admin')) {
      return NextResponse.next()
    }

    // Redirect all other users to maintenance page
    if (pathname !== '/maintenance') {
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
}