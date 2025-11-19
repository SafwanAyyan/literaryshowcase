"use client"

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function AnalyticsTracker() {
    const pathname = usePathname()

    useEffect(() => {
        // Skip if we're not in the browser
        if (typeof window === 'undefined') return

        // Skip admin routes and api routes to avoid noise
        if (pathname?.startsWith('/admin') || pathname?.startsWith('/api')) return

        const trackVisit = async () => {
            try {
                const now = new Date()
                const today = now.toISOString().slice(0, 10)
                const hourKey = now.toISOString().slice(0, 13) // YYYY-MM-DDTHH

                // Check local storage to avoid excessive API calls
                // We use localStorage instead of cookies for client-side tracking
                const lastPv = localStorage.getItem(`pv_${hourKey}`)
                const lastVisit = localStorage.getItem(`v_${today}`)

                if (!lastPv) {
                    // Record pageview
                    await fetch('/api/admin/metrics/ingest', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date: today, type: 'pageview' })
                    })
                    localStorage.setItem(`pv_${hourKey}`, '1')
                }

                if (!lastVisit) {
                    // Record visit
                    await fetch('/api/admin/metrics/ingest', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date: today, type: 'visit' })
                    })
                    localStorage.setItem(`v_${today}`, '1')
                }
            } catch (error) {
                // Silently fail for analytics
                console.error('Analytics error:', error)
            }
        }

        // Small delay to not block hydration
        const timeoutId = setTimeout(trackVisit, 2000)

        return () => clearTimeout(timeoutId)
    }, [pathname])

    return null
}
