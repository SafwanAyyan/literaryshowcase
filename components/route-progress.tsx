"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

export function RouteProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const prevPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (prevPathRef.current !== null && prevPathRef.current !== pathname) {
      // On route change, show bar
      if (timerRef.current) clearTimeout(timerRef.current)
      setVisible(true)
      // Ensure bar is visible at least briefly
      timerRef.current = setTimeout(() => setVisible(false), 1200)
    }
    prevPathRef.current = pathname
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pathname])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 right-0 z-[60] h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms ease' }}
    >
      <div
        className="h-full w-full rounded-b-full"
        style={{
          background: 'linear-gradient(90deg, #7c3aed 0%, #db2777 50%, #7c3aed 100%)',
          filter: 'drop-shadow(0 4px 10px rgba(124,58,237,0.45))',
          animation: visible ? 'routeProgress 1.2s ease-in-out infinite' : 'none'
        }}
      />
      <style jsx global>{`
        @keyframes routeProgress {
          0% { transform: translateX(-30%); opacity: .7; }
          50% { transform: translateX(0%); opacity: 1; }
          100% { transform: translateX(30%); opacity: .7; }
        }
      `}</style>
    </div>
  )
}


