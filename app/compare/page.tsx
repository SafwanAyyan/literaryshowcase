"use client"

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  GitCompare, X, Loader2, Sparkles, ArrowLeft, Search, Check
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'
import type { ContentItem } from '@/types/literary'
import { Navigation } from '@/components/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ComparePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const item1Id = searchParams.get('item1')
  
  const [item1, setItem1] = useState<ContentItem | null>(null)
  const [item2, setItem2] = useState<ContentItem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [comparison, setComparison] = useState<string | null>(null)

  // Load item1 from URL if provided
  useEffect(() => {
    if (item1Id && !item1) {
      fetch(`/api/content/${item1Id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.item) {
            setItem1(data.item)
          } else {
            toast.error('Could not load selected content')
          }
        })
        .catch(() => toast.error('Failed to load content'))
    }
  }, [item1Id, item1])

  // Load available content for selection
  useEffect(() => {
    setLoading(true)
    fetch(`/api/content/public?limit=100&orderBy=newest`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setItems(data.items || [])
        }
      })
      .catch(() => toast.error('Failed to load content'))
      .finally(() => setLoading(false))
  }, [])

  // Filtered items for search
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items.slice(0, 20) // Limit for performance
    
    const term = searchTerm.toLowerCase()
    return items.filter(item =>
      item.content.toLowerCase().includes(term) ||
      item.author.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term)
    ).slice(0, 20)
  }, [items, searchTerm])

  const handleSelectItem2 = (item: ContentItem) => {
    if (item.id === item1?.id) {
      toast.error('Please select a different item')
      return
    }
    setItem2(item)
    setComparison(null) // Reset comparison
  }

  const handleCompare = async () => {
    if (!item1 || !item2) {
      toast.error('Please select both items to compare')
      return
    }

    setComparing(true)
    try {
      const response = await fetch('/api/ai/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item1: {
            id: item1.id,
            content: item1.content,
            author: item1.author,
            category: item1.category,
            type: item1.type,
          },
          item2: {
            id: item2.id,
            content: item2.content,
            author: item2.author,
            category: item2.category,
            type: item2.type,
          },
        }),
      })

      const result = await response.json()
      if (result.success) {
        setComparison(result.comparison)
        if (result.cached) {
          toast.success('Loaded from cache')
        }
      } else {
        toast.error(result.error || 'Failed to compare')
      }
    } catch (error) {
      toast.error('Failed to compare items')
      console.error(error)
    } finally {
      setComparing(false)
    }
  }

  const handleReset = () => {
    setItem1(null)
    setItem2(null)
    setComparison(null)
    setSearchTerm('')
    router.push('/compare')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />

      <div className="container mx-auto px-4 py-12 pt-24 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <GitCompare className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
              Compare Literary Pieces
            </h1>
            <p className="text-gray-300 text-sm sm:text-base">
              Select two pieces to see AI-powered comparison analysis
            </p>
          </div>
          {(item1 || item2) && (
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="border-white/10"
            >
              <X className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
        </motion.div>

        {/* Split View: Selected (left) + Selection (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Selected Item 1 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 h-fit"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">First Item</h2>
              {item1 && (
                <Check className="w-5 h-5 text-green-400" />
              )}
            </div>
            
            {item1 ? (
              <div className="space-y-4">
                <blockquote className="text-gray-200 leading-relaxed border-l-2 border-purple-500 pl-4">
                  "{item1.content}"
                </blockquote>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">— {item1.author}</span>
                  <span className="px-2 py-1 rounded bg-white/10 text-gray-300">
                    {item1.category}
                  </span>
                </div>
                <Button
                  onClick={() => setItem1(null)}
                  size="sm"
                  className="w-full bg-gradient-to-r from-[#1e1e1f] to-[#2a0a37] hover:from-[#252526] hover:to-[#3a0f4d] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_rgba(0,0,0,0.35)] border-0"
                >
                  <X className="w-4 h-4 mr-2" />
                  Change Selection
                </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <GitCompare className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 mb-4">
                  Click on a content item to select it, or use the button on any content detail page
                </p>
                <Link href="/">
                  <Button variant="outline" className="border-white/10">
                    Browse Content
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>

          {/* RIGHT: Item 2 Selection */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Second Item</h2>
              {item2 && (
                <Check className="w-5 h-5 text-green-400" />
              )}
            </div>

            {item2 ? (
              <div className="space-y-4">
                <blockquote className="text-gray-200 leading-relaxed border-l-2 border-purple-500 pl-4">
                  "{item2.content}"
                </blockquote>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">— {item2.author}</span>
                  <span className="px-2 py-1 rounded bg-white/10 text-gray-300">
                    {item2.category}
                  </span>
                </div>
                <Button
                  onClick={() => setItem2(null)}
                  size="sm"
                  className="w-full bg-gradient-to-r from-[#1e1e1f] to-[#2a0a37] hover:from-[#252526] hover:to-[#3a0f4d] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_rgba(0,0,0,0.35)] border-0"
                >
                  <X className="w-4 h-4 mr-2" />
                  Change Selection
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by content, author, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-800 border-white/10"
                  />
                </div>

                {/* Items List */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">
                      No items found
                    </p>
                  ) : (
                    filteredItems.map((item) => (
                      <motion.button
                        key={item.id}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectItem2(item)}
                        disabled={item.id === item1?.id}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          item.id === item1?.id
                            ? 'opacity-40 cursor-not-allowed bg-slate-800/30 border-white/5'
                            : 'bg-slate-800/50 border-white/10 hover:bg-slate-800 hover:border-purple-500/50'
                        }`}
                      >
                        <p className="text-gray-200 line-clamp-2 text-sm mb-1">
                          "{item.content}"
                        </p>
                        <p className="text-xs text-gray-400">
                          — {item.author}
                        </p>
                      </motion.button>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Compare Button */}
        {item1 && item2 && !comparison && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Button
              onClick={handleCompare}
              disabled={comparing}
              className="w-full bg-purple-600 hover:bg-purple-700 py-6 text-lg"
            >
              {comparing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate AI Comparison
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Comparison Results - Split View */}
        {comparison && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-6"
          >
            {/* Items Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card p-6 border-l-4 border-purple-500">
                <div className="text-sm text-purple-400 font-semibold mb-3">FIRST ITEM</div>
                <blockquote className="text-gray-200 italic mb-3 text-lg leading-relaxed">
                  "{item1?.content}"
                </blockquote>
                <div className="text-sm text-gray-400">
                  — {item1?.author} · {item1?.category}
                </div>
              </div>

              <div className="glass-card p-6 border-l-4 border-pink-500">
                <div className="text-sm text-pink-400 font-semibold mb-3">SECOND ITEM</div>
                <blockquote className="text-gray-200 italic mb-3 text-lg leading-relaxed">
                  "{item2?.content}"
                </blockquote>
                <div className="text-sm text-gray-400">
                  — {item2?.author} · {item2?.category}
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="glass-card p-6 sm:p-8">
              <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-400" />
                AI Comparison Analysis
              </h3>
              <div className="prose prose-invert prose-lg max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({...props}) => <h1 className="text-3xl font-bold text-white mt-8 mb-4" {...props} />,
                    h2: ({...props}) => <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3" {...props} />,
                    h3: ({...props}) => <h3 className="text-xl font-semibold text-pink-300 mt-4 mb-2" {...props} />,
                    p: ({...props}) => <p className="text-gray-200 leading-relaxed mb-4 text-lg" {...props} />,
                    strong: ({...props}) => <strong className="text-white font-semibold" {...props} />,
                    em: ({...props}) => <em className="text-purple-200 italic" {...props} />,
                    ul: ({...props}) => <ul className="list-disc list-inside space-y-2 mb-4 text-gray-200" {...props} />,
                    ol: ({...props}) => <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-200" {...props} />,
                    li: ({...props}) => <li className="text-gray-200 leading-relaxed" {...props} />,
                    blockquote: ({...props}) => <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-300 my-4" {...props} />,
                    code: ({inline, ...props}: any) => 
                      inline ? 
                        <code className="bg-slate-800 px-2 py-1 rounded text-purple-300 text-sm" {...props} /> :
                        <code className="block bg-slate-800 p-4 rounded text-purple-300 overflow-x-auto mb-4" {...props} />
                  }}
                >
                  {comparison}
                </ReactMarkdown>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleReset}
                  className="flex-1 bg-gradient-to-r from-[#1e1e1f] to-[#2a0a37] hover:from-[#252526] hover:to-[#3a0f4d] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_rgba(0,0,0,0.35)] border-0"
                >
                  Compare Different Items
                </Button>
                <Button
                  onClick={handleCompare}
                  disabled={comparing}
                  className="flex-1 bg-gradient-to-r from-[#1e1e1f] to-[#2a0a37] hover:from-[#252526] hover:to-[#3a0f4d] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_rgba(0,0,0,0.35)] border-0"
                >
                  {comparing ? 'Regenerating...' : 'Regenerate Analysis'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
