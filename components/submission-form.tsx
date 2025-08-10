"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, BookOpen, User, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react'
import type { Category } from '@/types/literary'

interface SubmissionFormProps {
  onSuccess?: () => void
}

export function SubmissionForm({ onSuccess }: SubmissionFormProps) {
  const [formData, setFormData] = useState({
    content: '',
    author: '',
    source: '',
    category: 'found-made' as Category,
    type: 'quote' as 'quote' | 'poem' | 'reflection',
    submitterName: '',
    submitterEmail: '',
    submitterMessage: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const categories: { value: Category; label: string; description: string }[] = [
    { value: 'found-made', label: 'Found & Made', description: 'Quotes and reflections from various sources' },
    { value: 'cinema', label: 'Cinema', description: 'Memorable quotes from films and movies' },
    { value: 'literary-masters', label: 'Literary Masters', description: 'Classic works from renowned authors' },
    { value: 'spiritual', label: 'Spiritual', description: 'Wisdom and spiritual insights' },
    { value: 'original-poetry', label: 'Original Poetry', description: 'Creative poetic expressions' },
    { value: 'heartbreak', label: 'Heartbreak', description: 'Deep emotional content about love and loss' }
  ]

  const types = [
    { value: 'quote', label: 'Quote' },
    { value: 'poem', label: 'Poem' },
    { value: 'reflection', label: 'Reflection' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        setSubmitStatus('success')
        setFormData({
          content: '',
          author: '',
          source: '',
          category: 'found-made',
          type: 'quote',
          submitterName: '',
          submitterEmail: '',
          submitterMessage: ''
        })
        onSuccess?.()
      } else {
        setSubmitStatus('error')
        setErrorMessage(result.error || 'Failed to submit content')
      }
    } catch (error) {
      setSubmitStatus('error')
      setErrorMessage('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (submitStatus === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 text-center max-w-md mx-auto"
      >
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Submission Received!</h3>
        <p className="text-gray-300 mb-6">
          Thank you for contributing to our literary collection. Your submission is now under review.
        </p>
        <button
          onClick={() => setSubmitStatus('idle')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Submit Another
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8 max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <BookOpen className="w-12 h-12 text-purple-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Submit Your Writing</h2>
        <p className="text-gray-300">
          Share your favorite quotes, poems, or reflections with our literary community
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Content */}
        <div>
          <label className="block text-white font-medium mb-2">
            Content *
          </label>
          <textarea
            required
            value={formData.content}
            onChange={(e) => handleInputChange('content', e.target.value)}
            placeholder="Enter your quote, poem, or reflection..."
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={6}
            maxLength={5000}
          />
          <div className="text-right text-sm text-gray-400 mt-1">
            {formData.content.length}/5000
          </div>
        </div>

        {/* Author */}
        <div>
          <label className="block text-white font-medium mb-2">
            Author *
          </label>
          <input
            required
            type="text"
            value={formData.author}
            onChange={(e) => handleInputChange('author', e.target.value)}
            placeholder="Author name or 'Anonymous'"
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            maxLength={200}
          />
        </div>

        {/* Source */}
        <div>
          <label className="block text-white font-medium mb-2">
            Source (Optional)
          </label>
          <input
            type="text"
            value={formData.source}
            onChange={(e) => handleInputChange('source', e.target.value)}
            placeholder="Book, movie, website, etc."
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            maxLength={200}
          />
        </div>

        {/* Category and Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-white font-medium mb-2">
              Category *
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {categories.find(c => c.value === formData.category)?.description}
            </p>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">
              Type *
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {types.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submitter Information */}
        <div className="border-t border-white/20 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Your Information (Optional)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={formData.submitterName}
                onChange={(e) => handleInputChange('submitterName', e.target.value)}
                placeholder="Your name (optional)"
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Your Email
              </label>
              <input
                type="email"
                value={formData.submitterEmail}
                onChange={(e) => handleInputChange('submitterEmail', e.target.value)}
                placeholder="your@email.com (optional)"
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={100}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-white font-medium mb-2 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Message to Admin (Optional)
            </label>
            <textarea
              value={formData.submitterMessage}
              onChange={(e) => handleInputChange('submitterMessage', e.target.value)}
              placeholder="Any additional context or notes..."
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        {/* Error Message */}
        {submitStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center p-4 bg-red-500/20 border border-red-500/30 rounded-lg"
          >
            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            <span className="text-red-300">{errorMessage}</span>
          </motion.div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Submit Content
            </>
          )}
        </button>
      </form>
    </motion.div>
  )
} 