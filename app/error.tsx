"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface runtime errors in dev console to avoid silent white screens
    // eslint-disable-next-line no-console
    console.error("[GlobalError]", error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
          <div className="glass-card p-8 max-w-md text-center">
            <h1 className="text-white text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-gray-300 mb-4">An unexpected error occurred. You can try again or return home.</p>
            <pre className="text-xs text-purple-200/80 whitespace-pre-wrap break-words max-h-48 overflow-auto">
              {error.message}
            </pre>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => reset()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1e1e1f] to-[#2a0a37] text-white hover:from-[#252526] hover:to-[#3a0f4d] transition-colors"
              >
                Try again
              </button>
              <a
                href="/"
                className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/15 transition-colors"
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}