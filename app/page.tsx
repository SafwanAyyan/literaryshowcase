"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BookOpen, Send } from "lucide-react"
import Link from "next/link"
// import { literaryData } from "@/lib/data" // Now using database instead
// import { CategoryFilter } from "@/components/category-filter"
import { CollectionControls } from "@/components/collection-controls"
import { ContentCard } from "@/components/content-card"
import { EnhancedHeroSection } from "@/components/enhanced-hero-section"
import { LoadingSpinner } from "@/components/enhanced-loading-spinner"
import { FloatingParticles } from "@/components/floating-particles"
import { InteractiveBackground } from "@/components/interactive-background"
import { ContentRefresh } from "@/lib/content-refresh"
import type { ContentItem, Category, OrderByOption } from "@/types/literary"

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all")
  const [items, setItems] = useState<ContentItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [orderBy, setOrderBy] = useState<OrderByOption>("newest")
  const [author, setAuthor] = useState("")

  // Load content from database API with filters/sort
  const loadContent = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      if (author) params.set('author', author)
      if (searchTerm) params.set('q', searchTerm)
      if (orderBy) params.set('orderBy', orderBy)
      params.set('page', String(page))
      params.set('limit', '30')

      const response = await fetch(`/api/content/public?${params.toString()}`, { cache: 'no-store' })
      const result = await response.json()
      if (result.success) {
        setItems(result.items)
        setTotal(result.total)
        setPages(result.pages)
      } else {
        console.error('Failed to load content:', result.error)
      }
    } catch (error) {
      console.error('Error loading content:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory, author, searchTerm, orderBy, page])

  // Initial load
  useEffect(() => {
    loadContent()
  }, [loadContent])

  // Listen for content changes from admin panel
  useEffect(() => {
    const cleanup = ContentRefresh.listenForChanges(() => {
      console.log('Content updated, refreshing...')
      loadContent()
    })
    
    return cleanup
  }, [loadContent])

  // Reload when filters/sort/page change
  useEffect(() => {
    setIsLoading(true)
    loadContent()
  }, [selectedCategory, author, searchTerm, orderBy, page, loadContent])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 text-center"
        >
          <div className="inline-block mb-4">
            <BookOpen className="w-12 h-12 text-purple-400" />
          </div>
          <p className="text-white text-lg font-medium">Loading literary collection...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      {/* Enhanced Background Elements */}
      <InteractiveBackground />
      <FloatingParticles />

      <main className="relative z-10">
        <EnhancedHeroSection />

        {/* Guides CTA */}
        <section className="pt-10 px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-6xl mx-auto"
          >
            <div className="glass-card p-6 md:p-8 border border-white/10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Explore Guides</h2>
                  <p className="text-gray-300 mt-1">Learn through interactive lessons: Shakespeare, Dostoevsky and more.</p>
                </div>
                <Link href="/guides" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors">
                  <BookOpen className="w-4 h-4" />
                  <span>Open Guides</span>
                </Link>
              </div>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href="/authors/shakespeare" className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                  <div className="text-white font-medium">William Shakespeare</div>
                  <div className="text-gray-300 text-sm">Overview • Hamlet devices • scenes • audio • video</div>
                </Link>
                <Link href="/authors/dostoevsky" className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                  <div className="text-white font-medium">Fyodor Dostoevsky</div>
                  <div className="text-gray-300 text-sm">Overview • Crime & Punishment — summary • themes • video</div>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Call to Action Section */}
        <section className="py-12 px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="glass-card p-8 border border-purple-500/20">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Share Your Literary Voice
              </h2>
              <p className="text-gray-300 text-lg mb-6">
                Have a favorite quote, poem, or reflection? Contribute to our growing collection of literary wisdom.
              </p>
              <Link
                href="/submit"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-8 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
              >
                <Send className="w-5 h-5" />
                <span>Submit Your Content</span>
              </Link>
            </div>
          </motion.div>
        </section>

        <section id="content-section" className="px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-7xl mx-auto">
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, margin: "-50px" }}
               transition={{ duration: 0.4, delay: 0.1 }}
               className="mb-12"
             >
              <CollectionControls
                selectedCategory={selectedCategory}
                onCategoryChange={(c) => { setPage(1); setSelectedCategory(c) }}
                author={author}
                onAuthorChange={(a) => { setPage(1); setAuthor(a) }}
                orderBy={orderBy}
                onOrderByChange={(o) => { setPage(1); setOrderBy(o) }}
                searchTerm={searchTerm}
                onSearchChange={(t) => { setPage(1); setSearchTerm(t) }}
              />
            </motion.div>

            <AnimatePresence mode="popLayout">
              <motion.div
                key={selectedCategory + searchTerm + author + orderBy + page}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6"
              >
                {items.map((item, index) => (
                  <motion.div
                    key={`${item.id}-${selectedCategory}-${index}`}
                    initial={{ opacity: 0, y: 18, scale: 0.985 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.32, delay: Math.min(index * 0.025, 0.25) }}
                  >
                    <ContentCard item={item} />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {items.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <div className="glass-card p-8 max-w-md mx-auto">
                  <h3 className="text-xl font-semibold text-white mb-2">No content found</h3>
                  <p className="text-gray-300">Try adjusting your search or filter criteria.</p>
                </div>
              </motion.div>
            )}

            {/* Pagination */}
            {items.length > 0 && pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  className="px-4 py-2 rounded-lg glass-card disabled:opacity-50"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <span className="text-gray-300 text-sm">Page {page} of {pages}</span>
                <button
                  className="px-4 py-2 rounded-lg glass-card disabled:opacity-50"
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Floating Action Button for Submissions */}
      <Link
        href="/submit"
        className="fixed bottom-6 right-6 z-50 group"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 1.5
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 relative overflow-hidden"
        >
          {/* Background animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
          
          {/* Icon */}
          <div className="relative z-10 flex items-center justify-center">
            <Send className="w-6 h-6" />
          </div>
          
          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-black/80 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            Submit Your Content
          </div>
          
          {/* Pulse animation */}
          <div className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20" />
        </motion.div>
      </Link>
    </div>
  )
}
