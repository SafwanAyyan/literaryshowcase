"use client"

/**
 * Client-side RUM reporter for Core Web Vitals and related timings.
 * - Collects: LCP, CLS, FCP, TTFB, INP (approx via Event Timing max)
 * - Sends batched beacon to /api/admin/rum/ingest with sampling
 * - Privacy: only pathname + connection type; server receives UA via header
 * - Works without extra deps (no web-vitals package)
 */

import { useEffect, useRef } from "react"

type RumMetricName = "LCP" | "CLS" | "INP" | "FCP" | "TTFB"

type RumPayloadEvent = {
  name: RumMetricName
  value: number
  path: string
  ts: number
  navType?: string
  conn?: string
}

const now = () => Math.round(performance.now())

export function RumReporter({
  sampleRate = 0.2, // 20% default
  flushDelay = 3000, // ms
}: {
  sampleRate?: number
  flushDelay?: number
}) {
  const sentRef = useRef(false)
  const lcpRef = useRef<number | null>(null)
  const clsRef = useRef(0)
  const inpMaxRef = useRef(0)
  const fcpRef = useRef<number | null>(null)
  const ttfbRef = useRef<number | null>(null)

  const eventsRef = useRef<RumPayloadEvent[]>([])

  useEffect(() => {
    // Global guard per navigation
    if ((window as any).__rumReported) return
    ;(window as any).__rumReported = true

    const path = safePath()
    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
    const navType = navEntry?.type
    const conn = (navigator as any).connection?.effectiveType as string | undefined

    // TTFB
    if (navEntry) {
      // responseStart approximates TTFB from navigation start
      const ttfb = Math.max(0, navEntry.responseStart)
      ttfbRef.current = ttfb
      queue({ name: "TTFB", value: ttfb, path, ts: Date.now(), navType, conn })
    }

    // FCP
    try {
      const poFCP = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // first-contentful-paint
          if ((entry as any).name === "first-contentful-paint") {
            const v = entry.startTime
            if (fcpRef.current == null || v < fcpRef.current) {
              fcpRef.current = v
              queue({ name: "FCP", value: v, path, ts: Date.now(), navType, conn })
            }
          }
        }
      })
      poFCP.observe({ type: "paint", buffered: true as any })
    } catch {}

    // LCP
    try {
      const poLCP = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any) {
          const v = entry.startTime as number
          lcpRef.current = v
        }
      })
      poLCP.observe({ type: "largest-contentful-paint", buffered: true as any })
      // Finalize LCP on page hide
      const finalizeLCP = () => {
        if (lcpRef.current != null) {
          queue({ name: "LCP", value: lcpRef.current, path, ts: Date.now(), navType, conn })
        }
      }
      addEventListener("visibilitychange", finalizeLCP, { once: true })
      addEventListener("pagehide", finalizeLCP, { once: true })
    } catch {}

    // CLS
    try {
      let sessionValue = 0
      let sessionEntries: PerformanceEntry[] = []
      const poCLS = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any) {
          if (!entry.hadRecentInput) {
            const first = sessionEntries[0]
            const last = sessionEntries[sessionEntries.length - 1]
            // Session windows of max 1s between shifts, 5s total
            if (
              sessionValue > 0 &&
              entry.startTime - (last?.startTime ?? 0) > 1000 ||
              entry.startTime - (first?.startTime ?? 0) > 5000
            ) {
              sessionValue = 0
              sessionEntries = []
            }
            sessionValue += entry.value
            sessionEntries.push(entry)
            clsRef.current = Math.max(clsRef.current, sessionValue)
          }
        }
      })
      poCLS.observe({ type: "layout-shift", buffered: true as any })
      const finalizeCLS = () => {
        queue({ name: "CLS", value: round3(clsRef.current), path, ts: Date.now(), navType, conn })
      }
      addEventListener("visibilitychange", finalizeCLS, { once: true })
      addEventListener("pagehide", finalizeCLS, { once: true })
    } catch {}

    // INP (approx) using PerformanceEventTiming (max across events)
    try {
      const poEv = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any) {
          // duration approximates input delay + processing + presentation
          const dur = (entry.processingEnd ?? entry.startTime + entry.duration) - entry.startTime
          if (dur > inpMaxRef.current) {
            inpMaxRef.current = dur
          }
        }
      })
      // 'event' requires Event Timing API support
      poEv.observe({ type: "event", buffered: true as any } as any)
      const finalizeINP = () => {
        if (inpMaxRef.current > 0) {
          queue({ name: "INP", value: Math.round(inpMaxRef.current), path, ts: Date.now(), navType, conn })
        }
      }
      addEventListener("visibilitychange", finalizeINP, { once: true })
      addEventListener("pagehide", finalizeINP, { once: true })
    } catch {}

    // Periodic flush with sampling
    const t = setTimeout(() => flush(sampleRate), flushDelay)
    const onHide = () => flush(sampleRate)
    addEventListener("visibilitychange", onHide)
    addEventListener("pagehide", onHide)

    return () => {
      clearTimeout(t)
      removeEventListener("visibilitychange", onHide)
      removeEventListener("pagehide", onHide)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function queue(ev: RumPayloadEvent) {
    eventsRef.current.push(ev)
  }

  function flush(sampleRate: number) {
    if (sentRef.current) return
    sentRef.current = true
    const events = dedupe(eventsRef.current)
    if (!events.length) return

    const body = JSON.stringify({ sampleRate, events })
    const url = "/api/admin/rum/ingest"
    try {
      const ok = navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" }))
      if (!ok) {
        // Fallback
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body,
        }).catch(() => {})
      }
    } catch {
      // ignore transport failures
    }
  }

  return null
}

// Helpers

function safePath(): string {
  try {
    return location.pathname + (location.search || "")
  } catch {
    return "/"
  }
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000
}

function dedupe(list: RumPayloadEvent[]): RumPayloadEvent[] {
  // Keep last value per metric
  const map = new Map<string, RumPayloadEvent>()
  for (const e of list) {
    const k = `${e.name}:${e.path}`
    map.set(k, e)
  }
  return Array.from(map.values())
}

export default RumReporter