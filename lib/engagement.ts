import crypto from 'crypto'
import type { NextRequest } from 'next/server'

const APP_SECRET = process.env.NEXTAUTH_SECRET || process.env.APP_SECRET || 'dev-secret-change-me'

// Short-term in-memory throttle (per process)
const recentViews = new Map<string, number>() // key: `${id}:${ip}` -> timestamp
const recentLikes = new Map<string, number>() // key: `${id}:${ip}` -> timestamp

const VIEW_COOLDOWN_MS = 30 * 1000 // 30s server-side cooldown per ip+item
const COOKIE_VIEW_TTL_HOURS = 12

export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for') || ''
  const ip = xff.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '0.0.0.0'
  return ip
}

function hmacSign(value: string): string {
  return crypto.createHmac('sha256', APP_SECRET).update(value).digest('hex')
}

export function makeSignedCookie(name: string, value: string, maxAgeSeconds: number): string {
  const sig = hmacSign(`${name}.${value}`)
  const encoded = Buffer.from(`${value}.${sig}`).toString('base64')
  return `${name}=${encoded}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax;${process.env.NODE_ENV === 'production' ? ' Secure;' : ''}`
}

export function readSignedCookie(request: NextRequest, name: string): string | null {
  const raw = request.headers.get('cookie') || ''
  const match = raw.match(new RegExp(`${name}=([^;]+)`))
  if (!match) return null
  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf8')
    const [value, sig] = decoded.split('.')
    if (!value || !sig) return null
    const expected = hmacSign(`${name}.${value}`)
    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return value
    }
    return null
  } catch {
    return null
  }
}

export function shouldCountView(request: NextRequest, contentId: string): { allow: boolean; setCookie?: string } {
  const ip = getClientIp(request)
  const key = `${contentId}:${ip}`
  const now = Date.now()

  // Server-side short cooldown (protect burst)
  const last = recentViews.get(key) || 0
  if (now - last < VIEW_COOLDOWN_MS) {
    return { allow: false }
  }

  // Cookie-based long window per device
  const cookieName = `v_${contentId}`
  const existing = readSignedCookie(request, cookieName)
  if (existing === '1') {
    // Already viewed within cookie TTL
    recentViews.set(key, now)
    return { allow: false }
  }

  // Allow and set cookies
  recentViews.set(key, now)
  const setCookie = makeSignedCookie(cookieName, '1', COOKIE_VIEW_TTL_HOURS * 3600)
  return { allow: true, setCookie }
}

export function shouldToggleLike(request: NextRequest, contentId: string): { like: boolean; setCookie?: string; clearCookie?: string } {
  const ip = getClientIp(request)
  const key = `${contentId}:${ip}`
  const now = Date.now()

  const last = recentLikes.get(key) || 0
  if (now - last < 1000) {
    // basic debounce to avoid double-click races
    return { like: false }
  }
  recentLikes.set(key, now)

  const cookieName = `l_${contentId}`
  const hadLike = readSignedCookie(request, cookieName) === '1'
  if (hadLike) {
    // Unlike
    // Clear cookie by setting Max-Age=0
    return { like: false, clearCookie: `${cookieName}=; Path=/; Max-Age=0; SameSite=Lax;${process.env.NODE_ENV === 'production' ? ' Secure;' : ''}` }
  }
  // Like and set cookie
  return { like: true, setCookie: makeSignedCookie(cookieName, '1', 365 * 24 * 3600) }
}


