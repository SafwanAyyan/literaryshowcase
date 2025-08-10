"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Headphones, PlayCircle, ChevronRight } from 'lucide-react'

export default function ShakespeareGuide() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ devices: string; notes: string; audio: boolean; video: boolean } | null>(null)
  const [step, setStep] = useState(0)
  useEffect(() => {
    fetch('/authors/shakespeare').then(r=>r.json()).then(j=>{ if (j.success) setData(j.data) }).finally(()=> setLoading(false))
  }, [])

  const steps = [
    {
      id: 'intro',
      title: 'William Shakespeare — Orientation',
      body: (
        <p className="text-gray-300">Shakespeare (1564–1616) transformed English drama and poetry with a living language, human psychology, and extraordinary range. In this short lesson, you’ll listen to a quick orientation, explore literary devices in Hamlet, then scan a scene‑by‑scene brief.</p>
      )
    },
    {
      id: 'audio',
      title: 'Listen: Shakespeare orientation',
      body: (
        data?.audio ? (
          <audio controls className="w-full"><source src="/authors/shakespeare/audio" type="audio/mpeg" />Your browser does not support audio.</audio>
        ) : <p className="text-gray-300">Audio not found.</p>
      )
    },
    {
      id: 'devices',
      title: 'Hamlet — Literary Devices',
      body: (
        <pre className="whitespace-pre-wrap text-sm text-white leading-relaxed">{data?.devices || 'No content'}</pre>
      )
    },
    {
      id: 'notes',
      title: 'Hamlet — Key Scenes (AP-style briefs)',
      body: (
        <pre className="whitespace-pre-wrap text-sm text-white leading-relaxed">{data?.notes || 'No content'}</pre>
      )
    },
    {
      id: 'video',
      title: 'Watch: Hamlet Recap',
      body: (
        data?.video ? (
          <video controls className="w-full rounded-lg"><source src="/authors/shakespeare/video" type="video/mp4" />Your browser does not support video.</video>
        ) : <p className="text-gray-300">Video not found.</p>
      )
    },
  ]

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-300">Loading…</div>

  const s = steps[step]
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="glass-card p-6 md:p-8">
          <div className="flex items-center gap-3 text-white mb-4">
            <BookOpen className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-semibold">Shakespeare Learning Path</h1>
              <p className="text-gray-300 text-sm">Interactive orientation → devices → scene briefs → recap</p>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
              <h2 className="text-xl text-white mb-2">{s.title}</h2>
              <div>{s.body}</div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-between">
            <button onClick={()=> setStep(Math.max(0, step-1))} disabled={step===0} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 disabled:opacity-50">Previous</button>
            <div className="text-gray-400 text-sm">Step {step+1} of {steps.length}</div>
            <button onClick={()=> setStep(Math.min(steps.length-1, step+1))} disabled={step===steps.length-1} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 disabled:opacity-50 inline-flex items-center gap-2">Next <ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="text-center">
          <Link href="/guides" className="text-gray-300 hover:text-white">Back to Guides</Link>
        </div>
      </div>
    </main>
  )
}


