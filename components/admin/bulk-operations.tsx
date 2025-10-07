"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  CheckSquare, Square, Trash2, Eye, EyeOff, Tag, 
  FolderOpen, Star, Download, Loader2, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import toast from 'react-hot-toast'
// DatabaseService removed - using direct fetch instead

interface ContentItemAdmin {
  id: string
  content: string
  author: string
  category: string
  published: boolean
  featured: boolean
  views: number
  likes: number
}

export function BulkOperations() {
  const [items, setItems] = useState<ContentItemAdmin[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [operating, setOperating] = useState(false)
  const [categoryValue, setCategoryValue] = useState('')
  const [tagValue, setTagValue] = useState('')

  useEffect(() => {
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadItems = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/content/public?limit=200')
      const data = await response.json()
      if (data.success) {
        setItems(data.items || [])
      }
    } catch (error) {
      toast.error('Failed to load items')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(i => i.id)))
    }
  }

  const handleBulkAction = async (action: string, value?: string | boolean) => {
    if (selectedIds.size === 0) {
      toast.error('No items selected')
      return
    }

    if (action === 'delete') {
      if (!confirm(`Delete ${selectedIds.size} item(s)? This cannot be undone.`)) {
        return
      }
    }

    setOperating(true)
    try {
      const response = await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          itemIds: Array.from(selectedIds),
          value,
        }),
      })

      const result = await response.json()
      if (result.success) {
        toast.success(result.message)
        setSelectedIds(new Set())
        await loadItems()
      } else {
        toast.error(result.error || 'Operation failed')
      }
    } catch (error) {
      toast.error('Operation failed')
      console.error(error)
    } finally {
      setOperating(false)
    }
  }

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      toast.error('No items selected')
      return
    }

    try {
      const ids = Array.from(selectedIds).join(',')
      const response = await fetch(`/api/admin/bulk/export?ids=${ids}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `export_${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success(`Exported ${selectedIds.size} item(s)`)
    } catch (error) {
      toast.error('Export failed')
      console.error(error)
    }
  }

  const allSelected = items.length > 0 && selectedIds.size === items.length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Bulk Operations</h2>
          <p className="text-gray-300">
            Select multiple items and perform batch actions
          </p>
        </div>
        <Button
          onClick={loadItems}
          disabled={loading}
          variant="outline"
          className="border-white/10"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 border-2 border-purple-500/50"
        >
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-white font-semibold">
              {selectedIds.size} item(s) selected
            </span>

            <Button
              onClick={() => handleBulkAction('publish')}
              disabled={operating}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Eye className="w-4 h-4 mr-2" />
              Publish
            </Button>

            <Button
              onClick={() => handleBulkAction('unpublish')}
              disabled={operating}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Unpublish
            </Button>

            <Button
              onClick={() => handleBulkAction('feature', true)}
              disabled={operating}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <Star className="w-4 h-4 mr-2" />
              Feature
            </Button>

            <div className="flex gap-2">
              <Input
                placeholder="New category..."
                value={categoryValue}
                onChange={(e) => setCategoryValue(e.target.value)}
                className="w-40 bg-slate-800 border-white/10"
                size={1}
              />
              <Button
                onClick={() => {
                  if (categoryValue.trim()) {
                    handleBulkAction('category', categoryValue.trim())
                    setCategoryValue('')
                  }
                }}
                disabled={operating || !categoryValue.trim()}
                size="sm"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Change Category
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add tags..."
                value={tagValue}
                onChange={(e) => setTagValue(e.target.value)}
                className="w-40 bg-slate-800 border-white/10"
                size={1}
              />
              <Button
                onClick={() => {
                  if (tagValue.trim()) {
                    handleBulkAction('tag', tagValue.trim())
                    setTagValue('')
                  }
                }}
                disabled={operating || !tagValue.trim()}
                size="sm"
              >
                <Tag className="w-4 h-4 mr-2" />
                Add Tags
              </Button>
            </div>

            <Button
              onClick={handleExport}
              disabled={operating}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>

            <Button
              onClick={() => handleBulkAction('delete')}
              disabled={operating}
              size="sm"
              className="bg-red-600 hover:bg-red-700 ml-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </motion.div>
      )}

      {/* Items Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="p-4 text-left">
                  <button
                    onClick={toggleSelectAll}
                    className="text-white hover:text-purple-400"
                  >
                    {allSelected ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="p-4 text-left text-gray-300 font-semibold">Content</th>
                <th className="p-4 text-left text-gray-300 font-semibold">Author</th>
                <th className="p-4 text-left text-gray-300 font-semibold">Category</th>
                <th className="p-4 text-center text-gray-300 font-semibold">Status</th>
                <th className="p-4 text-center text-gray-300 font-semibold">Stats</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 mx-auto text-purple-400 animate-spin" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    No items found
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className={`border-t border-white/10 hover:bg-white/5 ${
                      selectedIds.has(item.id) ? 'bg-purple-500/10' : ''
                    }`}
                  >
                    <td className="p-4">
                      <button
                        onClick={() => toggleSelection(item.id)}
                        className="text-white hover:text-purple-400"
                      >
                        {selectedIds.has(item.id) ? (
                          <CheckSquare className="w-5 h-5 text-purple-400" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="p-4">
                      <p className="text-gray-200 line-clamp-2 text-sm max-w-md">
                        {item.content}
                      </p>
                    </td>
                    <td className="p-4 text-gray-300 text-sm">{item.author}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-xs bg-white/10 text-gray-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.published ? (
                          <Eye className="w-4 h-4 text-green-400" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-500" />
                        )}
                        {item.featured && (
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center text-sm text-gray-400">
                      {item.views} views · {item.likes} likes
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
