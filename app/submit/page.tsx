"use client"

import { motion } from 'framer-motion'
import { SubmissionForm } from '@/components/submission-form'
import { FloatingParticles } from '@/components/floating-particles'
import { InteractiveBackground } from '@/components/interactive-background'
import { Navigation } from '@/components/navigation'

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      <InteractiveBackground />
      <FloatingParticles />
      
      <div className="relative z-10">
        <Navigation />
        
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Share Your Literary Wisdom
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Contribute to our growing collection of quotes, poems, and reflections. 
              Your submissions help enrich our literary community.
            </p>
          </motion.div>
          
          <SubmissionForm />
        </div>
      </div>
    </div>
  )
} 