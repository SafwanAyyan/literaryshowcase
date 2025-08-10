"use client"

import Link from 'next/link'
import { Download, FileText } from 'lucide-react'

export default function DevicesViewer() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="glass-card p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <FileText className="w-5 h-5" />
            <div>
              <h1 className="text-xl font-semibold">Literary Devices Reference</h1>
              <p className="text-gray-300 text-sm">View inside the site or download a copy</p>
            </div>
          </div>
          <Link href="/guides/devices?download=1" className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white inline-flex items-center gap-2">
            <Download className="w-4 h-4" /> Download
          </Link>
        </div>

        <div className="glass-card p-2 overflow-hidden">
          <iframe src="/guides/devices" className="w-full h-[80vh] rounded-lg" title="Literary Devices PDF" />
        </div>

        <div className="text-center">
          <Link href="/guides" className="text-gray-300 hover:text-white">Back to Guides</Link>
        </div>
      </div>
    </main>
  )
}


