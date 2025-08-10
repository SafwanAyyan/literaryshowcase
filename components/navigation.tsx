"use client"

import { motion } from "framer-motion"
import { Library, Send } from "lucide-react"
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
        <div className="glass-card px-6 py-4 flex items-center justify-between rounded-2xl">
          <Link href="/" className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-[#1e1e1f] to-[#2a0a37] rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_rgba(0,0,0,0.35)]">
              <Library className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white" style={{fontFamily: '"SF Pro Display", "Segoe UI", system-ui, -apple-system'}}>
                Literary Showcase
              </h1>
              <p className="text-xs text-gray-300">Words that move souls</p>
            </div>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link href="/guides" className="text-gray-300 hover:text-white">Guides</Link>
            <Link
              href="/submit"
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#1e1e1f] to-[#2a0a37] hover:from-[#252526] hover:to-[#3a0f4d] text-white rounded-xl transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_rgba(0,0,0,0.35)]"
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
