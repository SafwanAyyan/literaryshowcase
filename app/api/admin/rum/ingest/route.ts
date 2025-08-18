import { NextRequest, NextResponse } from "next/server"
import { RumStore, type RumMetricName, type RumEvent } from "@/lib/rum-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type IncomingEvent = {
  name: RumMetricName
  value: number
  path?: string
  ts?: number
  navType?: string
  conn?: string
  ua?: string
}

type SanitizedEvent = Omit<RumEvent, "device"> & { ua?: string }

const allowed: Record<RumMetricName, true> = {
  LCP: true,
  CLS: true,
  INP: true,
  FCP: true,
  TTFB: true,
}

function sanitize(ev: IncomingEvent, ua: string | null): SanitizedEvent | null {
  if (!ev || !allowed[ev.name]) return null

  // Clamp values for sanity
  let value = Number(ev.value)
  if (!Number.isFinite(value)) return null
  switch (ev.name) {
    case "CLS":
      // CLS is unitless; typical <= 1.0
      value = Math.max(0, Math.min(2, value))
      break
    default:
      // Times in ms; clamp to 120s
      value = Math.max(0, Math.min(120_000, value))
  }

  // Path only; strip origin if mistakenly sent
  let path = ev.path || "/"
  try {
    // If it's a full URL, reduce to path + search
    const url = new URL(path, "http://local")
    path = url.pathname + (url.search || "")
  } catch {
    // ensure starts with /
    if (!path.startsWith("/")) path = "/" + path
  }

  // Privacy: never accept arbitrary strings beyond UA; drop navType if too long
  const navType = typeof ev.navType === "string" ? ev.navType.slice(0, 32) : undefined
  const conn = typeof ev.conn === "string" ? ev.conn.slice(0, 16) : undefined

  const ts = ev.ts && Number.isFinite(ev.ts) ? Math.max(0, Math.min(ev.ts, Date.now())) : Date.now()

  const out: SanitizedEvent = {
    name: ev.name,
    value,
    path, // required now
    ts,
    navType,
    conn,
    ua: ua || undefined,
  }
  return out
}

export async function OPTIONS() {
  // Permissive CORS for beacon usage (can be tightened if served same-origin only)
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent")
    const contentType = req.headers.get("content-type") || ""

    // Support sendBeacon with application/json
    let body: any = null
    if (contentType.includes("application/json")) {
      body = await req.json()
    } else if (contentType.includes("text/plain")) {
      // Some beacons might send text/plain JSON
      const txt = await req.text()
      try {
        body = JSON.parse(txt)
      } catch {
        body = null
      }
    }

    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 })
    }

    // Sampling (client may request 0..1, server enforces an upper bound)
    const sampleRate = typeof body.sampleRate === "number" ? Math.max(0, Math.min(1, body.sampleRate)) : 0.15
    const roll = Math.random()
    if (roll > sampleRate) {
      return NextResponse.json({ success: true, sampledOut: true }, {
        headers: { "Cache-Control": "no-store" },
      })
    }

    // Accept single or batch
    const events: IncomingEvent[] = Array.isArray(body.events) ? body.events : Array.isArray(body) ? body : [body]
    if (!events.length) {
      return NextResponse.json({ success: false, error: "No events" }, { status: 400 })
    }

    const sanitized: SanitizedEvent[] = []
    // Hard cap per request to avoid abuse
    const cap = Math.min(events.length, 100)
    for (let i = 0; i < cap; i++) {
      const s = sanitize(events[i], ua)
      if (s) sanitized.push(s)
    }
    if (sanitized.length === 0) {
      return NextResponse.json({ success: false, error: "No valid events" }, { status: 400 })
    }

    RumStore.addMany(sanitized)

    return NextResponse.json(
      { success: true, accepted: sanitized.length, sampleRate },
      { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } }
    )
  } catch (err) {
    console.error("[RUM] ingest error", err)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}