"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { BookOpen, ChevronRight, ChevronLeft, Download, FileText, Tag, Filter, Star, Clock, Bookmark, Check, Copy, HelpCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"

type Difficulty = "Beginner" | "Intermediate" | "Advanced"

type GuideStep = {
  id: string
  title: string
  content: string
  collapsible?: { title: string; body: string }[]
  snippet?: { lang: string; code: string; caption?: string }
  footnotes?: { id: string; text: string }[]
  quiz?: {
    question: string
    answers: { id: string; text: string; correct: boolean; tip?: string }[]
  }
}

type Guide = {
  id: string
  title: string
  description: string
  tags: string[]
  difficulty: Difficulty
  estMin?: number
  steps: GuideStep[]
  href?: string // external asset (e.g., devices pdf viewer)
}

// Demo data (fast to render, zero-CLS)
const GUIDES: Guide[] = [
  {
    id: "orientation",
    title: "Orientation to English Literature",
    description: "Movements, genres, and how to read with attention to voice, form, and theme.",
    tags: ["overview", "movements", "forms"],
    difficulty: "Beginner",
    steps: [
      {
        id: "ov-read",
        title: "Landscape and Approach",
        content:
          "What do we mean by theme, voice, and form? As you read, notice patterns and echoes across time. Consider how a sonnet compresses argument; how a play externalizes conflict; how an essay thinks on the page.",
        collapsible: [
          { title: "Tip: Reading with pencil", body: "Mark repeated images, verbs of motion, and time words. These often structure meaning." },
        ],
        footnotes: [{ id: "fn-theme", text: "Theme is not a single word; it’s a proposition the work explores under pressure." }],
      },
      {
        id: "periods",
        title: "Major Periods",
        content:
          "From Renaissance to Romanticism to Modernism and beyond — notice how each period retools older forms. Romantic odes transform classical address; modernist free verse bends lineation to interiority.",
        snippet: {
          lang: "md",
          code:
`# Period heuristics
- Renaissance: rhetoric, imitation, performance
- Romanticism: feeling, nature, the self
- Modernism: fragmentation, experiment, perception`,
          caption: "Quick heuristics for noticing stylistic signatures."
        },
      },
      {
        id: "forms",
        title: "Forms in Practice",
        content:
          "A sonnet is an argument with a hinge (volta); drama stages desire and collision; essays rehearse thinking. Try to pinpoint a volta when reading any 14-line poem.",
        quiz: {
          question: "Where would you look for a sonnet’s volta most often?",
          answers: [
            { id: "a", text: "Lines 1–2", correct: false, tip: "Opening sets premise more than turn." },
            { id: "b", text: "Lines 8–9", correct: true, tip: "The turn often occurs at the octave–sestet hinge." },
            { id: "c", text: "Lines 13–14", correct: false, tip: "Couplet is closure or twist, not necessarily the hinge." },
          ],
        },
      },
    ],
  },
  {
    id: "devices",
    title: "Literary Devices — Learn & Reference",
    description: "Metaphor, metonymy, anaphora, caesura and more — with quick examples and how to spot them.",
    tags: ["devices", "reference"],
    difficulty: "Beginner",
    steps: [
      {
        id: "why-devices",
        title: "Why Devices Matter",
        content:
          "Devices are not ornament; they concentrate attention. They shape pace, emphasis, and inference.",
      },
      {
        id: "open-pdf",
        title: "Open the Devices Reference",
        content:
          "Open the formatted reference within the site or download a copy for later.",
        collapsible: [
          { title: "Tip: Use while annotating", body: "Skim the list with a pencil in hand; star devices you spot and write a 1–2 line why." },
        ],
      },
    ],
    href: "/guides/devices/view",
  },
]

function words(text: string) {
  return text.trim().split(/\s+/g).filter(Boolean).length
}

function estimateMinutes(g: Guide): number {
  if (g.estMin) return g.estMin
  const totalWords =
    g.steps.reduce((sum, s) => sum + words(s.content) + words(s.snippet?.code || ""), 0) + words(g.description)
  // 200 wpm baseline
  return Math.max(2, Math.round(totalWords / 200))
}

type ProgressMap = Record<string, { step: number; completed: string[]; bookmarked?: boolean }>

export default function GuidesPage() {
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [tag, setTag] = useState<string>("all")
  const [difficulty, setDifficulty] = useState<"all" | Difficulty>("all")
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressMap>({})
  const [quizFeedback, setQuizFeedback] = useState<Record<string, string>>({})

  // Load persisted progress/bookmarks
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem("guides:progress")
        if (raw) setProgress(JSON.parse(raw))
      } catch {}
      setLoading(false)
    }, 200)
    return () => clearTimeout(t)
  }, [])

  const allTags = useMemo(() => {
    const s = new Set<string>()
    GUIDES.forEach((g) => g.tags.forEach((t) => s.add(t)))
    return ["all", ...Array.from(s)]
  }, [])

  const filteredGuides = useMemo(() => {
    const q = query.trim().toLowerCase()
    return GUIDES.filter((g) => {
      const matchQ =
        q.length === 0 ||
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q))
      const matchTag = tag === "all" || g.tags.includes(tag)
      const matchDiff = difficulty === "all" || g.difficulty === difficulty
      return matchQ && matchTag && matchDiff
    }).map((g) => ({ ...g, estMin: estimateMinutes(g) }))
  }, [query, tag, difficulty])

  const activeGuide = useMemo(() => filteredGuides.find((g) => g.id === activeGuideId) || null, [filteredGuides, activeGuideId])
  const stepIndex = progress[activeGuideId || ""]?.step ?? 0
  const currentStep = activeGuide?.steps[stepIndex]

  const persist = useCallback((next: ProgressMap) => {
    setProgress(next)
    try {
      localStorage.setItem("guides:progress", JSON.stringify(next))
    } catch {}
  }, [])

  const toggleBookmark = useCallback((id: string) => {
    persist({
      ...progress,
      [id]: { step: progress[id]?.step ?? 0, completed: progress[id]?.completed ?? [], bookmarked: !progress[id]?.bookmarked },
    })
  }, [progress, persist])

  const setStep = useCallback((id: string, idx: number) => {
    persist({ ...progress, [id]: { step: idx, completed: progress[id]?.completed ?? [], bookmarked: progress[id]?.bookmarked } })
  }, [progress, persist])

  const markCompleted = useCallback((id: string, stepId: string) => {
    const prev = progress[id]?.completed ?? []
    if (prev.includes(stepId)) return
    persist({ ...progress, [id]: { step: progress[id]?.step ?? 0, completed: [...prev, stepId], bookmarked: progress[id]?.bookmarked } })
  }, [progress, persist])

  const handleCopy = async (code?: string) => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      const el = document.getElementById("sr-status")
      if (el) el.textContent = "Copied code to clipboard"
    } catch {}
  }

  const answerQuiz = (g: Guide, s: GuideStep, answerId: string) => {
    const ans = s.quiz?.answers.find((a) => a.id === answerId)
    if (!ans) return
    const msg = ans.correct ? "Correct — well spotted." : `Not quite. ${ans.tip || ""}`.trim()
    setQuizFeedback((m) => ({ ...m, [s.id]: msg }))
    if (ans.correct) markCompleted(g.id, s.id)
  }

  // UI

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="glass-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-12 w-12 rounded-2xl" aria-label="Loading icon" />
              <div className="flex-1">
                <Skeleton className="h-5 w-64 rounded-md" aria-label="Loading title" />
                <Skeleton className="h-4 mt-2 w-96 rounded-md" aria-label="Loading description" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-xl" aria-label="Loading control" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={`gsk-${i}`} className="glass-card border-white/10">
                <CardHeader>
                  <Skeleton className="h-4 w-48 rounded-md" aria-label="Loading guide title" />
                  <Skeleton className="h-3 mt-2 w-72 rounded-md" aria-label="Loading guide excerpt" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" aria-label="Loading tag" />
                    <Skeleton className="h-6 w-20 rounded-full" aria-label="Loading tag" />
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <Skeleton className="h-10 w-24 rounded-xl" aria-label="Loading action" />
                  <Skeleton className="h-10 w-10 rounded-xl" aria-label="Loading action" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="glass-card p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Guides</h1>
                <p className="text-gray-300">Interactive lessons with progress, inline tips, and knowledge checks.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search guides, tags, or topics..."
                  aria-label="Search guides"
                  className="w-full sm:w-72 pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Filter className="w-4 h-4" />
                </span>
              </div>
              <div className="relative">
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  aria-label="Filter by tag"
                  className="w-full sm:w-48 pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                >
                  {allTags.map((t) => (
                    <option key={t} value={t}>{t === "all" ? "All tags" : t}</option>
                  ))}
                </select>
                <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <div className="relative">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  aria-label="Filter by difficulty"
                  className="w-full sm:w-48 pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                >
                  {["all", "Beginner", "Intermediate", "Advanced"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <Star className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Listing */ }
        <section className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuides.map((g, idx) => {
              const bm = progress[g.id]?.bookmarked
              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 16, scale: 0.985 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.28, delay: Math.min(idx * 0.03, 0.2) }}
                >
                  <Card className="glass-card border-white/10 focus-within:ring-2 focus-within:ring-purple-400/40 rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-white">{g.title}</CardTitle>
                      <CardDescription className="text-gray-300">{g.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {g.tags.map((t) => (
                          <Badge key={`${g.id}-${t}`} className="bg-white/10 text-purple-200 border-white/10">{t}</Badge>
                        ))}
                      </div>
                      <div className="text-sm text-purple-200 inline-flex items-center gap-2">
                        <Clock className="w-4 h-4" /> ~{g.estMin} min • {g.difficulty}
                      </div>
                    </CardContent>
                    <CardFooter className="justify-between">
                      <div className="flex items-center gap-2">
                        <Button onClick={() => { setActiveGuideId(g.id); setStep(g.id, progress[g.id]?.step ?? 0) }} aria-label={`Open ${g.title}`}>
                          Start</Button>
                        {g.href && (
                          <Link href={g.href} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white">
                            <FileText className="w-4 h-4" /> View
                          </Link>
                        )}
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              aria-pressed={!!bm}
                              aria-label={`${bm ? "Remove bookmark" : "Bookmark"} ${g.title}`}
                              onClick={() => toggleBookmark(g.id)}
                              className="px-3"
                            >
                              <Bookmark className={`w-4 h-4 ${bm ? "text-pink-300" : ""}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{bm ? "Bookmarked" : "Bookmark"}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardFooter>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Step-by-step flow (drawer-style section) */}
        <AnimatePresence mode="wait">
          {activeGuide && (
            <motion.section
              key={activeGuide.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28 }}
              className="mt-8 glass-card p-6 md:p-8"
              aria-labelledby="guide-flow-title"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 grid place-items-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 id="guide-flow-title" className="text-white text-xl font-semibold">{activeGuide.title}</h2>
                    <div className="text-gray-300 text-sm">
                      Step {stepIndex + 1} of {activeGuide.steps.length} • ~{activeGuide.estMin} min • {activeGuide.difficulty}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeGuide.href && (
                    <Link href={activeGuide.href} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white">
                      <FileText className="w-4 h-4" /> Reference
                    </Link>
                  )}
                  <Button variant="secondary" onClick={() => setActiveGuideId(null)} className="px-3">Close</Button>
                </div>
              </div>

              {/* Current step content */}
              <div className="mt-3">
                <h3 className="text-white text-lg font-semibold mb-2">{currentStep?.title}</h3>
                <p className="text-gray-300 leading-relaxed">
                  {currentStep?.content}
                  {currentStep?.footnotes?.map((f) => (
                    <sup key={f.id} className="text-purple-200 ml-1">[{f.id}]</sup>
                  ))}
                </p>

                {/* Collapsible tips/sections */}
                {currentStep?.collapsible?.length ? (
                  <div className="mt-4">
                    <Accordion type="single" collapsible defaultValue="item-0">
                      {currentStep.collapsible.map((c, i) => (
                        <AccordionItem key={i} value={`item-${i}`}>
                          <AccordionTrigger className="text-white">{c.title}</AccordionTrigger>
                          <AccordionContent className="text-gray-300">{c.body}</AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ) : null}

                {/* Snippet with copy */}
                {currentStep?.snippet ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 text-sm text-purple-200 bg-white/5 border-b border-white/10">
                      <div className="inline-flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" />
                        {currentStep.snippet.caption || "Example"}
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="secondary" className="px-3" onClick={() => handleCopy(currentStep.snippet?.code)} aria-label="Copy code">
                              <Copy className="w-3.5 h-3.5" /> Copy
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy to clipboard</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <pre className="p-4 text-sm text-white/90 whitespace-pre-wrap">{currentStep.snippet.code}</pre>
                  </div>
                ) : null}

                {/* Quiz */}
                {currentStep?.quiz ? (
                  <div className="mt-5 p-4 rounded-xl border border-white/10 bg-white/5">
                    <div className="text-white font-medium mb-2">Knowledge check</div>
                    <div className="text-gray-200 mb-3">{currentStep.quiz.question}</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {currentStep.quiz.answers.map((a) => (
                        <Button
                          key={a.id}
                          variant="secondary"
                          className="justify-start"
                          onClick={() => answerQuiz(activeGuide, currentStep, a.id)}
                          aria-label={`Answer ${a.text}`}
                        >
                          {a.text}
                        </Button>
                      ))}
                    </div>
                    <div className="mt-3 text-sm text-purple-200" role="status" aria-live="polite">
                      {quizFeedback[currentStep.id] || "Select an answer to get instant feedback."}
                    </div>
                  </div>
                ) : null}

                {/* Footnotes */}
                {currentStep?.footnotes?.length ? (
                  <details className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <summary className="cursor-pointer text-white font-medium">Footnotes</summary>
                    <ul className="mt-2 list-disc list-inside text-gray-300 text-sm space-y-1">
                      {currentStep.footnotes.map((f) => (
                        <li key={f.id}>[{f.id}] {f.text}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>

              {/* Step controls */}
              <div className="mt-6 flex items-center justify-between">
                <Button
                  onClick={() => setStep(activeGuide.id, Math.max(0, stepIndex - 1))}
                  disabled={stepIndex === 0}
                  className="inline-flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>
                <div className="text-gray-300 text-sm">
                  Step {stepIndex + 1} of {activeGuide.steps.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      markCompleted(activeGuide.id, currentStep?.id || "")
                      setStep(activeGuide.id, Math.min(activeGuide.steps.length - 1, stepIndex + 1))
                    }}
                    className="inline-flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Mark & Next
                  </Button>
                  <Button
                    onClick={() => setStep(activeGuide.id, Math.min(activeGuide.steps.length - 1, stepIndex + 1))}
                    disabled={stepIndex === activeGuide.steps.length - 1}
                    className="inline-flex items-center gap-2"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Authors & Explanations cross-sell */}
        <section className="mt-8">
          <h3 className="text-white text-2xl font-semibold mb-4">Writers & Explanations</h3>
          <p className="text-gray-300 mb-4">Explore focused lessons that combine summaries, devices, audio, and video for key writers.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/authors/shakespeare" className="glass-card p-5 hover:bg-white/10 transition-colors rounded-2xl border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold">William Shakespeare</div>
                  <div className="text-gray-300 text-sm">Orientation • Hamlet devices • scene briefs • audio • video recap</div>
                </div>
              </div>
              <div className="text-gray-300 text-sm">Start the Shakespeare path and learn through concise, modern steps.</div>
              <div className="mt-3 inline-flex items-center gap-1 text-white/90">Start <ChevronRight className="w-4 h-4" /></div>
            </Link>
            <Link href="/authors/dostoevsky" className="glass-card p-5 hover:bg-white/10 transition-colors rounded-2xl border border-white/10">
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
