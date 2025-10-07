import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { RumStore } from "@/lib/rum-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const windowMs = Math.max(60_000, Math.min(7 * 24 * 60 * 60 * 1000, parseInt(searchParams.get("windowMs") || "86400000", 10)))
    const pathPrefix = searchParams.get("pathPrefix") || undefined

    const data = RumStore.dataWithin(windowMs)
    const filtered = pathPrefix ? data.filter((e) => e.path?.startsWith(pathPrefix)) : data

    // Summaries
    const overall = summarizeByName(filtered)
    const byPath = summarizeByKey(filtered, (e) => e.path || "/")
    const byDevice = summarizeByKey(filtered, (e) => e.device || "unknown")

    return NextResponse.json({
      success: true,
      data: {
        windowMs,
        count: filtered.length,
        overall,
        byPath,
        byDevice,
        generatedAt: new Date().toISOString(),
      },
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (err) {
    console.error("[RUM] summary error", err)
    return NextResponse.json({ success: false, error: "Failed to build summary" }, { status: 500 })
  }
}

// Helpers
type Name = "LCP" | "CLS" | "INP" | "FCP" | "TTFB"
type Summary = { count: number; p50: number | null; p75: number | null; p95: number | null }

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]
}
function summarize(values: number[]): Summary {
  const arr = values.slice().sort((a, b) => a - b)
  return { count: arr.length, p50: percentile(arr, 50), p75: percentile(arr, 75), p95: percentile(arr, 95) }
}
function summarizeByName(events: ReturnType<typeof RumStore.dataWithin>) {
  const buckets: Record<Name, number[]> = { LCP: [], CLS: [], INP: [], FCP: [], TTFB: [] }
  for (const e of events) buckets[e.name].push(e.value)
  const out: Record<Name, Summary> = {
    LCP: summarize(buckets.LCP),
    CLS: summarize(buckets.CLS),
    INP: summarize(buckets.INP),
    FCP: summarize(buckets.FCP),
    TTFB: summarize(buckets.TTFB),
  }
  return out
}
function summarizeByKey<T extends string>(
  events: ReturnType<typeof RumStore.dataWithin>,
  keyFn: (e: any) => T
): Record<T, Record<Name, Summary>> {
  const map = new Map<T, Record<Name, number[]>>()
  for (const e of events) {
    const k = keyFn(e)
    if (!map.has(k)) map.set(k, { LCP: [], CLS: [], INP: [], FCP: [], TTFB: [] })
    map.get(k)![e.name].push(e.value)
  }
  const out = {} as Record<T, Record<Name, Summary>>
  for (const [k, vals] of map.entries()) {
    out[k] = {
      LCP: summarize(vals.LCP),
      CLS: summarize(vals.CLS),
      INP: summarize(vals.INP),
      FCP: summarize(vals.FCP),
      TTFB: summarize(vals.TTFB),
    }
  }
  return out
}