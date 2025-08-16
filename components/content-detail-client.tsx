"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { GradientButton } from './ui/gradient-button'
import { Button } from '@/components/ui/button'

type Props = {
  id: string
  content: string
  author?: string
  category?: string
  source?: string
  type?: string
  variant?: 'like-only' | 'ai-only' | 'all'
}

type MetaphorExpl = {
  quote: string
  meaning: string
  context: string
  themeLinks: string[]
}

export function ContentDetailClient({ id, content, author, category, source, type, variant = 'all' }: Props) {
  const [liked, setLiked] = useState(false)
  const [busy, setBusy] = useState(false)

  // Ask-anything (simple) panel
  const [question, setQuestion] = useState('Explain this in simple terms')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  // Deep analysis panel
  const [analysis, setAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)

  // Metaphor explanations (meaning-first)
  const [metaphorDefs, setMetaphorDefs] = useState<Record<string, string>>({})
  const [loadingMetaphors, setLoadingMetaphors] = useState(false)

  // Layout balance
  const metasRef = useRef<HTMLDivElement | null>(null)
  const themesRef = useRef<HTMLDivElement | null>(null)
  const [themesMinH, setThemesMinH] = useState<number>(0)

  // Clamp/expand per-card controls
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
  const toggleCard = (key: string) => setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }))

  // Measure metaphor panel height and scale Themes min height
  useEffect(() => {
    const updateHeights = () => {
      if (!metasRef.current) return
      const h = metasRef.current.getBoundingClientRect().height
      // Keep Themes visually substantial even when metaphors are long
      setThemesMinH(Math.max(320, Math.round(h * 0.66)))
    }
    updateHeights()
    const RO = (window as any).ResizeObserver
    const ro = RO ? new RO(() => updateHeights()) : null
    if (ro && metasRef.current) ro.observe(metasRef.current)
    const onR = () => updateHeights()
    window.addEventListener('resize', onR)
    return () => {
      window.removeEventListener('resize', onR)
      if (ro && metasRef.current) ro.unobserve(metasRef.current)
    }
  }, [analysis])

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

  // Convert our simple metaphorDefs into richer cards that explicitly answer the four items.
  const metaphorCards: MetaphorExpl[] = useMemo(() => {
    const themes: string[] = (analysis?.themes || []).slice(0, 3)
    const summary: string = analysis?.summary || ''
    return (analysis?.metaphors || []).map((m: string) => {
      const meaning = (metaphorDefs[m] || '').trim()
      const themeLinks = themes.map(t => {
        const why = defineTheme(t)
        return `${t}: supports this by ${why.toLowerCase()}`
      })
      const context = author
        ? `Within the piece by ${author}, this metaphor clarifies a practical takeaway: ${meaning || '—'}.`
        : `Within the passage, this metaphor clarifies a practical takeaway: ${meaning || '—'}.`
      return { quote: m, meaning: meaning || 'Explains a complex idea through comparison.', context: summary ? `In context: ${summary}` : context, themeLinks }
    })
  }, [analysis, metaphorDefs, author])

  async function explainMetaphorsIfNeeded(theList: string[]) {
    if (!theList || theList.length === 0) return
    const toExplain = theList.slice(0, 6).filter(m => !(m in metaphorDefs))
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

  // Small helper to clamp/expand sections without distorting the whole column height
  function Expandable({ id, children, defaultMaxH = 112 }: { id: string; children: React.ReactNode; defaultMaxH?: number }) {
    const open = !!expandedCards[id]
    return (
      <div className="relative group">
        <div
          className={`transition-[max-height] duration-300 ease-out overflow-hidden ${open ? 'max-h-none' : ''}`}
          style={!open ? { maxHeight: defaultMaxH } : undefined}
        >
          {children}
        </div>
        {!open && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-900/40 to-transparent" />
        )}
        <div className="mt-2 flex justify-end">
          <Button
            variant="brand"
            size="sm"
            onClick={() => toggleCard(id)}
            aria-expanded={open}
            className="px-3 py-1 h-8"
          >
            {open ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show more
              </>
            )}
          </Button>
        </div>
      </div>
    )
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

              {/* Balanced two-column layout */}
              {analyzing && (
                <div className="mt-4 grid gap-6 md:grid-cols-12">
                  <div className="md:col-span-6 rounded-xl border border-white/10 p-4 bg-white/5">
                    <div className="h-5 w-28 bg-white/10 shimmer rounded mb-3" />
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-lg bg-white/5 border border-white/10 p-3">
                          <div className="h-4 w-1/3 bg-white/10 shimmer rounded" />
                          <div className="h-3 w-5/6 bg-white/10 shimmer rounded mt-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-6 rounded-xl border border-white/10 p-4 bg-white/5">
                    <div className="h-5 w-32 bg-white/10 shimmer rounded mb-3" />
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-lg bg-white/5 border border-white/10 p-3">
                          <div className="h-4 w-2/3 bg-white/10 shimmer rounded" />
                          <div className="h-3 w-5/6 bg-white/10 shimmer rounded mt-2" />
                          <div className="h-3 w-4/6 bg-white/10 shimmer rounded mt-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {analysis && !analyzing && (
                <div className="mt-4 grid gap-6 md:grid-cols-12">
                  {/* Themes column */}
                  <div
                    ref={themesRef}
                    className="md:col-span-6 rounded-xl border border-white/10 p-4 bg-white/5 flex flex-col"
                    style={{ minHeight: themesMinH || undefined }}
                  >
                    <div className="text-white font-semibold mb-2">Themes</div>
                    <div className="space-y-2 flex-1">
                      {(analysis.themes || []).map((t: string, i: number) => (
                        <div key={`theme-${i}`} className="rounded-lg bg-white/5 border border-white/10 p-3">
                          <div className="text-purple-100 font-medium">{t}</div>
                          <div className="text-purple-200/80 text-sm mt-1">{defineTheme(t)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Metaphors column with internal expansion */}
                  <div ref={metasRef} className="md:col-span-6 rounded-xl border border-white/10 p-4 bg-white/5">
                    <div className="text-white font-semibold mb-2">Metaphors</div>

                    <div className="space-y-3">
                      {metaphorCards.length === 0 && (
                        <div className="text-purple-200/80 text-sm">No metaphors detected.</div>
                      )}
                      {metaphorCards.map((m, i) => {
                        const key = `met-${i}`
                        const open = !!expandedCards[key]
                        return (
                          <div key={key} className="rounded-lg bg-white/5 border border-white/10 p-3">
                            {/* Quoted metaphor */}
                            <div className="text-purple-100 font-medium italic">“{m.quote}”</div>

                            {/* Meaning (visually emphasized) */}
                            <div className="mt-2">
                              <div className="text-white/90 font-semibold">Meaning</div>
                              <Expandable id={`${key}-meaning`} defaultMaxH={80}>
                                <p className="text-purple-100 text-sm">{loadingMetaphors ? 'Explaining…' : m.meaning}</p>
                              </Expandable>
                            </div>

                            {/* Contextual relevance */}
                            <div className="mt-3">
                              <div className="text-white/90 font-semibold">Context</div>
                              <Expandable id={`${key}-context`} defaultMaxH={64}>
                                <p className="text-purple-200/90 text-sm">{m.context}</p>
                              </Expandable>
                            </div>

                            {/* Connection to themes */}
                            {(m.themeLinks?.length ?? 0) > 0 && (
                              <div className="mt-3">
                                <div className="text-white/90 font-semibold">Connection to themes</div>
                                <Expandable id={`${key}-themes`} defaultMaxH={72}>
                                  <ul className="list-disc pl-5 text-purple-200/90 text-sm">
                                    {m.themeLinks.slice(0, open ? m.themeLinks.length : 3).map((t, ti) => (
                                      <li key={ti}>{t}</li>
                                    ))}
                                  </ul>
                                </Expandable>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Literary Devices full-width */}
                  <div className="md:col-span-12 rounded-xl border border-white/10 p-4 bg-white/5">
                    <div className="text-white font-semibold mb-2">Literary Devices</div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {(analysis.literaryDevices || []).map((d: any, i: number) => (
                        <div key={`dev-${i}`} className="rounded-lg border border-white/10 p-3 bg-white/5">
                          <div className="text-purple-200 font-medium">{d.name}</div>
                          <div className="text-purple-300/80 text-xs mt-1">Definition: {defineDevice(d.name || '')}</div>
                          {d.quote && <div className="text-purple-300/80 text-sm italic mt-2">“{d.quote}”</div>}
                          <Expandable id={`dev-${i}-exp`} defaultMaxH={72}>
                            <div className="text-purple-100 text-sm mt-1">{d.explanation}</div>
                          </Expandable>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tone / Style pair */}
                  <div className="md:col-span-6 rounded-xl border border-white/10 p-4 bg-white/5">
                    <div className="text-white font-semibold mb-1">Tone</div>
                    <div className="text-purple-100">{analysis.tone || '—'}</div>
                  </div>
                  <div className="md:col-span-6 rounded-xl border border-white/10 p-4 bg-white/5">
                    <div className="text-white font-semibold mb-1">Style</div>
                    <div className="text-purple-100">{analysis.style || '—'}</div>
                  </div>

                  {/* Imagery */}
                  <div className="md:col-span-12 rounded-xl border border-white/10 p-4 bg-white/5">
                    <div className="text-white font-semibold mb-2">Imagery</div>
                    <div className="flex flex-wrap gap-2">
                      {(analysis.imagery || []).map((img: string, i: number) => (
                        <span key={`img-${i}`} className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-100 border border-purple-500/30 text-sm">{img}</span>
                      ))}
                    </div>
                  </div>

                  {/* Summary with clamp */}
                  <div className="md:col-span-12 rounded-xl border border-white/10 p-4 bg-white/5">
                    <div className="text-white font-semibold mb-2">Summary</div>
                    <Expandable id="summary" defaultMaxH={120}>
                      <div className="text-purple-100 whitespace-pre-wrap">{analysis.summary || '—'}</div>
                    </Expandable>
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
