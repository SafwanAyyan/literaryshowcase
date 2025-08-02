"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Quote, User, Calendar, ChevronDown, ChevronUp, BookOpen, Sparkles } from "lucide-react"
import { PoemDisplay } from "./poem-display"
import type { ContentItem } from "@/types/literary"

interface EnhancedContentCardProps {
  item: ContentItem
}

export function EnhancedContentCard({ item }: EnhancedContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldTruncate = item.content.length > 200
  const isPoem = item.type === "poem"
  const isLongPoem = isPoem && item.content.split("\n").length > 8

  const truncatedContent = shouldTruncate ? item.content.substring(0, 200) + "..." : item.content

  const getIcon = () => {
    switch (item.type) {
      case "poem":
        return <BookOpen className="w-5 h-5 text-purple-300" />
      case "quote":
        return <Quote className="w-5 h-5 text-blue-300" />
      default:
        return <Sparkles className="w-5 h-5 text-pink-300" />
    }
  }

  const getCardStyle = () => {
    const baseClasses = "glass-card group cursor-pointer h-full flex flex-col"
    if (isPoem) {
      return `${baseClasses} p-8 border-purple-400/20 bg-gradient-to-br from-purple-900/10 to-pink-900/5`
    }
    return `${baseClasses} p-6`
  }

  return (
    <motion.div
      layout
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={getCardStyle()}
      onClick={() => (shouldTruncate || isLongPoem) && setIsExpanded(!isExpanded)}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="bg-gradient-to-r from-purple-400/20 to-pink-400/20 p-2 rounded-lg flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getCategoryStyle(item.category)}`}
            >
              {getCategoryLabel(item.category)}
            </span>
            {isPoem && (
              <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-400/20 text-purple-300">
                Poetry
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content - Flex grow to fill available space */}
      <div className="flex-grow mb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={isExpanded ? "expanded" : "collapsed"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {isPoem ? (
              <PoemDisplay
                content={isExpanded ? item.content : truncatedContent}
                title={item.source}
                author={item.author}
                isExpanded={isExpanded}
              />
            ) : (
              <blockquote className="text-gray-100 leading-relaxed font-medium text-base sm:text-lg">
                <span
                  dangerouslySetInnerHTML={{
                    __html: (isExpanded ? item.content : truncatedContent)
                      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
                      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.+?)\*/g, "<em>$1</em>")
                      .replace(/~(.+?)~/g, '<span class="text-purple-300">$1</span>'),
                  }}
                />
              </blockquote>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Expand/Collapse Button */}
      {(shouldTruncate || isLongPoem) && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 text-purple-300 hover:text-purple-200 text-sm font-medium mb-4 transition-colors group"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 group-hover:translate-y-[-2px] transition-transform" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 group-hover:translate-y-[2px] transition-transform" />
              {isPoem ? "Read full poem" : "Read more"}
            </>
          )}
        </motion.button>
      )}

      {/* Footer - Stick to bottom */}
      <div className="mt-auto">
        <div className="flex items-center justify-between text-sm text-gray-400 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="font-medium">{item.author}</span>
          </div>
          {item.source && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="italic">{item.source}</span>
            </div>
          )}
        </div>

        {/* Reading Time Estimate for Poems */}
        {isPoem && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            ~{Math.ceil(item.content.split(" ").length / 200)} min read
          </div>
        )}
      </div>
    </motion.div>
  )
}

function getCategoryStyle(category: string): string {
  const styles = {
    "found-made": "bg-blue-400/20 text-blue-300 border border-blue-400/30",
    cinema: "bg-red-400/20 text-red-300 border border-red-400/30",
    "literary-masters": "bg-green-400/20 text-green-300 border border-green-400/30",
    spiritual: "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30",
    "original-poetry": "bg-purple-400/20 text-purple-300 border border-purple-400/30",
  }
  return styles[category as keyof typeof styles] || "bg-gray-400/20 text-gray-300 border border-gray-400/30"
}

function getCategoryLabel(category: string): string {
  const labels = {
    "found-made": "Reflection",
    cinema: "Cinema",
    "literary-masters": "Literary Master",
    spiritual: "Spiritual",
    "original-poetry": "Original Poetry",
  }
  return labels[category as keyof typeof labels] || "Unknown"
}
