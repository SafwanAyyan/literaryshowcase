import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ContentItem } from '@/types/literary'

export interface LocalCollection {
  id: string
  name: string
  description?: string
  items: string[] // contentIds
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'literary_collections'
const DEVICE_ID_KEY = 'literary_device_id'

function generateId(): string {
  return `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

export function useCollections() {
  const [collections, setCollections] = useState<LocalCollection[]>([])
  const [loading, setLoading] = useState(true)

  // Load collections from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setCollections(parsed)
        }
      } catch (error) {
        console.error('Error loading collections:', error)
      }
      setLoading(false)
    }
  }, [])

  // Save collections to localStorage
  const saveCollections = useCallback((newCollections: LocalCollection[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newCollections))
        setCollections(newCollections)
      } catch (error) {
        console.error('Error saving collections:', error)
      }
    }
  }, [])

  // Create new collection
  const createCollection = useCallback((name: string, description?: string, initialItems: string[] = []) => {
    const newCollection: LocalCollection = {
      id: generateId(),
      name,
      description,
      items: initialItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updated = [...collections, newCollection]
    saveCollections(updated)
    return newCollection
  }, [collections, saveCollections])

  // Add item to collection
  const addToCollection = useCallback((collectionId: string, contentId: string) => {
    const updated = collections.map(col => {
      if (col.id === collectionId) {
        // Avoid duplicates
        if (!col.items.includes(contentId)) {
          return {
            ...col,
            items: [...col.items, contentId],
            updatedAt: new Date().toISOString(),
          }
        }
      }
      return col
    })
    saveCollections(updated)
  }, [collections, saveCollections])

  // Remove item from collection
  const removeFromCollection = useCallback((collectionId: string, contentId: string) => {
    const updated = collections.map(col => {
      if (col.id === collectionId) {
        return {
          ...col,
          items: col.items.filter(id => id !== contentId),
          updatedAt: new Date().toISOString(),
        }
      }
      return col
    })
    saveCollections(updated)
  }, [collections, saveCollections])

  // Delete collection
  const deleteCollection = useCallback((collectionId: string) => {
    const updated = collections.filter(col => col.id !== collectionId)
    saveCollections(updated)
  }, [collections, saveCollections])

  // Update collection
  const updateCollection = useCallback((collectionId: string, updates: Partial<LocalCollection>) => {
    const updated = collections.map(col => {
      if (col.id === collectionId) {
        return {
          ...col,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      }
      return col
    })
    saveCollections(updated)
  }, [collections, saveCollections])

  // Check if item is in any collection
  const isInCollection = useCallback((contentId: string, collectionId?: string) => {
    if (collectionId) {
      const collection = collections.find(col => col.id === collectionId)
      return collection?.items.includes(contentId) || false
    }
    return collections.some(col => col.items.includes(contentId))
  }, [collections])

  // Get collections containing an item
  const getCollectionsForItem = useCallback((contentId: string) => {
    return collections.filter(col => col.items.includes(contentId))
  }, [collections])

  // Share collection (sync to database)
  const shareCollection = useCallback(async (collectionId: string) => {
    const collection = collections.find(col => col.id === collectionId)
    if (!collection) {
      return { success: false, error: 'Collection not found' }
    }

    try {
      const response = await fetch('/api/collections/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection,
          deviceId: getDeviceId(),
        }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error sharing collection:', error)
      return { success: false, error: 'Failed to share collection' }
    }
  }, [collections])

  // Export collection
  const exportCollection = useCallback(async (
    collectionId: string,
    items: ContentItem[],
    format: 'text' | 'markdown'
  ) => {
    const collection = collections.find(col => col.id === collectionId)
    if (!collection) {
      return { success: false, error: 'Collection not found' }
    }

    try {
      const response = await fetch('/api/collections/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection: {
            name: collection.name,
            description: collection.description,
            items: items.map(item => ({
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
        return { success: true }
      } else {
        return { success: false, error: 'Failed to export' }
      }
    } catch (error) {
      console.error('Error exporting collection:', error)
      return { success: false, error: 'Failed to export collection' }
    }
  }, [collections])

  // Memoize deviceId so it's only calculated once
  const deviceId = useMemo(() => getDeviceId(), [])

  return {
    collections,
    loading,
    createCollection,
    addToCollection,
    removeFromCollection,
    deleteCollection,
    updateCollection,
    isInCollection,
    getCollectionsForItem,
    shareCollection,
    exportCollection,
    deviceId,
  }
}
