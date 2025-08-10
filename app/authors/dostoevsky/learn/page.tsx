"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Home, Film } from 'lucide-react'

type Data = { bio: string; summary: string; themes: string; video: boolean }

export default function DostoevskyLearn() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Data | null>(null)
  const [tab, setTab] = useState<'overview'|'crime-summary'|'crime-themes'|'crime-video'>('overview')

  useEffect(() => {
    fetch('/authors/dostoevsky/data').then(r=>r.json()).then(j=>{ if (j.success) setData(j.data) }).finally(()=> setLoading(false))
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-300">Loading…</div>

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="glass-card p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-white">
              <BookOpen className="w-6 h-6" />
              <div>
                <h1 className="text-2xl font-semibold">Fyodor Dostoevsky</h1>
                <p className="text-gray-300 text-sm">Overview and Crime and Punishment</p>
              </div>
            </div>
            <Link href="/" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-gray-100 border border-white/10 transition-colors">
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={()=> setTab('overview')} className={`px-3 py-2 rounded-lg ${tab==='overview'?'bg-white/15 text-white':'bg-white/10 text-gray-200 hover:bg-white/15'}`}>Overview</button>
            <button onClick={()=> setTab('crime-summary')} className={`px-3 py-2 rounded-lg ${tab==='crime-summary'?'bg-white/15 text-white':'bg-white/10 text-gray-200 hover:bg-white/15'}`}>Crime & Punishment — Summary</button>
            <button onClick={()=> setTab('crime-themes')} className={`px-3 py-2 rounded-lg ${tab==='crime-themes'?'bg-white/15 text-white':'bg-white/10 text-gray-200 hover:bg-white/15'}`}>Crime & Punishment — Themes</button>
            <button onClick={()=> setTab('crime-video')} className={`px-3 py-2 rounded-lg ${tab==='crime-video'?'bg-white/15 text-white':'bg-white/10 text-gray-200 hover:bg-white/15'}`}>Recap Video</button>
          </div>

          <AnimatePresence mode="wait">
            {tab==='overview' && (
              <motion.div key="ov" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.25 }}>
                {renderBio(data?.bio || '')}
              </motion.div>
            )}
            {tab==='crime-summary' && (
              <motion.div key="cs" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.25 }}>
                <h3 className="text-white text-lg font-semibold mb-4">Crime and Punishment — Summary</h3>
                {renderSummaryInteractive(data?.summary || '')}
              </motion.div>
            )}
            {tab==='crime-themes' && (
              <motion.div key="ct" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.25 }}>
                <h3 className="text-white text-lg font-semibold mb-4">Crime and Punishment — Themes</h3>
                {renderThemes(data?.themes || '')}
              </motion.div>
            )}
            {tab==='crime-video' && (
              <motion.div key="cv" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.25 }}>
                <h3 className="text-white text-lg font-semibold mb-3">Crime and Punishment — Recap Video</h3>
                {data?.video ? (
                  <video controls className="w-full rounded-lg"><source src="/authors/dostoevsky/video" type="video/mp4" />Your browser does not support video.</video>
                ) : <p className="text-gray-300">Video not found.</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center">
          <Link href="/guides" className="text-gray-300 hover:text-white">Back to Guides</Link>
        </div>
      </div>
    </main>
  )
}

function renderBio(raw: string) {
  if (!raw) return (
    <div className="text-gray-300">Biography not found.</div>
  )
  // Split into sections by headings like "Early Life", "Education", "His Career", etc.
  const blocks = raw.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean)
  return (
    <div className="text-gray-300 leading-relaxed space-y-5">
      <p><span className="text-white font-medium">Fyodor Dostoevsky</span> (1821–1881) — Russian novelist of psychological depth and moral inquiry. Born in Moscow; educated in St. Petersburg; imprisoned and sent to a Siberian penal camp; later returned to produce major works that shaped world literature.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg bg-white/5 border border-white/10"><div className="text-white font-medium mb-1">Born</div><div>Nov 1821 — Moscow</div></div>
        <div className="p-4 rounded-lg bg-white/5 border border-white/10"><div className="text-white font-medium mb-1">Education</div><div>Military Engineering Academy, St. Petersburg</div></div>
        <div className="p-4 rounded-lg bg-white/5 border border-white/10"><div className="text-white font-medium mb-1">Forms</div><div>Novels, essays, journalism</div></div>
      </div>
      <div className="space-y-3">
        <div className="text-white font-medium">Notable works</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {['Crime and Punishment','The Idiot','Demons (The Possessed)','The Brothers Karamazov','Notes from Underground','House of the Dead'].map(w => (
            <div key={w} className="px-3 py-2 rounded bg-white/10 text-purple-200 text-sm">{w}</div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="text-white font-medium">From the biography</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {blocks.map((b, i) => (
            <details key={i} className="rounded-lg bg-white/5 border border-white/10 p-4" open={i<2}>
              <summary className="cursor-pointer text-white font-medium">Section {i+1}</summary>
              <div className="text-gray-300 text-sm mt-2 whitespace-pre-wrap">{b}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}

function renderSummary(raw: string) {
  if (!raw) return <p className="text-gray-300">No summary found.</p>
  // Extract sections: Introduction, Summary, Themes, Characters etc. Prefer the summary paragraphs
  const titleBlocks = raw.split(/\n(?=\s*(Introduction|Summary|Major Themes|Major Characters|Writing Style|Analysis)\b)/i)
  return (
    <div className="space-y-3">
      {raw.split(/\n\s*\n/).map((para, idx) => (
        <p key={idx} className="text-gray-300 leading-relaxed">{para}</p>
      ))}
    </div>
  )
}

function renderSummaryInteractive(raw: string) {
  if (!raw) return <p className="text-gray-300">No summary found.</p>
  const parts = raw.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean)
  // heuristics: first block is intro, next 3-5 blocks storyline, then themes/characters etc.
  const intro = parts.shift() || ''
  const story = parts.slice(0, 5)
  const rest = parts.slice(5)
  return (
    <div className="space-y-4">
      {intro && (
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="text-white font-medium mb-1">Orientation</div>
          <p className="text-gray-300 text-sm leading-relaxed">{intro}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {story.map((s, i) => (
          <details key={i} className="rounded-lg bg-white/5 border border-white/10 p-4" open={i<2}>
            <summary className="cursor-pointer text-white font-medium">Plot beat {i+1}</summary>
            <div className="text-gray-300 text-sm mt-2 whitespace-pre-wrap">{s}</div>
          </details>
        ))}
      </div>
      {rest.length>0 && (
        <details className="rounded-lg bg-white/5 border border-white/10 p-4">
          <summary className="cursor-pointer text-white font-medium">More context</summary>
          <div className="text-gray-300 text-sm mt-2 whitespace-pre-wrap">{rest.join('\n\n')}</div>
        </details>
      )}
    </div>
  )
}

function renderThemes(raw: string) {
  if (!raw) return <p className="text-gray-300">No themes found.</p>
  // Parse numbered themes like "Theme #1 Alienation" and following explanation
  const lines = raw.split(/\r?\n/)
  type Theme = { title: string; body: string }
  const themes: Theme[] = []
  let current: Theme | null = null
  for (const line of lines) {
    const m = line.match(/^\s*Theme\s*#?\s*(\d+)\s*$/i)
    if (m) {
      if (current) themes.push(current)
      current = { title: `Theme ${m[1]}`, body: '' }
      continue
    }
    if (/^\s*[A-Za-z].*:$/.test(line) && current && !current.title.includes(':')) {
      current.title += ` — ${line.replace(/:$/, '')}`
      continue
    }
    if (current) {
      current.body += (current.body ? '\n' : '') + line.trim()
    }
  }
  if (current) themes.push(current)

  if (themes.length === 0) return <pre className="whitespace-pre-wrap text-sm text-white/90">{raw}</pre>
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {themes.map((t, i) => (
        <details key={i} className="rounded-lg bg-white/5 border border-white/10 p-4" open={i<2}>
          <summary className="cursor-pointer text-white font-medium">{t.title}</summary>
          <div className="text-gray-300 text-sm mt-2 whitespace-pre-wrap">{t.body}</div>
        </details>
      ))}
    </div>
  )
}


