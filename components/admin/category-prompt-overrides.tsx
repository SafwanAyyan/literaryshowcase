"use client"

import { useEffect, useMemo, useState } from "react"
import { RefreshCw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import toast from "react-hot-toast"

type OverridesMap = Record<string, string>

export function CategoryPromptOverrides() {
  const [overrides, setOverrides] = useState<OverridesMap>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState("")

  const ordered = useMemo(() => {
    const keys = Object.keys(overrides || {}).sort()
    return keys.filter(k => !filter || k.toLowerCase().includes(filter.toLowerCase()))
  }, [overrides, filter])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch("/api/admin/prompt-overrides", { cache: "no-store" })
      const j = await r.json()
      if (!j.success) {
        toast.error(j.error || "Failed to load overrides")
        return
      }
      setOverrides(j.data?.overrides || {})
    } catch (e: any) {
      toast.error(e?.message || "Failed to load overrides")
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const r = await fetch("/api/admin/prompt-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      })
      const j = await r.json()
      if (!j.success) {
        toast.error(j.error || "Failed to save overrides")
        return
      }
      toast.success("Category overrides saved")
    } catch (e: any) {
      toast.error(e?.message || "Failed to save overrides")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Category Prompt Overrides</h3>
          <p className="text-gray-300 text-sm">
            Add short, category‑specific guidance appended to Generate prompts. Stored in config/prompt-overrides.json.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="brand" size="sm" onClick={load} round="pill">
            <RefreshCw className="w-4 h-4" /> Reload
          </Button>
          <Button variant="brand" size="sm" onClick={save} disabled={saving} round="pill">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter categories…"
          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {loading && <div className="text-gray-300">Loading…</div>}
        {!loading && ordered.length === 0 && (
          <div className="text-gray-400">No categories found.</div>
        )}
        {ordered.map((key) => (
          <div key={key} className="rounded-xl border border-white/10 p-3 bg-white/5">
            <div className="text-white font-medium mb-2">{key}</div>
            <textarea
              value={overrides[key] || ""}
              onChange={(e) =>
                setOverrides((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className="w-full min-h-[120px] bg-black/30 border border-white/10 rounded-xl text-purple-100 p-3 text-sm"
              placeholder="- Write short, concrete guidance for this category…"
            />
          </div>
        ))}
      </div>
    </div>
  )
}