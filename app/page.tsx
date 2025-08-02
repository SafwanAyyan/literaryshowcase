"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BookOpen } from "lucide-react"
// import { literaryData } from "@/lib/data" // Now using database instead
import { CategoryFilter } from "@/components/category-filter"
import { EnhancedContentCard } from "@/components/enhanced-content-card"
import { EnhancedHeroSection } from "@/components/enhanced-hero-section"
import { LoadingSpinner } from "@/components/loading-spinner"
import { FloatingParticles } from "@/components/floating-particles"
import { InteractiveBackground } from "@/components/interactive-background"
import { ContentRefresh } from "@/lib/content-refresh"
import type { ContentItem, Category } from "@/types/literary"

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all")
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([])
  const [allContent, setAllContent] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Load content from database API
  const loadContent = useCallback(async () => {
    try {
      const response = await fetch('/api/content/public', {
        cache: 'no-store', // Always fetch fresh data
        next: { revalidate: 60 } // Cache for 60 seconds for better performance
      })
      const result = await response.json()
      if (result.success) {
        setAllContent(result.data)
      } else {
        console.error('Failed to load content:', result.error)
      }
    } catch (error) {
      console.error('Error loading content:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

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

  // Filter content based on category and search
  useEffect(() => {
    let filtered = allContent

    if (selectedCategory !== "all") {
      filtered = allContent.filter((item) => item.category === selectedCategory)
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.author.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredContent(filtered)
  }, [selectedCategory, searchTerm, allContent])

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

        <section id="content-section" className="px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-12"
            >
              <CategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedCategory + searchTerm}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                data-category={selectedCategory}
              >
                {filteredContent.map((item, index) => (
                  <motion.div
                    key={`${item.id}-${selectedCategory}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{
                      duration: 0.3,
                      delay: Math.min(index * 0.03, 0.3), // Faster loading with shorter delays
                      ease: "easeOut",
                    }}
                  >
                    <EnhancedContentCard item={item} />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {filteredContent.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <div className="glass-card p-8 max-w-md mx-auto">
                  <h3 className="text-xl font-semibold text-white mb-2">No content found</h3>
                  <p className="text-gray-300">Try adjusting your search or filter criteria.</p>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
