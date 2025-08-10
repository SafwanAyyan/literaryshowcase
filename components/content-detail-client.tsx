"use client"

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'

type Props = {
  id: string
  content: string
  author?: string
  category?: string
  source?: string
  type?: string
  variant?: 'like-only' | 'ai-only' | 'all'
}

export function ContentDetailClient({ id, content, author, category, source, type, variant = 'all' }: Props) {
  const [liked, setLiked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [question, setQuestion] = useState('Explain this in simple terms')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    // infer liked from cookie presence
    const cookie = document.cookie.match(new RegExp(`l_${id}=([^;]+)`))
    setLiked(!!cookie)
  }, [id])

  useEffect(() => {
    // count view on mount
    fetch(`/api/content/${id}/view`, { method: 'POST' }).catch(() => {})
  }, [id])

  async function toggleLike() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/content/${id}/like`, { method: 'POST' })
      const data = await res.json()
      setLiked(data.liked)
    } finally {
      setBusy(false)
    }
  }

  async function ask() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, question, author, category, source, type }),
      })
      const data = await res.json()
      setAnswer(data.answer || 'No answer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {(variant === 'like-only' || variant === 'all') && (
        <button
          onClick={toggleLike}
          disabled={busy}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all duration-200 shadow-md hover:shadow-purple-500/20 ${
            liked
              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-transparent'
              : 'glass-card text-white/90 border-white/15 hover:border-white/30 hover:bg-white/10'
          } disabled:opacity-60`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} /> {liked ? 'Liked' : 'Like'}
        </button>
      )}

      {(variant === 'ai-only' || variant === 'all') && (
        <div className="rounded-2xl p-[1.5px] bg-gradient-to-br from-white/10 via-purple-500/20 to-transparent mt-6">
          <div className="glass-card p-6 rounded-2xl backdrop-blur-md bg-white/5 border border-white/10">
          <div className="text-white font-semibold mb-3">Ask AI about this writing</div>
          <div className="flex flex-col gap-3">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full min-h-28 bg-white/5 border border-white/10 rounded-lg text-white p-3 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            />
            <button
              onClick={ask}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white disabled:opacity-60 shadow-md hover:shadow-purple-500/20"
            >
              {loading ? 'Thinking…' : 'Ask'}
            </button>
            {answer && (
              <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent p-4 text-purple-100 whitespace-pre-wrap">
                {answer}
              </div>
            )}
          </div>
          <div className="mt-6">
            <button
              onClick={async () => {
                setAnalyzing(true)
                try {
                  const res = await fetch('/api/ai/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, content, author, category, type, source }),
                  })
                  const data = await res.json()
                  setAnalysis(data.analysis)
                } finally {
                  setAnalyzing(false)
                }
              }}
              disabled={analyzing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white disabled:opacity-60 shadow-md hover:shadow-purple-500/20"
            >
              {analyzing ? 'Analyzing…' : 'Deep literary analysis (Gemini 2.5 Pro)'}
            </button>
            {analysis && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                  <div className="text-white font-semibold mb-2">Themes</div>
                  <ul className="list-disc pl-5 text-purple-100 space-y-1">
                    {(analysis.themes || []).map((t: string, i: number) => (
                      <li key={`theme-${i}`}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                  <div className="text-white font-semibold mb-2">Metaphors</div>
                  <ul className="list-disc pl-5 text-purple-100 space-y-1">
                    {(analysis.metaphors || []).map((m: string, i: number) => (
                      <li key={`met-${i}`}>{m}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 p-4 bg-white/5 md:col-span-2">
                  <div className="text-white font-semibold mb-2">Literary Devices</div>
                  <div className="space-y-2">
                    {(analysis.literaryDevices || []).map((d: any, i: number) => (
                      <div key={`dev-${i}`} className="rounded-lg border border-white/10 p-3 bg-white/5">
                        <div className="text-purple-200 font-medium">{d.name}</div>
                        {d.quote && <div className="text-purple-300/80 text-sm italic mt-1">“{d.quote}”</div>}
                        <div className="text-purple-100 text-sm mt-1">{d.explanation}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                  <div className="text-white font-semibold mb-1">Tone</div>
                  <div className="text-purple-100">{analysis.tone || '—'}</div>
                </div>
                <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                  <div className="text-white font-semibold mb-1">Style</div>
                  <div className="text-purple-100">{analysis.style || '—'}</div>
                </div>
                <div className="rounded-xl border border-white/10 p-4 bg-white/5 md:col-span-2">
                  <div className="text-white font-semibold mb-2">Imagery</div>
                  <div className="flex flex-wrap gap-2">
                    {(analysis.imagery || []).map((img: string, i: number) => (
                      <span key={`img-${i}`} className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-100 border border-purple-500/30 text-sm">{img}</span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 p-4 bg-white/5 md:col-span-2">
                  <div className="text-white font-semibold mb-2">Summary</div>
                  <div className="text-purple-100 whitespace-pre-wrap">{analysis.summary || '—'}</div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  )
}


