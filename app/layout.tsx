import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { NextAuthProvider } from '@/components/providers/session-provider'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { RouteProgress } from '@/components/route-progress'
import './globals.css'

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
          {children}
          <SpeedInsights />
        </NextAuthProvider>
      </body>
    </html>
  )
}
