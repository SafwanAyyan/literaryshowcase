"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Quote, User, Calendar, ChevronDown, ChevronUp, Copy, Check } from "lucide-react"
import type { ContentItem } from "@/types/literary"
import Link from "next/link"

interface ContentCardProps {
  item: ContentItem
}

export function ContentCard({ item }: ContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const shouldTruncate = item.content.length > 200

  const truncatedContent = shouldTruncate ? item.content.substring(0, 200) + "..." : item.content

  return (
    <motion.div
      layout
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="glass-card p-5 sm:p-6 h-full group cursor-pointer rounded-xl"
      onClick={() => shouldTruncate && setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-gradient-to-r from-purple-400/20 to-pink-400/20 p-2 rounded-lg flex-shrink-0">
          <Quote className="w-5 h-5 text-purple-300" />
          </div>
          <div className="flex-1 min-w-0">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getCategoryStyle(item.category)}`}
            >
              {getCategoryLabel(item.category)}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard.writeText(item.content).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }).catch(()=>{})
          }}
          aria-label="Copy quote"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-gray-200 text-xs border border-white/10 transition-colors shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={isExpanded ? "expanded" : "collapsed"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <blockquote className="text-gray-100 leading-relaxed mb-4 sm:mb-5 font-medium text-base sm:text-lg">
            {isExpanded ? item.content : truncatedContent}
          </blockquote>
        </motion.div>
      </AnimatePresence>

      {shouldTruncate && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1 text-purple-300 hover:text-purple-200 text-sm font-medium mb-4 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Read more
            </>
          )}
        </motion.button>
      )}

      <div className="flex flex-wrap items-center justify-between gap-y-2 text-sm text-gray-400 border-t border-white/10 pt-4 sm:pt-5">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span className="font-medium">{item.author}</span>
        </div>
        {item.source && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{item.source}</span>
          </div>
        )}
      </div>

      <div className="mt-3 sm:mt-4">
        <Link prefetch href={`/content/${item.id}`} className="group inline-flex items-center justify-center w-full px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors">
          <span className="mr-2">View details</span>
          <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </Link>
      </div>
    </motion.div>
  )
}

function getCategoryStyle(category: string): string {
  const styles = {
    "found-made": "bg-blue-400/20 text-blue-300",
    cinema: "bg-red-400/20 text-red-300",
    "literary-masters": "bg-green-400/20 text-green-300",
    spiritual: "bg-yellow-400/20 text-yellow-300",
    "original-poetry": "bg-purple-400/20 text-purple-300",
    heartbreak: "bg-rose-400/20 text-rose-300",
  }
  return styles[category as keyof typeof styles] || "bg-gray-400/20 text-gray-300"
}

function getCategoryLabel(category: string): string {
  const labels = {
    "found-made": "Reflection",
    cinema: "Cinema",
    "literary-masters": "Literary Master",
    spiritual: "Spiritual",
    "original-poetry": "Original Poetry",
    heartbreak: "Heartbreak",
  }
  return labels[category as keyof typeof labels] || "Unknown"
}
