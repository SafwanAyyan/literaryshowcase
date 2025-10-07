import { prisma } from './prisma'
import crypto from 'crypto'

export interface LocalCollection {
  id: string
  name: string
  description?: string
  items: string[] // contentIds
  createdAt: string
  updatedAt: string
}

export class CollectionsService {
  /**
   * Generate a unique device ID for anonymous users
   */
  static generateDeviceId(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  /**
   * Generate a shareable slug for public collections
   */
  static generateShareSlug(): string {
    return crypto.randomBytes(8).toString('hex')
  }

  /**
   * Sync local collection to database for sharing
   */
  static async syncToDatabase(collection: LocalCollection, deviceId: string) {
    try {
      const shareSlug = this.generateShareSlug()
      
      // Create collection in database
      const dbCollection = await prisma.collection.create({
        data: {
          name: collection.name,
          description: collection.description,
          deviceId,
          isPublic: true,
          shareSlug,
          items: {
            create: collection.items.map(contentId => ({
              contentId,
            }))
          }
        }
      })

      return { success: true, shareSlug, id: dbCollection.id }
    } catch (error) {
      console.error('Error syncing collection:', error)
      return { success: false, error: 'Failed to sync collection' }
    }
  }

  /**
   * Get public collection by slug
   */
  static async getPublicCollection(slug: string) {
    try {
      const collection = await prisma.collection.findUnique({
        where: { shareSlug: slug },
        include: {
          items: {
            include: {
              content: true
            },
            orderBy: {
              addedAt: 'desc'
            }
          }
        }
      })

      if (!collection || !collection.isPublic) {
        return { success: false, error: 'Collection not found' }
      }

      return {
        success: true,
        collection: {
          id: collection.id,
          name: collection.name,
          description: collection.description,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt,
          items: collection.items.map(item => item.content)
        }
      }
    } catch (error) {
      console.error('Error fetching collection:', error)
      return { success: false, error: 'Failed to fetch collection' }
    }
  }

  /**
   * Get all collections for a device
   */
  static async getDeviceCollections(deviceId: string) {
    try {
      const collections = await prisma.collection.findMany({
        where: { deviceId },
        include: {
          items: {
            include: {
              content: true
            },
            orderBy: {
              addedAt: 'desc'
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })

      return {
        success: true,
        collections: collections.map(col => ({
          id: col.id,
          name: col.name,
          description: col.description,
          isPublic: col.isPublic,
          shareSlug: col.shareSlug,
          createdAt: col.createdAt,
          updatedAt: col.updatedAt,
          items: col.items.map(item => item.content)
        }))
      }
    } catch (error) {
      console.error('Error fetching device collections:', error)
      return { success: false, error: 'Failed to fetch collections' }
    }
  }

  /**
   * Delete a collection
   */
  static async deleteCollection(collectionId: string, deviceId: string) {
    try {
      // Verify ownership
      const collection = await prisma.collection.findFirst({
        where: {
          id: collectionId,
          deviceId
        }
      })

      if (!collection) {
        return { success: false, error: 'Collection not found or unauthorized' }
      }

      await prisma.collection.delete({
        where: { id: collectionId }
      })

      return { success: true }
    } catch (error) {
      console.error('Error deleting collection:', error)
      return { success: false, error: 'Failed to delete collection' }
    }
  }
}
