"use client"

import { motion } from "framer-motion"
import { BookOpen, Send } from "lucide-react"
import Link from "next/link"

export function Navigation() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 p-4 sm:p-6"
    >
      <div className="max-w-7xl mx-auto">
        <div className="glass-card px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Literary Showcase</h1>
              <p className="text-xs text-gray-300">Words that move souls</p>
            </div>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link href="/guides" className="text-gray-300 hover:text-white">Guides</Link>
            <Link
              href="/submit"
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Submit Content</span>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
