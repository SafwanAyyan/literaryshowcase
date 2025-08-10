"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ListFilter, User, SortAsc, SortDesc } from "lucide-react"
import type { Category, OrderByOption } from "@/types/literary"

type Props = {
  selectedCategory: Category | "all"
  onCategoryChange: (category: Category | "all") => void

  author: string
  onAuthorChange: (author: string) => void

  orderBy: OrderByOption
  onOrderByChange: (orderBy: OrderByOption) => void

  searchTerm: string
  onSearchChange: (term: string) => void
}

const categories: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "found-made", label: "Reflections" },
  { value: "cinema", label: "Cinema" },
  { value: "literary-masters", label: "Literary Masters" },
  { value: "spiritual", label: "Spiritual" },
  { value: "original-poetry", label: "Original Poetry" },
  { value: "heartbreak", label: "Heartbreak" },
]

const orderByOptions: { value: OrderByOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "author-asc", label: "Author A→Z" },
  { value: "author-desc", label: "Author Z→A" },
  { value: "likes", label: "Most Liked" },
  { value: "views", label: "Most Viewed" },
]

export function CollectionControls({
  selectedCategory,
  onCategoryChange,
  author,
  onAuthorChange,
  orderBy,
  onOrderByChange,
  searchTerm,
  onSearchChange,
}: Props) {
  const [authors, setAuthors] = useState<string[]>([])
  const [loadingAuthors, setLoadingAuthors] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadingAuthors(true)
    fetch("/api/content/public/authors", { cache: "force-cache" })
      .then((r) => r.json())
      .then((res) => {
        if (!cancelled && res.success) setAuthors(res.authors || [])
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingAuthors(false))
    return () => {
      cancelled = true
    }
  }, [])

  const authorOptions = useMemo(() => ["All authors", ...authors], [authors])

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        {/* Category */}
        <div className="glass-card p-3">
          <label className="text-xs text-gray-400 block mb-1">Category</label>
          <div className="relative">
            <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value as Category | "all")}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-transparent"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Author */}
        <div className="glass-card p-3">
          <label className="text-xs text-gray-400 block mb-1">Author</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={author || ""}
              onChange={(e) => onAuthorChange(e.target.value === "" || e.target.value === "All authors" ? "" : e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-transparent"
            >
              {authorOptions.map((a) => (
                <option key={a || 'all-authors'} value={a === "All authors" ? "" : a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Order By */}
        <div className="glass-card p-3">
          <label className="text-xs text-gray-400 block mb-1">Order by</label>
          <div className="relative">
            {(orderBy === "author-desc" || orderBy === "oldest") ? (
              <SortDesc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            ) : (
              <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            )}
            <select
              value={orderBy}
              onChange={(e) => onOrderByChange(e.target.value as OrderByOption)}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-transparent"
            >
              {orderByOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-3"
      >
        <input
          type="text"
          placeholder="Search quotes, authors, or content..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            // Prevent Enter from submitting any outer form/navigation
            if (e.key === 'Enter') {
              e.preventDefault()
            }
          }}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-transparent"
        />
      </motion.div>

      {/* Quick category buttons (bottom, left-aligned) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-wrap gap-4 justify-center"
      >
        {categories.map((c) => (
          <button
            key={`quick-${c.value}`}
            onClick={() => onCategoryChange(c.value)}
            className={`rounded-full px-6 py-3 text-lg transition-all backdrop-blur-md border shadow-sm
              ${selectedCategory === c.value
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-purple-500/30 hover:shadow-purple-500/40 ring-2 ring-white/20'
                : 'bg-white/10 text-white/90 border-white/15 hover:bg-white/15 hover:border-white/25 hover:-translate-y-0.5'}
            `}
            aria-pressed={selectedCategory === c.value}
          >
            {c.label}
          </button>
        ))}
      </motion.div>
    </div>
  )
}


