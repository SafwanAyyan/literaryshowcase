"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Loader2, Trash2, AlertTriangle, Check, X, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

interface ContentItemBase {
  id: string
  content: string
  author: string
  category: string
  views: number
  likes: number
}

interface DuplicateGroup {
  primary: ContentItemBase
  duplicates: Array<{ item: ContentItemBase; similarity: number }>
}

export function DuplicateFinder() {
  const [scanning, setScanning] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [threshold, setThreshold] = useState(0.85)
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const handleScan = async () => {
    setScanning(true)
    try {
      const response = await fetch('/api/admin/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold, limit: 100 }),
      })

      const result = await response.json()
      if (result.success) {
        setDuplicates(result.duplicates || [])
        toast.success(`Found ${result.count} duplicate group(s)${result.cached ? ' (cached)' : ''}`)
      } else {
        toast.error(result.error || 'Failed to scan for duplicates')
      }
    } catch (error) {
      toast.error('Failed to scan for duplicates')
      console.error(error)
    } finally {
      setScanning(false)
    }
  }

  const handleDelete = async (keepId: string, deleteIds: string[]) => {
    if (!confirm(`Delete ${deleteIds.length} duplicate(s)? This cannot be undone.`)) {
      return
    }

    setDeletingIds(new Set(deleteIds))
    try {
      const response = await fetch('/api/admin/duplicates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepId, deleteIds }),
      })

      const result = await response.json()
      if (result.success) {
        toast.success(result.message)
        setDuplicates(prev => prev.filter(group => group.primary.id !== keepId))
        setSelectedGroup(null)
      } else {
        toast.error(result.error || 'Failed to delete duplicates')
      }
    } catch (error) {
      toast.error('Failed to delete duplicates')
      console.error(error)
    } finally {
      setDeletingIds(new Set())
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Duplicate Finder</h2>
        <p className="text-gray-300">AI-powered semantic similarity detection</p>
      </div>

      {/* Scan Controls */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Similarity Threshold
            </label>
            <Input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="bg-slate-800 border-white/10"
            />
            <p className="text-xs text-gray-400 mt-1">
              0.85 = 85% similar (recommended)
            </p>
          </div>
          <Button
            onClick={handleScan}
            disabled={scanning}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Scan for Duplicates
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      {duplicates.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Duplicate Groups List */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">
              Found {duplicates.length} Group(s)
            </h3>
            {duplicates.map((group, idx) => (
              <motion.div
                key={group.primary.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`glass-card p-4 cursor-pointer transition-all ${
                  selectedGroup?.primary.id === group.primary.id
                    ? 'border-2 border-purple-500'
                    : 'border border-white/10'
                }`}
                onClick={() => setSelectedGroup(group)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-gray-200 line-clamp-2 text-sm mb-1">
                      "{group.primary.content}"
                    </p>
                    <p className="text-xs text-gray-400">
                      — {group.primary.author}
                    </p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 ml-2" />
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                  <span className="text-xs text-gray-400">
                    {group.duplicates.length} duplicate(s)
                  </span>
                  <span className="text-xs text-purple-400">
                    {Math.round(group.duplicates[0].similarity * 100)}% similar
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Comparison View */}
          {selectedGroup && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">
                Side-by-Side Comparison
              </h3>

              {/* Primary Item */}
              <div className="glass-card p-4 border-2 border-green-500/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-green-400">
                    PRIMARY (KEEP)
                  </span>
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <blockquote className="text-gray-200 leading-relaxed mb-2">
                  "{selectedGroup.primary.content}"
                </blockquote>
                <div className="text-sm text-gray-400">
                  <p>— {selectedGroup.primary.author}</p>
                  <p className="text-xs mt-1">
                    Category: {selectedGroup.primary.category} | 
                    Views: {selectedGroup.primary.views} | 
                    Likes: {selectedGroup.primary.likes}
                  </p>
                </div>
              </div>

              {/* Duplicates */}
              {selectedGroup.duplicates.map((dup, idx) => (
                <div
                  key={dup.item.id}
                  className="glass-card p-4 border-2 border-red-500/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-red-400">
                      DUPLICATE #{idx + 1} ({Math.round(dup.similarity * 100)}%)
                    </span>
                    <X className="w-5 h-5 text-red-400" />
                  </div>
                  <blockquote className="text-gray-200 leading-relaxed mb-2">
                    "{dup.item.content}"
                  </blockquote>
                  <div className="text-sm text-gray-400">
                    <p>— {dup.item.author}</p>
                    <p className="text-xs mt-1">
                      Category: {dup.item.category} | 
                      Views: {dup.item.views} | 
                      Likes: {dup.item.likes}
                    </p>
                  </div>
                </div>
              ))}

              {/* Action Button */}
              <Button
                onClick={() =>
                  handleDelete(
                    selectedGroup.primary.id,
                    selectedGroup.duplicates.map(d => d.item.id)
                  )
                }
                disabled={deletingIds.size > 0}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {deletingIds.size > 0 ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete {selectedGroup.duplicates.length} Duplicate(s)
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {!scanning && duplicates.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Search className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">
            No duplicates found. Click "Scan for Duplicates" to begin.
          </p>
        </div>
      )}
    </div>
  )
}
