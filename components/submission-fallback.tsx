"use client"

import { motion } from 'framer-motion'
import { AlertCircle, Mail, RefreshCw } from 'lucide-react'

interface SubmissionFallbackProps {
  onRetry?: () => void
}

export function SubmissionFallback({ onRetry }: SubmissionFallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8 max-w-md mx-auto text-center"
    >
      <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-white mb-2">Service Temporarily Unavailable</h3>
      <p className="text-gray-300 mb-6">
        The submission service is currently being updated. Please try again in a few minutes or contact us directly.
      </p>
      
      <div className="space-y-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
        
        <a
          href="mailto:admin@literaryshowcase.com?subject=Content Submission"
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Email Submission
        </a>
      </div>
    </motion.div>
  )
}