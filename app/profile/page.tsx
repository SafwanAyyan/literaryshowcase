"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bookmark, Trash2, Share2, Download, Edit2, Plus,
  FileText, ChevronRight, Copy, Check, Loader2
} from 'lucide-react'
import { useCollections } from '@/hooks/use-collections'
import type { ContentItem } from '@/types/literary'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { FloatingParticles } from '@/components/floating-particles'
import { InteractiveBackground } from '@/components/interactive-background'

export default function ProfilePage() {
  const {
    collections,
    loading,
    createCollection,
    deleteCollection,
    updateCollection,
    shareCollection,
    exportCollection,
  } = useCollections()

  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [collectionItems, setCollectionItems] = useState<ContentItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [exporting, setExporting] = useState(false)

  const selectedCollectionData = collections.find(c => c.id === selectedCollection)

  // Load items for selected collection
  useEffect(() => {
    if (selectedCollection) {
      const collection = collections.find(c => c.id === selectedCollection)
      if (collection) {
        setLoadingItems(true)
        // Fetch content items
        Promise.all(
          collection.items.map(id =>
            fetch(`/api/content/${id}`).then(res => res.ok ? res.json() : null)
          )
        ).then(results => {
          const items = results.filter(r => r?.success).map(r => r.item)
          setCollectionItems(items)
        }).finally(() => {
          setLoadingItems(false)
        })
      }
    }
  }, [selectedCollection, collections])

  const handleCreateCollection = () => {
    if (!newName.trim()) {
      toast.error('Please enter a collection name')
      return
    }
    createCollection(newName.trim(), newDescription.trim() || undefined)
    toast.success('Collection created!')
    setNewName('')
    setNewDescription('')
    setShowCreateDialog(false)
  }

  const handleEditCollection = () => {
    if (!selectedCollection || !newName.trim()) return
    updateCollection(selectedCollection, {
      name: newName.trim(),
      description: newDescription.trim() || undefined
    })
    toast.success('Collection updated!')
    setShowEditDialog(false)
  }

  const handleDeleteCollection = (id: string) => {
    if (confirm('Are you sure you want to delete this collection?')) {
      deleteCollection(id)
      toast.success('Collection deleted')
      if (selectedCollection === id) {
        setSelectedCollection(null)
      }
    }
  }

  const handleShareCollection = async () => {
    if (!selectedCollection) return
    setSharing(true)
    try {
      const result = await shareCollection(selectedCollection)
      if (result.success) {
        setShareUrl(result.shareUrl)
        toast.success('Collection shared! Link copied to clipboard')
        navigator.clipboard.writeText(result.shareUrl)
      } else {
        toast.error(result.error || 'Failed to share collection')
      }
    } finally {
      setSharing(false)
    }
  }

  const handleExport = async (format: 'text' | 'markdown') => {
    if (!selectedCollection) return
    setExporting(true)
    try {
      const result = await exportCollection(selectedCollection, collectionItems, format)
      if (result.success) {
        toast.success(`Collection exported as ${format.toUpperCase()}!`)
      } else {
        toast.error(result.error || 'Failed to export')
      }
    } finally {
      setExporting(false)
    }
  }

  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Link copied!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
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
            className="max-w-7xl mx-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  My Collections
                </h1>
                <p className="text-gray-300">
                  Organize and share your favorite literary pieces
                </p>
              </div>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Collection
              </Button>
            </div>

            {collections.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-12 text-center"
              >
                <Bookmark className="w-16 h-16 mx-auto text-purple-400 mb-4" />
                <h2 className="text-2xl font-semibold text-white mb-2">
                  No Collections Yet
                </h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Start organizing your favorite quotes and poems into collections.
                  Click "Save" on any content card to begin!
                </p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Collection
                </Button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Collections List */}
                <div className="lg:col-span-1 space-y-3">
                  {collections.map((collection, index) => (
                    <motion.button
                      key={collection.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedCollection(collection.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selectedCollection === collection.id
                          ? 'bg-purple-500/20 border-purple-500/50 shadow-lg'
                          : 'glass-card border-white/10 hover:border-purple-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Bookmark className="w-5 h-5 text-purple-400" />
                          <h3 className="font-semibold text-white truncate">
                            {collection.name}
                          </h3>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                      {collection.description && (
                        <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                          {collection.description}
                        </p>
                      )}
                      <div className="text-xs text-gray-500">
                        {collection.items.length} item{collection.items.length !== 1 ? 's' : ''}
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Collection Details */}
                <div className="lg:col-span-2">
                  {selectedCollectionData ? (
                    <motion.div
                      key={selectedCollection}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-6"
                    >
                      {/* Collection Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-white mb-2">
                            {selectedCollectionData.name}
                          </h2>
                          {selectedCollectionData.description && (
                            <p className="text-gray-400 mb-4">
                              {selectedCollectionData.description}
                            </p>
                          )}
                          <div className="text-sm text-gray-500">
                            Created {new Date(selectedCollectionData.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-white/10">
                        <Button
                          onClick={() => {
                            setNewName(selectedCollectionData.name)
                            setNewDescription(selectedCollectionData.description || '')
                            setShowEditDialog(true)
                          }}
                          variant="outline"
                          size="sm"
                          className="border-white/10"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          onClick={handleShareCollection}
                          disabled={sharing}
                          variant="outline"
                          size="sm"
                          className="border-white/10"
                        >
                          {sharing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Share2 className="w-4 h-4 mr-2" />
                          )}
                          Share
                        </Button>
                        <Button
                          onClick={() => handleExport('text')}
                          disabled={exporting}
                          variant="outline"
                          size="sm"
                          className="border-white/10"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Export TXT
                        </Button>
                        <Button
                          onClick={() => handleExport('markdown')}
                          disabled={exporting}
                          variant="outline"
                          size="sm"
                          className="border-white/10"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export MD
                        </Button>
                        <Button
                          onClick={() => handleDeleteCollection(selectedCollection!)}
                          variant="outline"
                          size="sm"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>

                      {/* Share URL Display */}
                      <AnimatePresence>
                        {shareUrl && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg"
                          >
                            <p className="text-sm text-gray-300 mb-2">
                              Share this link:
                            </p>
                            <div className="flex gap-2">
                              <Input
                                value={shareUrl}
                                readOnly
                                className="bg-slate-800 border-white/10 text-sm"
                              />
                              <Button
                                onClick={copyShareUrl}
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Collection Items */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">
                          Items ({collectionItems.length})
                        </h3>
                        {loadingItems ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                          </div>
                        ) : collectionItems.length === 0 ? (
                          <p className="text-gray-400 text-center py-8">
                            This collection is empty. Start adding items!
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {collectionItems.map((item, index) => (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-4 rounded-lg bg-slate-800/50 border border-white/10 hover:border-purple-500/30 transition-colors"
                              >
                                <p className="text-gray-200 mb-3 leading-relaxed">
                                  "{item.content}"
                                </p>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-gray-400">
                                    — {item.author}
                                    {item.source && `, ${item.source}`}
                                  </p>
                                  <Link
                                    href={`/content/${item.id}`}
                                    className="text-sm text-purple-400 hover:text-purple-300"
                                  >
                                    View →
                                  </Link>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="glass-card p-12 text-center">
                      <Bookmark className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-400">
                        Select a collection to view details
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                placeholder="e.g., Morning Inspiration"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-slate-800 border-white/10"
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Description (Optional)
              </label>
              <Textarea
                placeholder="What's this collection about?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="bg-slate-800 border-white/10 min-h-[100px]"
                maxLength={500}
              />
            </div>
            <Button
              onClick={handleCreateCollection}
              disabled={!newName.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Create Collection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-slate-800 border-white/10"
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Description (Optional)
              </label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="bg-slate-800 border-white/10 min-h-[100px]"
                maxLength={500}
              />
            </div>
            <Button
              onClick={handleEditCollection}
              disabled={!newName.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
