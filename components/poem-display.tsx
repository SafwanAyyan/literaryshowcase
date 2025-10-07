"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Pause, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PoemDisplayProps {
  content: string
  title?: string
  author: string
  isExpanded?: boolean
}

export function PoemDisplay({ content, title, author, isExpanded = false }: PoemDisplayProps) {
  const [animationState, setAnimationState] = useState<"idle" | "playing" | "paused">("idle")
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [showControls, setShowControls] = useState(false)

  // Parse the poem content into lines and apply formatting
  const parsePoem = (text: string) => {
    return text.split("\n").map((line, index) => {
      // Apply formatting: *text* for italic, **text** for bold, ***text*** for bold italic
      const formattedLine = line
        .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/~(.+?)~/g, '<span class="text-purple-300">$1</span>')

      return {
        id: index,
        original: line,
        formatted: formattedLine,
        isEmpty: line.trim() === "",
      }
    })
  }

  const lines = parsePoem(content)
  const totalLines = lines.length

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (animationState === "playing") {
      interval = setInterval(() => {
        setCurrentLineIndex((prev) => {
          if (prev >= totalLines - 1) {
            setAnimationState("idle")
            return totalLines - 1
          }
          return prev + 1
        })
      }, 800) // Adjust timing as needed
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [animationState, totalLines])

  const handlePlayPause = () => {
    if (animationState === "idle" || animationState === "paused") {
      setAnimationState("playing")
    } else {
      setAnimationState("paused")
    }
  }

  const handleReset = () => {
    setAnimationState("idle")
    setCurrentLineIndex(0)
  }

  const shouldShowLine = (index: number) => {
    if (!isExpanded) return true
    if (animationState === "idle") return true
    return index <= currentLineIndex
  }

  return (
    <div className="relative" onMouseEnter={() => setShowControls(true)} onMouseLeave={() => setShowControls(false)}>
      {/* Animation Controls */}
      <AnimatePresence>
        {showControls && isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-12 right-0 flex gap-2 z-10"
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePlayPause}
              className="h-8 w-8 p-0 bg-white/10 hover:bg-white/20 text-white"
            >
              {animationState === "playing" ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReset}
              className="h-8 w-8 p-0 bg-white/10 hover:bg-white/20 text-white"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Poem Title */}
      {title && (
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-bold text-purple-300 mb-4 text-center font-serif"
        >
          "{title}"
        </motion.h3>
      )}

      {/* Poem Content */}
      <div className="space-y-1">
        {lines.map((line, index) => (
          <motion.div
            key={line.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{
              opacity: shouldShowLine(index) ? 1 : 0.3,
              x: shouldShowLine(index) ? 0 : -20,
            }}
            transition={{
              duration: 0.6,
              delay: isExpanded && animationState === "playing" ? 0 : index * 0.1,
              ease: "easeOut",
            }}
            className={`leading-relaxed ${
              line.isEmpty
                ? "h-4" // Empty line spacing
                : "text-gray-100"
            }`}
          >
            {line.isEmpty ? (
              <div className="h-4" />
            ) : (
              <span
                className="font-medium text-base sm:text-lg leading-loose font-serif"
                dangerouslySetInnerHTML={{ __html: line.formatted }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Author Attribution */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-6 text-right"
      >
        <span className="text-gray-400 italic text-sm">— {author}</span>
      </motion.div>

      {/* Decorative Elements */}
      <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-purple-400/20 to-transparent rounded-full" />
      <div className="absolute -right-4 bottom-0 w-1 h-1/2 bg-gradient-to-t from-pink-400/20 to-transparent rounded-full" />
    </div>
  )
}
