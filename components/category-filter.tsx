"use client"

import { motion } from "framer-motion"
import { Search } from "lucide-react"
import type { Category } from "@/types/literary"

interface CategoryFilterProps {
  selectedCategory: Category | "all"
  onCategoryChange: (category: Category | "all") => void
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

export function CategoryFilter({
  selectedCategory,
  onCategoryChange,
  searchTerm,
  onSearchChange,
}: CategoryFilterProps) {
  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative max-w-md mx-auto"
      >
        <div className="glass-card p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search quotes, authors, or content..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </motion.div>

      {/* Category Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap justify-center gap-3"
      >
        {categories.map((category, index) => (
          <motion.button
            key={category.value}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onCategoryChange(category.value)}
            className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
              selectedCategory === category.value
                ? "bg-gradient-to-r from-purple-400 to-pink-400 text-white shadow-lg shadow-purple-400/25"
                : "glass-card text-gray-300 hover:text-white hover:bg-white/10"
            }`}
          >
            {category.label}
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}
