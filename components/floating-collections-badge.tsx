"use client"

import { useEffect, useState } from 'react'
import { Bookmark, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useCollections } from '@/hooks/use-collections'

export function FloatingCollectionsBadge() {
  const { collections, loading } = useCollections()
  const [show, setShow] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  const totalItems = collections.reduce((sum, col) => sum + col.items.length, 0)
  const shouldShow = !loading && totalItems > 0

  useEffect(() => {
    // SIMPLIFIED: Show badge whenever there are saved items
    if (shouldShow) {
      const dismissed = localStorage.getItem('collections_badge_dismissed')
      const now = Date.now()
      const dismissedTime = dismissed ? parseInt(dismissed) : 0
      
      // Show if not dismissed, or dismissed more than 1 hour ago
      if (!dismissed || now - dismissedTime > 3600000) {
        setShow(true)
      }
    }
  }, [shouldShow, totalItems])

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShow(false)
    localStorage.setItem('collections_badge_dismissed', Date.now().toString())
  }

  const handleClick = () => {
    setHasInteracted(true)
    setShow(false)
  }

  if (!shouldShow) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: "spring", damping: 20 }}
          className="fixed bottom-24 right-6 z-50"
        >
          <div className="relative">
          <Link
            href="/profile"
            onClick={handleClick}
            className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 hover:from-purple-700 hover:via-purple-600 hover:to-pink-700 text-white rounded-full shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/80 transition-all duration-300 group border-2 border-white/20 cursor-pointer relative z-10"
          >
            <div className="relative">
              <Bookmark className="w-5 h-5" fill="currentColor" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-white text-purple-700 text-xs font-bold flex items-center justify-center">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </div>
            
            <div className="flex flex-col">
              <span className="font-semibold text-sm">
                {collections.length} Collection{collections.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-purple-100">
                {totalItems} saved item{totalItems !== 1 ? 's' : ''}
              </span>
            </div>

            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />

            <button
              onClick={handleDismiss}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs font-bold transition-colors"
              aria-label="Dismiss"
            >
              ×
            </button>
          </Link>

          {/* Pulse animation to draw attention */}
          <motion.div
            className="absolute inset-0 rounded-full bg-purple-500/30 pointer-events-none"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
