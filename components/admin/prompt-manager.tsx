"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Save, Eye, RotateCcw, History, ShieldQuestion, Wand2 } from "lucide-react"

type UseCase = "generate" | "findSource" | "explain" | "analyze"

type PromptRow = {
  id: string
  useCase: UseCase
  provider?: string | null
  model?: string | null
  content: string
  version: number
  active: boolean
  createdBy?: string | null
  updatedBy?: string | null
  createdAt: string
  updatedAt: string
}

type PromptVersion = {
  id: string
  promptId: string
  version: number
  provider?: string | null
  model?: string | null
  content: string
  editor?: string | null
  createdAt: string
}

export function PromptManager() {
  const [useCase, setUseCase] = useState<UseCase>("explain")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [active, setActive] = useState<PromptRow | null>(null)
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [editor, setEditor] = useState<string>("")
  const [prevVersion, setPrevVersion] = useState<number | null>(null)
  const [sampleInput, setSampleInput] = useState<string>("")
  const [preview, setPreview] = useState<any>(null)
  const [error, setError] = useState<string>("")

  const useCaseHelp = useMemo(() => {
    switch (useCase) {
      case "explain":
        return "Explain: concise, faithful meaning. Structure: Quoted metaphor → Meaning (emphasized) → Context → Theme links with brief evidence."
      case "analyze":
        return "Analyze: must return ONLY valid JSON {themes, literaryDevices, metaphors, tone, style, imagery, summary}. Keep items concise and faithful."
      case "findSource":
        return "Find Source: identify likely author/source with conservative confidence. Return ONLY JSON {author, source?, confidence}."
      case "generate":
        return "Generate: high‑quality originals driven by UI fields. Base prompt may use tokens {{category}}, {{type}}, {{theme}}, {{tone}}, {{quantity}}, {{writingMode}}. Output ONLY JSON { items: [{ content, source }] }."
      default:
        return ""
    }
  }, [useCase])

  async function load() {
    setLoading(true)
    setError("")
    setPreview(null)
    try {
      const r = await fetch(`/api/admin/prompts?useCase=${useCase}`, { cache: "no-store" })
      const j = await r.json()
      if (!j.success) {
        setError(j.error || "Failed to load")
        setActive(null)
        setVersions([])
        return
      }
      const data = j.data || {}
      const a: PromptRow | null = data.active || null
      const v: PromptVersion[] = data.versions || []
      setActive(a)
      setVersions(v)
      setEditor(a?.content || defaultScaffold(useCase))
      setPrevVersion(a?.version ?? null)
    } catch (e: any) {
      setError(e?.message || "Network error")
      setActive(null)
      setVersions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCase])

  function defaultScaffold(u: UseCase) {
    if (u === "explain") {
      return [
        "You are a helpful literary assistant.",
        "Return a concise explanation that explicitly includes, in order:",
        "1) Quoted metaphor, 2) Meaning (visually emphasized by client), 3) Contextual relevance, 4) Connections to themes with brief evidence.",
        "Keep total length within reasonable bounds; avoid spoilers."
      ].join("\n")
    }
    if (u === "analyze") {
      return [
        "You are a precise literary analyst.",
        "Return ONLY valid JSON with keys: themes, literaryDevices, metaphors, tone, style, imagery, summary.",
        "Keep items concise and faithful to the text."
      ].join("\n")
    }
    if (u === "findSource") {
      return [
        "You are a literary and cultural expert.",
        "Analyze the provided text and identify its likely author and source.",
        "Return ONLY JSON: {\"author\": string, \"source\"?: string, \"confidence\": \"high\"|\"medium\"|\"low\"}.",
        "Be conservative; prefer {author:\"Unknown\", confidence:\"low\"} when uncertain.",
        "Avoid propagating common misattributions."
      ].join("\n")
    }
    // generate
    return [
      "You are a master curator and writer for a prestigious literary showcase.",
      "Variables available: {{category}}, {{type}}, {{theme}}, {{tone}}, {{quantity}}, {{writingMode}}.",
      "Write with emotional depth, freshness, and authentic human cadence. Avoid cliché and filler.",
      "Guarantee diversity across items: different imagery, angle, and structure.",
      "Output ONLY JSON of shape: {\"items\":[{\"content\":\"...\",\"source\":null}]}."
    ].join("\n")
  }

  async function onSave() {
    if (!window.confirm("Apply this prompt as the new active version? This will affect runtime immediately.")) return
    setSaving(true)
    setError("")
    try {
      const r = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          useCase,
          content: editor,
          previousVersion: prevVersion,
        }),
      })
      const j = await r.json()
      if (!j.success) {
        setError(j.error || "Save failed")
        return
      }
      await load()
    } catch (e: any) {
      setError(e?.message || "Network error")
    } finally {
      setSaving(false)
    }
  }

  async function onRollback(version: number) {
    if (!window.confirm(`Rollback ${useCase} prompt to version ${version}? This creates a new active version.`)) return
    setSaving(true)
    setError("")
    try {
      const r = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rollback",
          useCase,
          targetVersion: version,
        }),
      })
      const j = await r.json()
      if (!j.success) {
        setError(j.error || "Rollback failed")
        return
      }
      await load()
    } catch (e: any) {
      setError(e?.message || "Network error")
    } finally {
      setSaving(false)
    }
  }

  async function onPreview() {
    if (!sampleInput.trim()) {
      setError("Enter sample input for preview")
      return
    }
    setPreviewing(true)
    setPreview(null)
    setError("")
    try {
      const r = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          useCase,
          content: editor,
          sampleInput,
          question: "Explain this in simple terms",
        }),
      })
      const j = await r.json()
      if (!j.success) {
        setError(j.error || "Preview failed")
        return
      }
      setPreview(j.data?.preview ?? null)
    } catch (e: any) {
      setError(e?.message || "Network error")
    } finally {
      setPreviewing(false)
    }
  }

  const hasChanges = (active?.content || "") !== editor

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">System/Base Prompt Manager</h3>
          <p className="text-gray-300 text-sm">Edit and version base prompts per use case. Changes apply at runtime with hot reload.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="brand" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" /> Reload
          </Button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="grid md:grid-cols-12 gap-4">
          <div className="md:col-span-3 space-y-3">
            <label className="block text-sm text-gray-300 mb-1">Use case</label>
            <select
              value={useCase}
              onChange={(e) => setUseCase(e.target.value as UseCase)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            >
              <option value="explain">Explain</option>
              <option value="analyze">Analyze</option>
              <option value="findSource">Find Source</option>
              <option value="generate">Generate</option>
            </select>

            <div className="rounded-lg border border-white/10 p-3 bg-white/5 text-xs text-gray-300">
              <div className="flex items-center gap-2 font-medium text-white mb-2"><ShieldQuestion className="w-4 h-4" /> Guidance</div>
              <p>{useCaseHelp}</p>
            </div>

            <div className="space-y-2">
              <div className="text-white font-medium flex items-center gap-2"><History className="w-4 h-4" /> Versions</div>
              <div className="max-h-72 overflow-auto space-y-2 pr-1">
                {loading && <div className="text-gray-400 text-sm">Loading…</div>}
                {!loading && versions.length === 0 && <div className="text-gray-400 text-sm">No versions</div>}
                {versions.map((v) => (
                  <div key={v.id} className={`p-2 rounded border ${active?.version === v.version ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/10 bg-white/5'}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-white text-sm">v{v.version}</div>
                      <div className="text-xs text-gray-400">{new Date(v.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button variant="brand" size="sm" className="h-7 px-2" onClick={() => setEditor(v.content)}>
                        Load
                      </Button>
                      <Button variant="brand" size="sm" className="h-7 px-2" onClick={() => onRollback(v.version)}>
                        <RotateCcw className="w-3 h-3" /> Rollback
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-9 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-gray-300 text-sm">
                {active ? (
                  <>
                    Active v{active.version} • Updated {new Date(active.updatedAt).toLocaleString()} {active.updatedBy ? `by ${active.updatedBy}` : ""}
                  </>
                ) : (
                  "No active prompt found; using fallback."
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="brand" size="sm" onClick={() => setEditor(defaultScaffold(useCase))}>
                  <Wand2 className="w-4 h-4" /> Insert template
                </Button>
                <Button variant="brand" size="sm" disabled={!hasChanges || saving} onClick={onSave}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </Button>
              </div>
            </div>

            <textarea
              value={editor}
              onChange={(e) => setEditor(e.target.value)}
              className="w-full min-h-[240px] bg-white/5 border border-white/10 rounded-lg text-white p-3 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              placeholder="Enter system/base prompt for this use case…"
            />

            <div className="rounded-xl border border-white/10 p-3 bg-white/5">
              <div className="flex items-center justify-between">
                <div className="text-white font-medium flex items-center gap-2"><Eye className="w-4 h-4" /> Dry‑run preview</div>
                <Button variant="brand" size="sm" disabled={previewing} onClick={onPreview}>
                  {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview
                </Button>
              </div>
              <div className="mt-2 grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Sample input</label>
                  <textarea
                    value={sampleInput}
                    onChange={(e) => setSampleInput(e.target.value)}
                    className="w-full min-h-[100px] bg-white/5 border border-white/10 rounded-lg text-white p-3"
                    placeholder="Paste a snippet of text to preview with this prompt…"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">First tokens / result</label>
                  <pre className="w-full min-h-[100px] bg-black/30 border border-white/10 rounded-lg text-purple-100 p-3 overflow-auto text-xs">
{typeof preview === "string" ? preview : JSON.stringify(preview, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {active && hasChanges && (
              <div className="rounded-xl border border-yellow-500/30 p-3 bg-yellow-500/10 text-yellow-100 text-sm">
                You have unsaved changes. Saving will create a new version and immediately activate it at runtime.
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 p-3 bg-red-500/10 text-red-100 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}