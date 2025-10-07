"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'

type ParsedItem = {
  content: string
  author: string
  source?: string
  category: string
  type: 'quote' | 'poem' | 'reflection'
}

export function ContentImporter() {
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)

  const parse = async () => {
    if (!file) return
    setBusy(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/content/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) setParsed(data.data || [])
    } finally {
      setBusy(false)
    }
  }

  const publish = async () => {
    const items = parsed.filter((_, i) => selected.has(i))
    if (items.length === 0) return
    setBusy(true)
    try {
      const res = await fetch('/api/content/import', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) })
      const data = await res.json()
      alert(data.success ? `Published ${data.data?.created || 0}` : (data.error || 'Failed to publish items'))
    } finally {
      setBusy(false)
    }
  }

  const toggle = (idx: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })
  }

  const toggleAll = () => {
    if (selected.size === parsed.length) setSelected(new Set())
    else setSelected(new Set(parsed.map((_, i) => i)))
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Bulk Import from .txt</h2>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <input type="file" accept=".txt" onChange={e => setFile(e.target.files?.[0] || null)} className="text-white" />
          <button onClick={parse} disabled={!file || busy} className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white disabled:opacity-50">Parse</button>
          {parsed.length > 0 && <button onClick={publish} disabled={busy || selected.size === 0} className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50">Publish selected ({selected.size})</button>}
        </div>
      </div>

      {parsed.length > 0 && (
        <div className="glass-card p-6 max-h-[60vh] overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="text-white">Parsed items: {parsed.length}</div>
            <button onClick={toggleAll} className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 text-sm">{selected.size === parsed.length ? 'Unselect All' : 'Select All'}</button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {parsed.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`bg-white/5 border border-white/10 rounded-lg p-4 ${selected.has(i) ? 'ring-2 ring-purple-500/50' : ''}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2 text-xs mb-2">
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">{p.category}</span>
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">{p.type}</span>
                      <span className="px-2 py-1 bg-white/10 text-white rounded-full">{p.author || 'Anonymous'}</span>
                      {p.source && <span className="px-2 py-1 bg-white/10 text-white rounded-full">{p.source}</span>}
                    </div>
                    <pre className="whitespace-pre-wrap text-white text-sm">{p.content}</pre>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


