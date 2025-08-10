"use client"

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Download, FileText, ChevronRight } from 'lucide-react'

const steps = [
  {
    id: 'overview',
    title: 'Welcome to English Literature',
    content: `A gentle orientation to the landscape: movements, genres, and what we mean by theme, voice, and form. This guide is interactive — click Next to explore at your pace.`,
  },
  {
    id: 'periods',
    title: 'Major Periods & Movements',
    content: `From the Renaissance to Modernism and beyond. We’ll sketch the spirit of each period and what to notice in the writing.`,
  },
  {
    id: 'forms',
    title: 'Forms: Poems, Plays, Essays',
    content: `How to approach different forms: what makes a sonnet tick? Why stage directions matter in drama? Reading strategies that stick.`,
  },
  {
    id: 'devices',
    title: 'Literary Devices — Learn & Reference',
    content: `Metaphor, metonymy, anaphora, caesura and more. Study the beautifully formatted reference PDF, or download it for later.`,
    pdf: '/guides/devices',
  },
]

export default function GuidesPage() {
  const [index, setIndex] = useState(0)
  const step = steps[index]

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 mb-4">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Beginner’s Guide to English Literature</h1>
          <p className="text-gray-300 mt-2 max-w-2xl mx-auto">Click through a short orientation, explore literary devices, and download references. When you’re ready, you can jump to authors later.</p>
        </motion.div>

        <div className="glass-card p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={step.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-3">{step.title}</h2>
              <p className="text-gray-300 leading-relaxed">{step.content}</p>

              {step.pdf && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link href={step.pdf} target="_blank" className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 inline-flex items-center gap-2">
                    <FileText className="w-4 h-4" /> View devices reference
                  </Link>
                  <Link href={`${step.pdf}?download=1`} className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white inline-flex items-center gap-2">
                    <Download className="w-4 h-4" /> Download PDF
                  </Link>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between">
            <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 disabled:opacity-50">Previous</button>
            <div className="text-gray-400 text-sm">Step {index + 1} of {steps.length}</div>
            <button onClick={() => setIndex(Math.min(steps.length - 1, index + 1))} disabled={index === steps.length - 1} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 disabled:opacity-50 inline-flex items-center gap-2">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Authors & Explanations */}
        <section className="mt-8">
          <h3 className="text-white text-2xl font-semibold mb-4">Writers & Explanations</h3>
          <p className="text-gray-300 mb-4">Explore focused lessons that combine summaries, devices, audio, and video for key writers.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/authors/shakespeare" className="glass-card p-5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold">William Shakespeare</div>
                  <div className="text-gray-300 text-sm">Interactive orientation • Hamlet devices • scene briefs • audio • video recap</div>
                </div>
              </div>
              <div className="text-gray-300 text-sm">Start the Shakespeare path and learn through concise, modern steps.</div>
              <div className="mt-3 inline-flex items-center gap-1 text-white/90">Start <ChevronRight className="w-4 h-4" /></div>
            </Link>
            <Link href="/authors/dostoevsky" className="glass-card p-5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold">Fyodor Dostoevsky</div>
                  <div className="text-gray-300 text-sm">Overview • Crime and Punishment — summary, themes • recap video</div>
                </div>
              </div>
              <div className="text-gray-300 text-sm">Explore psychological depth, morality, suffering, and redemption through interactive steps.</div>
              <div className="mt-3 inline-flex items-center gap-1 text-white/90">Start <ChevronRight className="w-4 h-4" /></div>
            </Link>
          </div>
        </section>

        <div className="mt-8 text-center">
          <Link href="/" className="text-gray-300 hover:text-white">Return to collection</Link>
        </div>
      </div>
    </main>
  )
}


