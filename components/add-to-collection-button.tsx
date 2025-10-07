"use client"

import { useState, useMemo } from 'react'
import { BookmarkPlus, Check, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCollections } from '@/hooks/use-collections'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

interface AddToCollectionButtonProps {
  contentId: string
  compact?: boolean
}

export function AddToCollectionButton({ contentId, compact = false }: AddToCollectionButtonProps) {
  const {
    collections,
    createCollection,
    addToCollection,
    removeFromCollection,
    isInCollection,
  } = useCollections()

  const [open, setOpen] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionDescription, setNewCollectionDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const isInAnyCollection = isInCollection(contentId)
  
  // Memoize to avoid filtering on every render
  const collectionsCount = useMemo(
    () => collections.filter(col => col.items.includes(contentId)).length,
    [collections, contentId]
  )

  const handleToggleCollection = (collectionId: string) => {
    const inCollection = isInCollection(contentId, collectionId)
    if (inCollection) {
      removeFromCollection(collectionId, contentId)
      toast.success('Removed from collection')
    } else {
      addToCollection(collectionId, contentId)
      toast.success('Added to collection')
    }
  }

  const handleCreateAndAdd = async () => {
    if (!newCollectionName.trim()) {
      toast.error('Please enter a collection name')
      return
    }

    setCreating(true)
    try {
      // Create collection with the item already in it
      createCollection(
        newCollectionName.trim(),
        newCollectionDescription.trim() || undefined,
        [contentId] // Add the content ID immediately
      )
      
      toast.success(`Created "${newCollectionName}" and added item`)
      setNewCollectionName('')
      setNewCollectionDescription('')
      setShowCreateForm(false)
      setOpen(false)
    } catch (error) {
      console.error('Error creating collection:', error)
      toast.error('Failed to create collection')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "sm" : "default"}
          className={`gap-2 relative ${isInAnyCollection ? 'text-purple-400' : 'text-gray-300'} hover:text-purple-300`}
          onClick={(e) => e.stopPropagation()}
        >
          {isInAnyCollection ? (
            <Check className="w-4 h-4" />
          ) : (
            <BookmarkPlus className="w-4 h-4" />
          )}
          {!compact && <span>Save</span>}
          {collectionsCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">
              {collectionsCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Save to Collection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {collections.length === 0 && !showCreateForm ? (
            <div className="text-center py-8">
              <BookmarkPlus className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-400 mb-4">
                You don't have any collections yet
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Collection
              </Button>
            </div>
          ) : showCreateForm ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Collection Name
                </label>
                <Input
                  placeholder="e.g., Morning Inspiration"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="bg-slate-800 border-white/10"
                  maxLength={100}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Description (Optional)
                </label>
                <Textarea
                  placeholder="What's this collection about?"
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  className="bg-slate-800 border-white/10 min-h-[80px]"
                  maxLength={500}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateAndAdd}
                  disabled={creating || !newCollectionName.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {creating ? 'Creating...' : 'Create & Add'}
                </Button>
                <Button
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewCollectionName('')
                    setNewCollectionDescription('')
                  }}
                  variant="outline"
                  className="border-white/10"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {collections.map((collection) => {
                  const inThisCollection = isInCollection(contentId, collection.id)
                  return (
                    <motion.button
                      key={collection.id}
                      whileHover={{ x: 4 }}
                      onClick={() => handleToggleCollection(collection.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        inThisCollection
                          ? 'bg-purple-500/20 border-purple-500/50'
                          : 'bg-slate-800/50 border-white/10 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {collection.name}
                          </div>
                          {collection.description && (
                            <div className="text-xs text-gray-400 truncate mt-1">
                              {collection.description}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {collection.items.length} item{collection.items.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        {inThisCollection && (
                          <Check className="w-5 h-5 text-purple-400 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              <Button
                onClick={() => setShowCreateForm(true)}
                variant="outline"
                className="w-full border-white/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Collection
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
