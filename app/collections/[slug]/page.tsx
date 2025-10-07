"use client"

import { useState, useEffect } from 'react'
import { use } from 'react'
import { motion } from 'framer-motion'
import { Bookmark, Download, FileText, Calendar, User, Loader2, Share2, Copy, Check } from 'lucide-react'
import type { ContentItem } from '@/types/literary'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { FloatingParticles } from '@/components/floating-particles'
import { InteractiveBackground } from '@/components/interactive-background'
import toast from 'react-hot-toast'

interface CollectionData {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  items: ContentItem[]
}

export default function SharedCollectionPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const [collection, setCollection] = useState<CollectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/collections/${slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCollection(data.collection)
        } else {
          setError(data.error || 'Collection not found')
        }
      })
      .catch(() => {
        setError('Failed to load collection')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [slug])

  const handleExport = async (format: 'text' | 'markdown') => {
    if (!collection) return

    try {
      const response = await fetch('/api/collections/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection: {
            name: collection.name,
            description: collection.description,
            items: collection.items.map(item => ({
              id: item.id,
              content: item.content,
              author: item.author,
              source: item.source,
              category: item.category,
              type: item.type,
            })),
          },
          format,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${collection.name}.${format === 'text' ? 'txt' : 'md'}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Collection exported!')
      }
    } catch (error) {
      toast.error('Failed to export collection')
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Link copied!')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  if (error || !collection) {
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
              className="max-w-2xl mx-auto glass-card p-12 text-center"
            >
              <Bookmark className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">
                Collection Not Found
              </h1>
              <p className="text-gray-400 mb-6">
                {error || 'This collection does not exist or is no longer available.'}
              </p>
              <Link href="/">
                <Button variant="brand">
                  Browse Collections
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

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
            className="max-w-4xl mx-auto"
          >
            {/* Header */}
            <div className="glass-card p-8 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Bookmark className="w-8 h-8 text-purple-400" />
                    <h1 className="text-3xl sm:text-4xl font-bold text-white">
                      {collection.name}
                    </h1>
                  </div>
                  {collection.description && (
                    <p className="text-gray-300 text-lg mb-4">
                      {collection.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{collection.items.length} items</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Created {new Date(collection.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={copyLink}
                  variant="brand"
                  size="sm"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Share2 className="w-4 h-4 mr-2" />
                  )}
                  {copied ? 'Copied!' : 'Share'}
                </Button>
                <Button
                  onClick={() => handleExport('text')}
                  variant="brand"
                  size="sm"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export TXT
                </Button>
                <Button
                  onClick={() => handleExport('markdown')}
                  variant="brand"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export MD
                </Button>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-4">
              {collection.items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card p-6 hover:shadow-lg hover:shadow-purple-500/20 transition-shadow"
                >
                  <div className="mb-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getCategoryStyle(item.category)}`}>
                      {getCategoryLabel(item.category)}
                    </span>
                  </div>
                  <blockquote className="text-gray-100 leading-relaxed mb-4 text-lg">
                    "{item.content}"
                  </blockquote>
                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <User className="w-4 h-4" />
                      <span className="font-medium">
                        {item.author}
                      </span>
                      {item.source && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="text-sm">{item.source}</span>
                        </>
                      )}
                    </div>
                    <Link
                      href={`/content/${item.id}`}
                      className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                    >
                      View details →
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 glass-card p-8 text-center"
            >
              <h3 className="text-xl font-semibold text-white mb-2">
                Create Your Own Collection
              </h3>
              <p className="text-gray-400 mb-6">
                Start organizing your favorite literary pieces
              </p>
              <Link href="/">
                <Button variant="brand">
                  Explore Literary Showcase
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function getCategoryStyle(category: string): string {
  const styles = {
    "found-made": "bg-blue-400/20 text-blue-300",
    cinema: "bg-red-400/20 text-red-300",
    "literary-masters": "bg-green-400/20 text-green-300",
    spiritual: "bg-yellow-400/20 text-yellow-300",
    "original-poetry": "bg-purple-400/20 text-purple-300",
    heartbreak: "bg-rose-400/20 text-rose-300",
  }
  return styles[category as keyof typeof styles] || "bg-gray-400/20 text-gray-300"
}

function getCategoryLabel(category: string): string {
  const labels = {
    "found-made": "Reflection",
    cinema: "Cinema",
    "literary-masters": "Literary Master",
    spiritual: "Spiritual",
    "original-poetry": "Original Poetry",
    heartbreak: "Heartbreak",
  }
  return labels[category as keyof typeof labels] || "Unknown"
}
