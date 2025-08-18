/**
 * Lightweight in-memory RUM store for Core Web Vitals and related metrics.
 * - No DB migration required
 * - Percentile summaries (p50/p75/p95)
 * - Breakdown by path and device class
 * - Simple retention policy (time + max size)
 *
 * Note: This lives in-memory per server instance. For multi-region or serverless,
 * plug a durable store (e.g., Redis) behind the same interface.
 */

export type RumMetricName = "LCP" | "CLS" | "INP" | "FCP" | "TTFB"

export type DeviceClass = "mobile" | "desktop" | "tablet" | "unknown"

export interface RumEvent {
  name: RumMetricName
  // Store values as numbers; CLS is unitless (0.0..), others in ms
  value: number
  rating?: "good" | "needs-improvement" | "poor"
  path: string // only pathname + optional search (no PII)
  ts: number
  navType?: string
  conn?: string // effectiveType e.g., '4g'
  device?: DeviceClass
  ua?: string // user agent (optional, can be omitted for privacy)
}

type RumSummary = {
  count: number
  p50: number | null
  p75: number | null
  p95: number | null
}

type RumSummaryByKey = Record<string, RumSummary>

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]
}

function summarize(values: number[]): RumSummary {
  const arr = values.slice().sort((a, b) => a - b)
  return {
    count: arr.length,
    p50: percentile(arr, 50),
    p75: percentile(arr, 75),
    p95: percentile(arr, 95),
  }
}

function deviceFromUA(ua: string | undefined): DeviceClass {
  if (!ua) return "unknown"
  const s = ua.toLowerCase()
  if (/(ipad|tablet)/.test(s)) return "tablet"
  if (/(mobi|iphone|android)/.test(s)) return "mobile"
  if (/(macintosh|windows|linux|cros)/.test(s)) return "desktop"
  return "unknown"
}

export class RumStore {
  // Single process store
  private static buf: RumEvent[] = []
  private static MAX = 10000
  private static WINDOW_MS = 24 * 60 * 60 * 1000 // 24h

  static add(ev: Omit<RumEvent, "device"> & { ua?: string }): void {
    const now = Date.now()
    const item: RumEvent = {
      ...ev,
      device: deviceFromUA(ev.ua),
      ts: ev.ts || now,
    }
    this.buf.push(item)
    if (this.buf.length > this.MAX) {
      this.buf.splice(0, this.buf.length - this.MAX)
    }
    this.prune()
  }

  static addMany(evs: (Omit<RumEvent, "device"> & { ua?: string })[]): void {
    for (const ev of evs) this.add(ev)
  }

  static prune(): void {
    const cutoff = Date.now() - this.WINDOW_MS
    if (this.buf.length === 0) return
    // Fast path: drop from front while old
    let firstFreshIdx = 0
    for (let i = 0; i < this.buf.length; i++) {
      if (this.buf[i].ts >= cutoff) {
        firstFreshIdx = i
        break
      }
    }
    if (firstFreshIdx > 0) {
      this.buf = this.buf.slice(firstFreshIdx)
    }
  }

  static dataWithin(ms = this.WINDOW_MS): RumEvent[] {
    const cutoff = Date.now() - ms
    return this.buf.filter((e) => e.ts >= cutoff)
  }

  static overallSummary(): Record<RumMetricName, RumSummary> {
    const out: any = {}
    const byName: Record<RumMetricName, number[]> = { LCP: [], CLS: [], INP: [], FCP: [], TTFB: [] }
    for (const e of this.dataWithin()) {
      byName[e.name].push(e.value)
    }
    (Object.keys(byName) as RumMetricName[]).forEach((k) => (out[k] = summarize(byName[k])))
    return out
  }

  static byPathSummary(): Record<string, Record<RumMetricName, RumSummary>> {
    const out: Record<string, Record<RumMetricName, RumSummary>> = {}
    const recent = this.dataWithin()
    const paths = new Map<string, Record<RumMetricName, number[]>>()
    for (const e of recent) {
      const key = e.path || "/"
      if (!paths.has(key)) {
        paths.set(key, { LCP: [], CLS: [], INP: [], FCP: [], TTFB: [] })
      }
      paths.get(key)![e.name].push(e.value)
    }
    for (const [path, vals] of paths) {
      const perMetric: any = {}
      ;(Object.keys(vals) as RumMetricName[]).forEach((k) => (perMetric[k] = summarize(vals[k])))
      out[path] = perMetric
    }
    return out
  }

  static byDeviceSummary(): Record<DeviceClass, Record<RumMetricName, RumSummary>> {
    const out: Record<DeviceClass, Record<RumMetricName, RumSummary>> = {
      mobile: { LCP: { count: 0, p50: null, p75: null, p95: null }, CLS: { count: 0, p50: null, p75: null, p95: null }, INP: { count: 0, p50: null, p75: null, p95: null }, FCP: { count: 0, p50: null, p75: null, p95: null }, TTFB: { count: 0, p50: null, p75: null, p95: null } },
      desktop: { LCP: { count: 0, p50: null, p75: null, p95: null }, CLS: { count: 0, p50: null, p75: null, p95: null }, INP: { count: 0, p50: null, p75: null, p95: null }, FCP: { count: 0, p50: null, p75: null, p95: null }, TTFB: { count: 0, p50: null, p75: null, p95: null } },
      tablet: { LCP: { count: 0, p50: null, p75: null, p95: null }, CLS: { count: 0, p50: null, p75: null, p95: null }, INP: { count: 0, p50: null, p75: null, p95: null }, FCP: { count: 0, p50: null, p75: null, p95: null }, TTFB: { count: 0, p50: null, p75: null, p95: null } },
      unknown: { LCP: { count: 0, p50: null, p75: null, p95: null }, CLS: { count: 0, p50: null, p75: null, p95: null }, INP: { count: 0, p50: null, p75: null, p95: null }, FCP: { count: 0, p50: null, p75: null, p95: null }, TTFB: { count: 0, p50: null, p75: null, p95: null } },
    }
    const buckets: Record<DeviceClass, Record<RumMetricName, number[]>> = {
      mobile: { LCP: [], CLS: [], INP: [], FCP: [], TTFB: [] },
      desktop: { LCP: [], CLS: [], INP: [], FCP: [], TTFB: [] },
      tablet: { LCP: [], CLS: [], INP: [], FCP: [], TTFB: [] },
      unknown: { LCP: [], CLS: [], INP: [], FCP: [], TTFB: [] },
    }
    for (const e of this.dataWithin()) {
      const d = e.device || "unknown"
      buckets[d][e.name].push(e.value)
    }
    (Object.keys(buckets) as DeviceClass[]).forEach((dc) => {
      const sums: any = {}
      ;(Object.keys(buckets[dc]) as RumMetricName[]).forEach((k) => (sums[k] = summarize(buckets[dc][k])))
      out[dc] = sums
    })
    return out
  }
}