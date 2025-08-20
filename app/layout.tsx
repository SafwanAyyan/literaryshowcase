import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { NextAuthProvider } from '@/components/providers/session-provider'
import { RouteProgress } from '@/components/route-progress'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import RumReporter from '@/components/rum-reporter'
 
export const metadata: Metadata = {
  title: 'Literary Showcase',
  description: 'A website for showcasing and collecting all sorts of literary writings. Made by Safwan and Fateen.',
  generator: 'Safwan and Fateen.',
}
 
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/placeholder-logo.svg" />
        <link rel="manifest" href="/manifest.json" />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <NextAuthProvider>
          <RouteProgress />
          <RumReporter sampleRate={0.2} />
          {/* Screen-reader live region for loading/toast announcements */}
          <div id="sr-status" aria-live="polite" aria-atomic="true" className="sr-only" />
          {children}
          {/* Accessible toast system (re-uses react-hot-toast already in project) */}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#111827',
                color: '#fff',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
              },
              className: 'text-sm',
            }}
          />
        </NextAuthProvider>
      </body>
    </html>
  )
}
