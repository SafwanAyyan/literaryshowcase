"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot,
  Sparkles,
  RefreshCw,
  FileText,
  LibraryBig,
  Tags,
  History,
  Filter as FilterIcon,
  CheckCircle2,
} from "lucide-react"
import toast from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

import { ContentRefresh } from "@/lib/content-refresh"
import type { AIDraftItem, AIDraftStatus, DraftEvent, Category } from "@/types/literary"

const statusLabels: Record<AIDraftStatus, string> = {
  pending: "Pending",
  in_review: "In Review",
  needs_revision: "Needs Revision",
  approved: "Approved",
}

const statusBadgeVariant: Record<AIDraftStatus, string> = {
  pending: "bg-slate-500/30 text-slate-100",
  in_review: "bg-blue-500/20 text-blue-200",
  needs_revision: "bg-amber-500/20 text-amber-200",
  approved: "bg-emerald-500/20 text-emerald-200",
}

const categories: Category[] = [
  "found-made",
  "cinema",
  "literary-masters",
  "spiritual",
  "original-poetry",
  "heartbreak",
]

const tones = [
  "inspirational",
  "melancholic",
  "contemplative",
  "romantic",
  "peaceful",
  "mysterious",
]

const generationTypes: Array<"quote" | "poem" | "reflection"> = ["quote", "poem", "reflection"]

const writingModes: Array<"original-ai" | "known-writers"> = ["original-ai", "known-writers"]

const providerOptions = [
  { value: "gemini", label: "Gemini 2.5 (default)" },
  { value: "openai", label: "OpenAI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "both", label: "OpenAI + Gemini" },
]

const statusFilterOptions: Array<AIDraftStatus | "all"> = [
  "pending",
  "in_review",
  "needs_revision",
  "approved",
  "all",
]

const providerFilterOptions = ["all", "gemini", "openai", "deepseek"]

const parseTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)

export function AIContentGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isComposingPrompt, setIsComposingPrompt] = useState(false)
  const [promptPreview, setPromptPreview] = useState("")
  const [showPromptPreview, setShowPromptPreview] = useState(false)

  const [drafts, setDrafts] = useState<AIDraftItem[]>([])
  const [loadingDrafts, setLoadingDrafts] = useState(true)
  const [isRefreshingDrafts, setIsRefreshingDrafts] = useState(false)
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set())
  const [draftEdits, setDraftEdits] = useState<Record<string, { tags: string; reviewNotes: string; content: string }>>({})
  const [historyCache, setHistoryCache] = useState<Record<string, DraftEvent[]>>({})
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)

  const [filters, setFilters] = useState({
    status: "pending" as AIDraftStatus | "all",
    category: "all" as Category | "all",
    provider: "all" as string,
    search: "",
  })

  const [generationTags, setGenerationTags] = useState("")
  const [form, setForm] = useState({
    category: "found-made" as Category,
    type: "quote" as "quote" | "poem" | "reflection",
    quantity: 6,
    theme: "",
    tone: "inspirational",
    writingMode: "original-ai" as "original-ai" | "known-writers",
    provider: "gemini" as string,
  })

  const fetchDrafts = useCallback(async () => {
    setLoadingDrafts(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set("status", filters.status)
      if (filters.category) params.set("category", filters.category)
      if (filters.provider) params.set("provider", filters.provider)
      if (filters.search.trim()) params.set("q", filters.search.trim())

      const response = await fetch(`/api/admin/ai/drafts?${params.toString()}`)
      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error || "Failed to load drafts")
      }
      setDrafts(json.items as AIDraftItem[])
    } catch (error: any) {
      console.error("Failed to load drafts", error)
      toast.error(error?.message || "Failed to load draft library")
    } finally {
      setLoadingDrafts(false)
    }
  }, [filters])

  useEffect(() => {
    fetchDrafts()
  }, [fetchDrafts])

  useEffect(() => {
    setDraftEdits((prev) => {
      const next: Record<string, { tags: string; reviewNotes: string; content: string }> = {}
      drafts.forEach((draft) => {
        next[draft.id] = {
          tags: prev[draft.id]?.tags ?? draft.tags.join(", "),
          reviewNotes: prev[draft.id]?.reviewNotes ?? (draft.reviewNotes || ""),
          content: prev[draft.id]?.content ?? draft.content,
        }
      })
      return next
    })
  }, [drafts])

  useEffect(() => {
    setSelectedDraftIds((prev) => {
      const next = new Set<string>()
      drafts.forEach((draft) => {
        if (prev.has(draft.id)) {
          next.add(draft.id)
        }
      })
      return next
    })
  }, [drafts])

  const handlePreviewPrompt = async () => {
    setIsComposingPrompt(true)
    setShowPromptPreview(true)
    try {
      const response = await fetch("/api/ai/generate/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          type: form.type,
          theme: form.theme,
          tone: form.tone,
          quantity: form.quantity,
          writingMode: form.writingMode,
        }),
      })
      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error || "Failed to compose prompt")
      }
      setPromptPreview(json.prompt || "")
    } catch (error: any) {
      console.error("Failed to compose prompt", error)
      toast.error(error?.message || "Failed to compose prompt")
    } finally {
      setIsComposingPrompt(false)
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/admin/ai/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          type: form.type,
          tone: form.tone,
          quantity: form.quantity,
          theme: form.theme,
          writingMode: form.writingMode,
          provider: form.provider === "both" ? "both" : form.provider,
          tags: generationTags,
        }),
      })
      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error || "Failed to generate drafts")
      }

      const createdDrafts: AIDraftItem[] = json.drafts || []
      if (createdDrafts.length === 0) {
        toast("No new drafts were generated. Try adjusting your prompt.")
        return
      }

      setDrafts((prev) => [...createdDrafts, ...prev])
      setSelectedDraftIds((prev) => {
        const next = new Set(prev)
        createdDrafts.forEach((draft) => next.add(draft.id))
        return next
      })
      toast.success(`Generated ${createdDrafts.length} drafts successfully`)
    } catch (error: any) {
      console.error("Failed to generate drafts", error)
      toast.error(error?.message || "Failed to generate drafts")
    } finally {
      setIsGenerating(false)
    }
  }

  const updateDraft = async (
    id: string,
    payload: {
      status?: AIDraftStatus
      tags?: string[]
      reviewNotes?: string
      content?: string
    }
  ) => {
    const response = await fetch(`/api/admin/ai/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await response.json()
    if (!json.success) {
      throw new Error(json.error || "Failed to update draft")
    }
    const updatedDraft: AIDraftItem = json.draft
    setDrafts((prev) => prev.map((draft) => (draft.id === id ? updatedDraft : draft)))
    return updatedDraft
  }

  const handleStatusChange = async (id: string, status: AIDraftStatus) => {
    try {
      await updateDraft(id, { status })
      toast.success(`Draft moved to ${statusLabels[status]}`)
    } catch (error: any) {
      console.error("Failed to update status", error)
      toast.error(error?.message || "Failed to update status")
    }
  }

  const handleSaveDraft = async (id: string) => {
    try {
      const edits = draftEdits[id]
      const updated = await updateDraft(id, {
        tags: parseTags(edits?.tags || ""),
        reviewNotes: edits?.reviewNotes ?? "",
        content: edits?.content ?? "",
      })
      setDraftEdits((prev) => ({
        ...prev,
        [id]: {
          tags: updated.tags.join(", "),
          reviewNotes: updated.reviewNotes || "",
          content: updated.content,
        },
      }))
      toast.success("Draft updated")
    } catch (error: any) {
      console.error("Failed to save draft", error)
      toast.error(error?.message || "Failed to save draft")
    }
  }

  const handleBulkPublish = async () => {
    const ids = Array.from(selectedDraftIds)
    if (!ids.length) {
      toast("Select drafts to publish")
      return
    }

    setIsPublishing(true)
    try {
      const response = await fetch("/api/admin/ai/drafts/bulk-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error || "Failed to publish drafts")
      }

      const publishedCount = json.published || 0
      if (publishedCount === 0) {
        toast("No drafts were eligible for publishing")
      } else {
        toast.success(`Published ${publishedCount} drafts to the live library`)
        ContentRefresh.notifyContentChange()
        fetchDrafts()
        setSelectedDraftIds(new Set())
      }
    } catch (error: any) {
      console.error("Failed to publish drafts", error)
      toast.error(error?.message || "Failed to publish drafts")
    } finally {
      setIsPublishing(false)
    }
  }

  const toggleDraftSelection = (id: string) => {
    setSelectedDraftIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedDraftIds.size === drafts.length) {
      setSelectedDraftIds(new Set())
      return
    }
    setSelectedDraftIds(new Set(drafts.map((draft) => draft.id)))
  }

  const selectedApprovedCount = useMemo(() => {
    return drafts.filter((draft) => selectedDraftIds.has(draft.id) && draft.status === "approved").length
  }, [drafts, selectedDraftIds])

  const handleHistoryToggle = async (id: string) => {
    if (expandedHistoryId === id) {
      setExpandedHistoryId(null)
      return
    }
    if (!historyCache[id]) {
      try {
        const response = await fetch(`/api/admin/ai/drafts/${id}/events`)
        const json = await response.json()
        if (!json.success) {
          throw new Error(json.error || "Failed to load history")
        }
        setHistoryCache((prev) => ({ ...prev, [id]: json.history as DraftEvent[] }))
      } catch (error: any) {
        console.error("Failed to load history", error)
        toast.error(error?.message || "Failed to load history")
        return
      }
    }
    setExpandedHistoryId(id)
  }

  const refreshDrafts = async () => {
    setIsRefreshingDrafts(true)
    await fetchDrafts()
    setIsRefreshingDrafts(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Bot className="h-7 w-7" />
          <span>Admin AI Content Generator</span>
        </h1>
        <p className="text-gray-300 max-w-3xl">
          Generate high-quality drafts with Gemini 2.5, review them in a private library, tag for discovery, and bulk publish when the content is ready for the world.
        </p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span>Generation Settings</span>
            </h2>
            <p className="text-sm text-gray-300">
              Strong prompts tuned for each category ensure grounded, verifiable output.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Category</label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm((prev) => ({ ...prev, category: value as Category }))}
            >
              <SelectTrigger className="bg-white/10 text-white border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.replace(/-/g, " ")}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Type</label>
            <Select
              value={form.type}
              onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as "quote" | "poem" | "reflection" }))}
            >
              <SelectTrigger className="bg-white/10 text-white border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {generationTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type[0].toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Tone</label>
            <Select value={form.tone} onValueChange={(value) => setForm((prev) => ({ ...prev, tone: value }))}>
              <SelectTrigger className="bg-white/10 text-white border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {tones.map((tone) => (
                    <SelectItem key={tone} value={tone}>
                      {tone[0].toUpperCase() + tone.slice(1)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Quantity</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={form.quantity}
              onChange={(event) => setForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
              className="bg-white/10 text-white border-white/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Theme (optional)</label>
            <Input
              value={form.theme}
              onChange={(event) => setForm((prev) => ({ ...prev, theme: event.target.value }))}
              placeholder="e.g. resilience, night drives, belonging"
              className="bg-white/10 text-white border-white/20 placeholder:text-gray-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Writing Mode</label>
            <Select
              value={form.writingMode}
              onValueChange={(value) => setForm((prev) => ({ ...prev, writingMode: value as "original-ai" | "known-writers" }))}
            >
              <SelectTrigger className="bg-white/10 text-white border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {writingModes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode === "original-ai" ? "Original AI" : "Known Writers"}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Preferred Provider</label>
            <Select value={form.provider} onValueChange={(value) => setForm((prev) => ({ ...prev, provider: value }))}>
              <SelectTrigger className="bg-white/10 text-white border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {providerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Gemini 2.5 is the default. Choose “Both” to aggregate Gemini and OpenAI responses with deduplication.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Default Tags for New Drafts</label>
            <Input
              value={generationTags}
              onChange={(event) => setGenerationTags(event.target.value)}
              placeholder="comma separated"
              className="bg-white/10 text-white border-white/20 placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <Button
              onClick={handlePreviewPrompt}
              variant="brand"
              round="pill"
              disabled={isComposingPrompt}
              className="flex items-center gap-2"
            >
              {isComposingPrompt ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span>{isComposingPrompt ? "Composing…" : "Preview Prompt"}</span>
            </Button>
            <Button
              onClick={handleGenerate}
              variant="brand"
              round="pill"
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>{isGenerating ? "Generating…" : "Generate Drafts"}</span>
            </Button>
          </div>
          <div className="text-xs text-gray-400">
            Gemini 2.5 receives an opinionated system prompt tuned to each category for grounded, human cadence results.
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPromptPreview && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-lg">Composed Prompt</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowPromptPreview(false)}>
                Close
              </Button>
            </div>
            <pre className="max-h-72 overflow-auto rounded-xl bg-black/40 p-4 text-xs leading-relaxed text-purple-100 whitespace-pre-wrap">
              {promptPreview || "No prompt available."}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-white">
            <LibraryBig className="h-5 w-5" />
            <div>
              <h2 className="text-xl font-semibold">Draft Library</h2>
              <p className="text-sm text-gray-300">
                Review, tag, and approve AI drafts before they reach the live collection.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value as AIDraftStatus | "all" }))}
            >
              <SelectTrigger className="w-36 bg-white/10 text-white border-white/20">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusFilterOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all" ? "All statuses" : statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.category}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, category: value as Category | "all" }))}
            >
              <SelectTrigger className="w-40 bg-white/10 text-white border-white/20">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.replace(/-/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.provider}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, provider: value }))}
            >
              <SelectTrigger className="w-36 bg-white/10 text-white border-white/20">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                {providerFilterOptions.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider === "all" ? "All providers" : provider.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Input
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Search content or notes"
                className="bg-white/10 text-white border-white/20 placeholder:text-gray-400"
              />
              <Button
                onClick={refreshDrafts}
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                title="Refresh library"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshingDrafts ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <FilterIcon className="h-4 w-4" />
            <span>
              Showing {drafts.length} draft{drafts.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="border-white/20 text-white"
            >
              {selectedDraftIds.size === drafts.length ? "Clear Selection" : "Select All"}
            </Button>
            <Button
              variant="brand"
              size="sm"
              disabled={isPublishing || selectedApprovedCount === 0}
              onClick={handleBulkPublish}
              className="flex items-center gap-2"
            >
              {isPublishing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>
                Publish {selectedApprovedCount > 0 ? `${selectedApprovedCount} Approved` : "Approved"} Draft
                {selectedApprovedCount === 1 ? "" : "s"}
              </span>
            </Button>
          </div>
        </div>

        <Separator className="bg-white/10" />

        {loadingDrafts ? (
          <div className="flex items-center justify-center py-10 text-gray-300">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-sm">Loading drafts…</span>
          </div>
        ) : drafts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/20 p-10 text-center text-gray-300">
            No drafts yet. Generate new content to populate the library.
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => {
              const edits = draftEdits[draft.id] || { tags: "", reviewNotes: "", content: draft.content }
              const history = historyCache[draft.id]
              const isExpanded = expandedHistoryId === draft.id

              return (
                <motion.div
                  key={draft.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedDraftIds.has(draft.id)}
                        onCheckedChange={() => toggleDraftSelection(draft.id)}
                        className="mt-1 border-white/40"
                      />
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                          <Badge className={`${statusBadgeVariant[draft.status]} capitalize`}>{statusLabels[draft.status]}</Badge>
                          <Badge className="bg-purple-500/20 text-purple-200">{draft.category.replace(/-/g, " ")}</Badge>
                          <Badge className="bg-blue-500/20 text-blue-100">{draft.type}</Badge>
                          {draft.provider && (
                            <Badge className="bg-emerald-500/20 text-emerald-200">
                              {draft.provider.toUpperCase()}{draft.model ? ` · ${draft.model}` : ""}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-400">
                            Generated {new Date(draft.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <Textarea
                          value={edits.content}
                          onChange={(event) =>
                            setDraftEdits((prev) => ({
                              ...prev,
                              [draft.id]: { ...prev[draft.id], content: event.target.value },
                            }))
                          }
                          className="min-h-[140px] bg-black/30 text-white border-white/20"
                        />
                        <div className="flex flex-wrap gap-2 text-xs text-gray-300">
                          <Tags className="h-3.5 w-3.5 text-purple-200" />
                          {draft.tags.length ? (
                            draft.tags.map((tag) => (
                              <Badge key={tag} className="bg-purple-500/20 text-purple-100">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span>No tags yet</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 text-sm text-gray-300">
                      <label className="text-xs uppercase tracking-wide">Status</label>
                      <Select value={draft.status} onValueChange={(value) => handleStatusChange(draft.id, value as AIDraftStatus)}>
                        <SelectTrigger className="w-40 bg-white/10 text-white border-white/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["pending", "in_review", "needs_revision", "approved"] as AIDraftStatus[]).map((status) => (
                            <SelectItem key={status} value={status}>
                              {statusLabels[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {draft.publishedAt && (
                        <p className="text-xs text-emerald-200">
                          Published {new Date(draft.publishedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-wide text-gray-400">Tags</label>
                      <Input
                        value={edits.tags}
                        onChange={(event) =>
                          setDraftEdits((prev) => ({
                            ...prev,
                            [draft.id]: { ...prev[draft.id], tags: event.target.value },
                          }))
                        }
                        placeholder="comma separated"
                        className="bg-black/30 text-white border-white/20 placeholder:text-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-wide text-gray-400">Review Notes</label>
                      <Textarea
                        value={edits.reviewNotes}
                        onChange={(event) =>
                          setDraftEdits((prev) => ({
                            ...prev,
                            [draft.id]: { ...prev[draft.id], reviewNotes: event.target.value },
                          }))
                        }
                        placeholder="Context for editors"
                        className="min-h-[80px] bg-black/30 text-white border-white/20 placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={() => handleSaveDraft(draft.id)}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Save Draft Updates
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white"
                      onClick={() => handleHistoryToggle(draft.id)}
                    >
                      <History className="mr-2 h-4 w-4" />
                      {isExpanded ? "Hide" : "View"} History
                    </Button>
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded && history && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 overflow-hidden rounded-xl bg-black/40 p-4"
                      >
                        <h4 className="mb-2 text-sm font-semibold text-white">History</h4>
                        <div className="space-y-2 text-xs text-gray-200">
                          {history.length === 0 ? (
                            <p>No events recorded yet.</p>
                          ) : (
                            history.map((event) => (
                              <div key={event.id} className="rounded-lg bg-white/5 p-3">
                                <div className="flex flex-wrap items-center gap-2 text-gray-200">
                                  <Badge className="bg-white/10 text-white">{event.action.replace(/_/g, " ")}</Badge>
                                  <span>{event.actorName || "System"}</span>
                                  <span className="text-gray-400">
                                    {new Date(event.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                {event.payload && Object.keys(event.payload).length > 0 && (
                                  <pre className="mt-2 whitespace-pre-wrap text-[11px] text-gray-300">
                                    {JSON.stringify(event.payload, null, 2)}
                                  </pre>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
