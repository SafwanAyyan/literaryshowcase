"use client"

import { useEffect, useState } from 'react'
import { Heart, Send } from 'lucide-react'
import { GradientButton } from './ui/gradient-button'

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
  const [metaphorDefs, setMetaphorDefs] = useState<Record<string, string>>({})
  const [loadingMetaphors, setLoadingMetaphors] = useState(false)

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

  function defineTheme(theme: string): string {
    const t = theme.trim().toLowerCase()
    const map: Record<string, string> = {
      'heartbreak and transformation': 'Sorrow becomes a catalyst for change; pain reshapes the self into something new.',
      'pain and growth': 'Difficulty produces maturity; struggle stretches a person toward broader strength.',
      'resilience': 'The capacity to absorb hardship and continue forward with purpose.',
      'acceptance': 'A calm recognition of reality that allows healing and movement.',
      'love': 'Attachment and care as a driving force that clarifies choices and values.',
      'loss': 'The absence of what mattered and the meanings that grow around it.',
      'identity': 'Questions of who one is and how the self is formed and preserved.',
      'freedom': 'Release from constraint—social, psychological, or moral—and the costs of it.',
      'power': 'How influence is gained, kept, abused, or surrendered.',
    }
    return map[t] || `A theme exploring ${theme.toLowerCase()} as it develops through the text.`
  }

  function defineDevice(device: string): string {
    const d = device.trim().toLowerCase()
    const map: Record<string, string> = {
      'metaphor': 'A comparison stating one thing is another to reveal a shared quality.',
      'simile': 'A comparison using "like" or "as" to clarify resemblance.',
      'personification': 'Giving human qualities to nonhuman things or ideas.',
      'symbolism': 'A concrete thing that points to an abstract meaning beyond itself.',
      'hyperbole': 'Deliberate exaggeration for emphasis or effect.',
      'paradox': 'A statement that seems contradictory but reveals a deeper truth.',
      'oxymoron': 'Two opposite terms paired together to create a striking idea.',
      'antithesis': 'Parallel structures that present opposing ideas for contrast.',
      'alliteration': 'Repetition of initial consonant sounds in nearby words.',
      'assonance': 'Repetition of vowel sounds in nearby words.',
      'consonance': 'Repetition of consonant sounds (not just at the start) in nearby words.',
      'imagery': 'Language that appeals to the senses to create vivid pictures.',
      'irony': 'A gap between expectation and reality that produces insight or humor.',
      'juxtaposition': 'Placing two elements side by side to highlight difference or tension.',
      'synecdoche': 'A part stands in for the whole (or the whole for a part).',
      'metonymy': 'An associated attribute or object stands in for the thing itself.',
      'allegory': 'A story whose characters and events consistently symbolize a second meaning.',
      'motif': 'A recurring image or idea that gathers meaning across a text.',
      'anaphora': 'Repetition of a word or phrase at the start of successive lines or clauses.',
      'chiasmus': 'A mirrored ABBA structure that flips order to stress a relationship.',
      'enjambment': 'In poetry, a line that carries its sense over into the next without pause.',
      'caesura': 'A strong pause within a poetic line that shapes its rhythm.',
    }
    return map[d] || `A literary device: ${device}—a technique used to shape meaning and effect.`
  }

  async function explainMetaphorsIfNeeded(theList: string[]) {
    if (!theList || theList.length === 0) return
    const toExplain = theList.slice(0, 5).filter(m => !(m in metaphorDefs))
    if (toExplain.length === 0) return
    setLoadingMetaphors(true)
    try {
      const entries: [string, string][] = []
      for (const m of toExplain) {
        try {
          const res = await fetch('/api/ai/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, question: `In one plain sentence, explain the metaphor: "${m}"` })
          })
          const data = await res.json()
          const expl = (data?.answer || '').trim() || 'Explains a complex idea through comparison.'
          entries.push([m, expl])
        } catch {
          entries.push([m, 'Explains a complex idea through comparison.'])
        }
      }
      setMetaphorDefs(prev => ({ ...prev, ...Object.fromEntries(entries) }))
    } finally {
      setLoadingMetaphors(false)
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
        <GradientButton onClick={toggleLike} disabled={busy} leftIcon={<Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />}>
          {liked ? 'Liked' : 'Like'}
        </GradientButton>
      )}

      {(variant === 'ai-only' || variant === 'all') && (
        <div className="rounded-2xl p-[1.5px] bg-gradient-to-br from-white/10 via-purple-500/20 to-transparent mt-6">
          <div className="glass-card p-6 rounded-2xl backdrop-blur-md bg-white/5 border border-white/10">
          <div className="text-white font-semibold mb-3">Ask AI about this writing</div>
          <div className="flex flex-col gap-3">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full min-h-28 bg-white/5 border border-white/10 rounded-xl text-white p-3 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            />
            <GradientButton onClick={ask} disabled={loading} leftIcon={<Send className="w-4 h-4" />} rounded="xl">
              {loading ? 'Thinking…' : 'Ask'}
            </GradientButton>
            {answer && (
              <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent p-4 text-purple-100 whitespace-pre-wrap">
                {answer}
              </div>
            )}
          </div>
          <div className="mt-6 text-center">
            <GradientButton
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
                    await explainMetaphorsIfNeeded(data.analysis?.metaphors || [])
                } finally {
                  setAnalyzing(false)
                }
              }}
              disabled={analyzing}
              rounded="xl"
            >
              {analyzing ? 'Analyzing…' : 'Deep literary analysis'}
            </GradientButton>
            {analysis && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                  <div className="text-white font-semibold mb-2">Themes</div>
                  <div className="space-y-2">
                    {(analysis.themes || []).map((t: string, i: number) => (
                      <div key={`theme-${i}`} className="rounded-lg bg-white/5 border border-white/10 p-3">
                        <div className="text-purple-100 font-medium">{t}</div>
                        <div className="text-purple-200/80 text-sm mt-1">{defineTheme(t)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                  <div className="text-white font-semibold mb-2">Metaphors</div>
                  <div className="space-y-2">
                    {(analysis.metaphors || []).map((m: string, i: number) => (
                      <div key={`met-${i}`} className="rounded-lg bg-white/5 border border-white/10 p-3">
                        <div className="text-purple-100 font-medium">{m}</div>
                        <div className="text-purple-200/80 text-sm mt-1">{metaphorDefs[m] || (loadingMetaphors ? 'Explaining…' : '—')}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 p-4 bg-white/5 md:col-span-2">
                  <div className="text-white font-semibold mb-2">Literary Devices</div>
                  <div className="space-y-2">
                    {(analysis.literaryDevices || []).map((d: any, i: number) => (
                      <div key={`dev-${i}`} className="rounded-lg border border-white/10 p-3 bg-white/5">
                        <div className="text-purple-200 font-medium">{d.name}</div>
                        <div className="text-purple-300/80 text-xs mt-1">Definition: {defineDevice(d.name || '')}</div>
                        {d.quote && <div className="text-purple-300/80 text-sm italic mt-2">“{d.quote}”</div>}
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


