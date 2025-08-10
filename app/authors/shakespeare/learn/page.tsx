"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ChevronRight, Home } from 'lucide-react'

type Data = { devices: string; notes: string; audio: boolean; video: boolean }

export default function ShakespeareLearn() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Data | null>(null)
  const [tab, setTab] = useState<'overview'|'audio'|'hamlet-devices'|'hamlet-notes'|'video'>('overview')

  useEffect(() => { fetch('/authors/shakespeare/data').then(r=>r.json()).then(j=>{ if (j.success) setData(j.data) }).finally(()=> setLoading(false)) }, [])

  const works = useMemo(() => ([
    { key: 'hamlet', title: 'Hamlet', description: 'Devices • scene briefs • recap video', parts: ['hamlet-devices','hamlet-notes','video'] as const },
  ]), [])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-300">Loading…</div>

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="glass-card p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-white">
              <BookOpen className="w-6 h-6" />
              <div>
                <h1 className="text-2xl font-semibold">William Shakespeare</h1>
                <p className="text-gray-300 text-sm">Brief overview, audio intro, and works</p>
              </div>
            </div>
            <Link href="/" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-gray-100 border border-white/10 transition-colors">
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={()=> setTab('overview')} className={`px-3 py-2 rounded-lg ${tab==='overview'?'bg-white/15 text-white':'bg-white/10 text-gray-200 hover:bg-white/15'}`}>Overview</button>
            <button onClick={()=> setTab('audio')} className={`px-3 py-2 rounded-lg ${tab==='audio'?'bg-white/15 text-white':'bg-white/10 text-gray-200 hover:bg-white/15'}`}>Audio Intro</button>
          </div>

          <AnimatePresence mode="wait">
            {tab==='overview' && (
              <motion.div key="ov" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.25 }}>
                <div className="text-gray-300 leading-relaxed space-y-5">
                  <p><span className="text-white font-medium">William Shakespeare</span> (1564–1616), born in <span className="text-white">Stratford‑upon‑Avon</span>, was an English playwright, poet, and actor. He wrote comedies, histories, tragedies, and sonnets that shaped English literature and theatrical craft. He married Anne Hathaway in 1582, became an actor‑shareholder with the Lord Chamberlain’s Men (later the King’s Men), and spent most of his career in London before retiring to Stratford.</p>
                  <p>Why he matters: psychological depth; musical, living language; and a dramatic architecture that still feels modern. When you read or watch him, notice how speeches reveal thought in motion; how imagery clusters around themes of time, power, mercy, ambition, and love; and how scenes pivot on a single word or choice.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10"><div className="text-white font-medium mb-1">Born</div><div>Apr 1564 — Stratford‑upon‑Avon</div></div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10"><div className="text-white font-medium mb-1">Company</div><div>Lord Chamberlain’s Men → King’s Men</div></div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10"><div className="text-white font-medium mb-1">Forms</div><div>Plays (comedies • histories • tragedies), Sonnets</div></div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-white font-medium">Major works at a glance</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-white/90 font-medium mb-2">Tragedies</div>
                        <ul className="flex flex-wrap gap-2 text-sm">
                          {['Hamlet','Macbeth','Othello','King Lear','Romeo and Juliet','Julius Caesar'].map(w => (
                            <li key={w} className="px-2 py-1 rounded bg-white/10 text-purple-200">{w}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-white/90 font-medium mb-2">Comedies</div>
                        <ul className="flex flex-wrap gap-2 text-sm">
                          {['A Midsummer Night’s Dream','Much Ado About Nothing','Twelfth Night','As You Like It','The Merchant of Venice'].map(w => (
                            <li key={w} className="px-2 py-1 rounded bg-white/10 text-purple-200">{w}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-white/90 font-medium mb-2">Histories</div>
                        <ul className="flex flex-wrap gap-2 text-sm">
                          {['Henry IV','Henry V','Richard III','Richard II'].map(w => (
                            <li key={w} className="px-2 py-1 rounded bg-white/10 text-purple-200">{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-white font-medium">Selected summaries</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { t: 'Hamlet', s: 'A prince haunted by his father’s murder tests truth, postpones revenge, and interrogates meaning itself; language becomes a battlefield.' },
                        { t: 'Macbeth', s: 'Ambition, prophecy, and guilt spiral a loyal thane into tyranny; imagery of blood, night, and hallucination charts his unraveling.' },
                        { t: 'Othello', s: 'A general’s trust is poisoned by insinuation; jealousy corrodes love as Iago orchestrates a tragedy of vision and misreading.' },
                        { t: 'King Lear', s: 'An aging king divides his kingdom by flattery, misjudges love, and learns humility through storm, loss, and hard-won clarity.' },
                        { t: 'Romeo and Juliet', s: 'Young love ignites across a feud; speed, chance, and secrecy propel beauty toward catastrophe.' },
                        { t: 'The Tempest', s: 'A magician‑duke conjures reconciliation on an island where art, power, and forgiveness are staged together.' },
                      ].map((it) => (
                        <details key={it.t} className="rounded-lg bg-white/5 border border-white/10 p-4" open>
                          <summary className="cursor-pointer text-white font-medium">{it.t}</summary>
                          <p className="text-gray-300 text-sm mt-2">{it.s}</p>
                        </details>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {tab==='audio' && (
              <motion.div key="ad" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.25 }}>
                {data?.audio ? (
                  <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10 p-4">
                    <div className="text-white font-medium mb-2">Orientation (podcast)</div>
                    <audio controls className="w-full h-12"><source src="/authors/shakespeare/audio" type="audio/mp4" />Your browser does not support audio.</audio>
                  </div>
                ) : <p className="text-gray-300">Audio not found.</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <section>
          <h2 className="text-white text-xl font-semibold mb-3">Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {works.map(w => (
              <div key={w.key} className="glass-card p-5">
                <div className="text-white font-medium mb-1">{w.title}</div>
                <div className="text-gray-300 text-sm mb-3">{w.description}</div>
                <div className="flex flex-wrap gap-2">
                  {w.parts.map(p => (
                    <button key={p} onClick={()=> setTab(p)} className={`px-3 py-2 rounded-lg ${tab===p?'bg-white/15 text-white':'bg-white/10 text-gray-200 hover:bg-white/15'}`}>{p==='hamlet-devices'?'Devices':p==='hamlet-notes'?'Scene briefs':'Recap video'}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <AnimatePresence mode="wait">
            {tab==='hamlet-devices' && (
              <motion.div key="hd" className="glass-card p-6" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}>
                <h3 className="text-white text-lg font-semibold mb-4">Hamlet — Literary Devices</h3>
                {renderDevices(data?.devices || '')}
              </motion.div>
            )}
            {tab==='hamlet-notes' && (
              <motion.div key="hn" className="glass-card p-6" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}>
                <h3 className="text-white text-lg font-semibold mb-4">Hamlet — Scene Briefs</h3>
                {renderScenes(data?.notes || '')}
              </motion.div>
            )}
            {tab==='video' && (
              <motion.div key="hv" className="glass-card p-6" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}>
                <h3 className="text-white text-lg font-semibold mb-3">Hamlet — Recap Video</h3>
                {data?.video ? (
                  <video controls className="w-full rounded-lg"><source src="/authors/shakespeare/video" type="video/mp4" />Your browser does not support video.</video>
                ) : <p className="text-gray-300">Video not found.</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="text-center">
          <Link href="/guides" className="text-gray-300 hover:text-white">Back to Guides</Link>
        </div>
      </div>
    </main>
  )
}

// Helpers to render device list into interactive cards
function renderDevices(raw: string) {
  if (!raw) return <p className="text-gray-300">No content.</p>
  // Extract items like "1. Soliloquy" and the following explanation until next number
  const lines = raw.split(/\r?\n/)
  const items: { title: string; body: string; example?: string }[] = []
  let current: any = null
  for (const l of lines) {
    const m = l.match(/^\s*(\d+)\.\s*(.+)$/)
    if (m) {
      if (current) items.push(current)
      current = { title: m[2].trim(), body: '' }
      continue
    }
    if (!current) continue
    const ex = l.match(/^\s*Example:\s*(.*)$/)
    if (ex) { current.example = ex[1].trim(); continue }
    current.body += (current.body ? '\n' : '') + l.trim()
  }
  if (current) items.push(current)

  if (items.length === 0) return <pre className="whitespace-pre-wrap text-sm text-white/90">{raw}</pre>
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((it, idx) => (
        <details key={idx} className="rounded-lg bg-white/5 border border-white/10 p-4" open={idx<2}>
          <summary className="cursor-pointer text-white font-medium">{idx+1}. {it.title}</summary>
          <div className="text-gray-300 text-sm mt-2 whitespace-pre-wrap">{it.body}</div>
          {it.example && <div className="mt-2 p-3 rounded bg-white/10 text-purple-200 text-sm"><span className="text-white/90 font-medium">Example:</span> {it.example}</div>}
        </details>
      ))}
    </div>
  )
}

function renderScenes(raw: string) {
  if (!raw) return <p className="text-gray-300">No content.</p>
  const blocks = raw.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean)
  const items = blocks.map(b => {
    const [first, ...rest] = b.split(/\n/)
    return { title: first?.trim() || 'Scene', body: rest.join('\n').trim() }
  })
  return (
    <div className="space-y-3">
      {items.map((s, i) => (
        <details key={i} className="rounded-lg bg-white/5 border border-white/10 p-4" open={i<3}>
          <summary className="cursor-pointer text-white font-medium">{s.title}</summary>
          <div className="text-gray-300 text-sm mt-2 whitespace-pre-wrap">{s.body}</div>
        </details>
      ))}
    </div>
  )
}


