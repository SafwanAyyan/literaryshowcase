import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { apiLimiter } from '@/lib/rate-limit'

const secret = process.env.NEXTAUTH_SECRET

// Enhanced in-memory cache for maintenance status
let maintenanceCache: {
  enabled: boolean
  lastCheck: number
  allowedEmails: string
} = {
  enabled: false,
  lastCheck: 0,
  allowedEmails: ''
}

const CACHE_DURATION = 60000

async function isMaintenanceModeEnabled(): Promise<{ enabled: boolean; allowedEmails: string }> {
  const now = Date.now()

  if (now - maintenanceCache.lastCheck < CACHE_DURATION) {
    return {
      enabled: maintenanceCache.enabled,
      allowedEmails: maintenanceCache.allowedEmails
    }
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/maintenance-status`, {
      cache: 'no-store'
    })
    const result = await response.json()

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
    // Fallback to environment variable
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

function isEmailAllowedDuringMaintenance(email: string, allowedEmails: string): boolean {
  const emailList = allowedEmails.split(',').map(e => e.trim().toLowerCase())
  return emailList.includes(email.toLowerCase())
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Rate Limiting (API routes only)
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const isAllowed = apiLimiter.check(ip)

    if (!isAllowed) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }
  }

  // Skip further checks for API, static files, etc.
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

  // 2. Maintenance Mode Check
  const maintenanceStatus = await isMaintenanceModeEnabled()

  if (maintenanceStatus.enabled) {
    const isAdmin = await isUserAdmin(request)

    if (isAdmin && pathname.startsWith('/admin')) {
      return NextResponse.next()
    }

    try {
      const token = await getToken({
        req: request,
        secret,
        secureCookie: process.env.NODE_ENV === 'production'
      })

      if (token?.email && isEmailAllowedDuringMaintenance(token.email, maintenanceStatus.allowedEmails)) {
        return NextResponse.next()
      }
    } catch { }

    if (pathname.startsWith('/admin')) {
      return NextResponse.next()
    }

    if (pathname !== '/maintenance') {
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}