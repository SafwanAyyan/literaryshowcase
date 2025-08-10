"use client"

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { BookOpen, Feather, Heart, Quote, Sparkles, ChevronDown, Library } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { PaperPlane } from 'lucide-react'
import { GradientButton } from './ui/gradient-button'

const floatingQuotes = [
  "Words have no single fixed meaning...",
  "Poetry is the spontaneous overflow...",
  "Literature is the art of discovering...",
  "In the depth of winter, I finally learned...",
  "The purpose of literature is to turn...",
]

const literaryElements = [
  { icon: BookOpen, delay: 0.2, position: { x: "10%", y: "20%" } },
  { icon: Feather, delay: 0.4, position: { x: "80%", y: "30%" } },
  { icon: Quote, delay: 0.6, position: { x: "15%", y: "70%" } },
  { icon: Heart, delay: 0.8, position: { x: "85%", y: "75%" } },
  { icon: Sparkles, delay: 1.0, position: { x: "50%", y: "15%" } },
]

export function EnhancedHeroSection() {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isLoaded, setIsLoaded] = useState(false) // For delayed animations
  const { scrollY } = useScroll()

  const backgroundY = useTransform(scrollY, [0, 500], [0, 150])
  const textY = useTransform(scrollY, [0, 500], [0, 100])
  const opacity = useTransform(scrollY, [0, 300], [1, 0])

  // Delay heavy animations until after initial render
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 1000) // 1 second delay
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % floatingQuotes.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Only start mouse tracking after initial load to improve performance
    if (!isLoaded) return

    let ticking = false
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setMousePosition({
            x: (e.clientX / window.innerWidth) * 100,
            y: (e.clientY / window.innerHeight) * 100,
          })
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [isLoaded])

  const scrollToContent = () => {
    const contentSection = document.querySelector("#content-section")
    contentSection?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Enhanced Background with Parallax */}
      <motion.div style={{ y: backgroundY }} className="absolute inset-0 -z-10">
        {/* Optimized Gradient Orbs - Delayed for better initial performance */}
        <motion.div
          animate={isLoaded ? {
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.1, 1],
          } : {}}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl"
        />
        <motion.div
          animate={isLoaded ? {
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1.1, 1, 1.1],
          } : {}}
          transition={{
            duration: 35,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl"
        />
        <motion.div
          animate={isLoaded ? {
            x: [0, 30, -30, 0],
            y: [0, -20, 20, 0],
          } : {}}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
          }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/4 rounded-full blur-3xl"
        />
      </motion.div>

      {/* Optimized Floating Literary Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {literaryElements.map((element, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isLoaded ? {
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            } : {
              opacity: 0.3,
              scale: 1,
            }}
            transition={{
              duration: isLoaded ? 12 : 0.8,
              repeat: isLoaded ? Infinity : 0,
              delay: isLoaded ? element.delay * 3 : element.delay * 0.5,
              ease: "easeInOut",
            }}
            className="absolute will-change-transform"
            style={{
              left: element.position.x,
              top: element.position.y,
              transform: isLoaded ? `translate(${(mousePosition.x - 50) * 0.01}px, ${(mousePosition.y - 50) * 0.01}px)` : 'translate(0, 0)',
            }}
          >
            <div className="bg-white/5 backdrop-blur-sm p-3 rounded-full border border-white/10">
              <element.icon className="w-6 h-6 text-purple-300" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Floating Quote - left aligned, larger, italic, premium font */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-24 left-6 sm:left-10 pointer-events-none"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuoteIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8 }}
            className="text-left"
          >
            <p
              className="text-gray-200/90 italic max-w-xl"
              style={{
                fontSize: '1.25rem',
                lineHeight: 1.5,
                fontFamily: `"SF Pro Display", "Segoe UI", system-ui, -apple-system, Arial, sans-serif`,
                textShadow: '0 1px 2px rgba(0,0,0,0.35)'
              }}
            >
              “{floatingQuotes[currentQuoteIndex]}”
            </p>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Main Content */}
      <motion.div
        style={{ y: textY, opacity }}
        className="max-w-2xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-6"
        >

          {/* Refined Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="p-3 rounded-xl backdrop-blur-sm border border-white/20 bg-gradient-to-br from-purple-500/30 via-fuchsia-500/20 to-indigo-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_10px_30px_rgba(0,0,0,0.35)]">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </motion.div>

          {/* Simple Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-3xl sm:text-4xl font-bold text-white"
          >
            Literary Showcase
          </motion.h1>

          {/* Simple Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg text-gray-300 max-w-lg mx-auto"
          >
            A curated collection of quotes, poems, and reflections
          </motion.p>

          {/* Simple CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Button
              onClick={scrollToContent}
              className="bg-gradient-to-r from-[#1e1e1f] to-[#2a0a37] hover:from-[#252526] hover:to-[#3a0f4d] text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_30px_rgba(0,0,0,0.35)]"
            >
              Explore Collection
            </Button>
            <div className="mt-3 flex justify-center">
              <Link href="/submit">
                <GradientButton leftIcon={<PaperPlane className="w-4 h-4" />}>Submit Your Content</GradientButton>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Bookmark Prompt (subtle) */}
      <div className="absolute top-6 right-6 hidden md:block">
        <div className="glass-card px-4 py-2 rounded-xl text-sm text-gray-200/90">
          Tip: Press Ctrl+D to bookmark
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.button
          onClick={scrollToContent}
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          className="flex flex-col items-center gap-2 text-gray-400 hover:text-white transition-colors group"
        >
          <span className="text-sm font-medium">Discover More</span>
          <motion.div
            whileHover={{ scale: 1.2 }}
            className="p-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 group-hover:bg-white/10 transition-all"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.button>
      </motion.div>
    </section>
  )
}
