import { prisma } from './prisma'
import type { ContentItem as PrismaContentItem, Prisma } from '@prisma/client'
import type { ContentItem, Category } from '@/types/literary'

// Transform Prisma model to our frontend type
const transformPrismaToContentItem = (item: PrismaContentItem): ContentItem => ({
  id: item.id,
  content: item.content,
  author: item.author,
  source: item.source || undefined,
  category: item.category as Category,
  type: item.type as "quote" | "poem" | "reflection"
})

export class DatabaseService {
  // Get all content items
  static async getAllContent(): Promise<ContentItem[]> {
    try {
      const items = await prisma.contentItem.findMany({
        where: { published: true },
        orderBy: { createdAt: 'desc' }
      })
      return items.map(transformPrismaToContentItem)
    } catch (error) {
      console.error('Error fetching content:', error)
      return []
    }
  }

  // Get content by ID
  static async getContentById(id: string): Promise<ContentItem | null> {
    try {
      const item = await prisma.contentItem.findUnique({
        where: { id }
      })
      return item ? transformPrismaToContentItem(item) : null
    } catch (error) {
      console.error('Error fetching content by ID:', error)
      return null
    }
  }

  // Add new content
  static async addContent(data: Omit<ContentItem, "id">): Promise<ContentItem> {
    try {
      const item = await prisma.contentItem.create({
        data: {
          content: data.content,
          author: data.author,
          source: data.source || null,
          category: data.category,
          type: data.type,
          published: true
        }
      })
      return transformPrismaToContentItem(item)
    } catch (error) {
      console.error('Error adding content:', error)
      throw new Error('Failed to add content')
    }
  }

  // Update existing content
  static async updateContent(id: string, data: Partial<Omit<ContentItem, "id">>): Promise<ContentItem | null> {
    try {
      const updateData: Prisma.ContentItemUpdateInput = {}
      
      if (data.content !== undefined) updateData.content = data.content
      if (data.author !== undefined) updateData.author = data.author
      if (data.source !== undefined) updateData.source = data.source || null
      if (data.category !== undefined) updateData.category = data.category
      if (data.type !== undefined) updateData.type = data.type

      const item = await prisma.contentItem.update({
        where: { id },
        data: updateData
      })
      return transformPrismaToContentItem(item)
    } catch (error) {
      console.error('Error updating content:', error)
      return null
    }
  }

  // Delete content
  static async deleteContent(id: string): Promise<boolean> {
    try {
      await prisma.contentItem.delete({
        where: { id }
      })
      return true
    } catch (error) {
      console.error('Error deleting content:', error)
      return false
    }
  }

  // Bulk add content
  static async bulkAddContent(items: Omit<ContentItem, "id">[]): Promise<ContentItem[]> {
    try {
      const data = items.map(item => ({
        content: item.content,
        author: item.author,
        source: item.source || null,
        category: item.category,
        type: item.type,
        published: true
      }))

      const result = await prisma.contentItem.createMany({
        data
      })

      // Get the newly created items
      const newItems = await prisma.contentItem.findMany({
        orderBy: { createdAt: 'desc' },
        take: result.count
      })

      return newItems.map(transformPrismaToContentItem)
    } catch (error) {
      console.error('Error bulk adding content:', error)
      throw new Error('Failed to bulk add content')
    }
  }

  // Search content
  static async searchContent(query: string, category?: string): Promise<ContentItem[]> {
    try {
      const whereClause: Prisma.ContentItemWhereInput = {
        published: true,
        AND: [
          category && category !== "all" ? { category } : {},
          {
            OR: [
              { content: { contains: query, mode: 'insensitive' } },
              { author: { contains: query, mode: 'insensitive' } },
              { source: { contains: query, mode: 'insensitive' } }
            ]
          }
        ]
      }

      const items = await prisma.contentItem.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      })

      return items.map(transformPrismaToContentItem)
    } catch (error) {
      console.error('Error searching content:', error)
      return []
    }
  }

  // Get statistics
  static async getStatistics(): Promise<{
    total: number
    byCategory: Record<string, number>
    byType: Record<string, number>
    recentCount: number
  }> {
    try {
      const [
        total,
        categoryStats,
        typeStats,
        recentCount
      ] = await Promise.all([
        prisma.contentItem.count({ where: { published: true } }),
        prisma.contentItem.groupBy({
          by: ['category'],
          where: { published: true },
          _count: { category: true }
        }),
        prisma.contentItem.groupBy({
          by: ['type'],
          where: { published: true },
          _count: { type: true }
        }),
        prisma.contentItem.count({
          where: {
            published: true,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        })
      ])

      const byCategory = categoryStats.reduce((acc, stat) => {
        acc[stat.category] = stat._count.category
        return acc
      }, {} as Record<string, number>)

      const byType = typeStats.reduce((acc, stat) => {
        acc[stat.type] = stat._count.type
        return acc
      }, {} as Record<string, number>)

      return { total, byCategory, byType, recentCount }
    } catch (error) {
      console.error('Error getting statistics:', error)
      return { total: 0, byCategory: {}, byType: {}, recentCount: 0 }
    }
  }

  // Log AI generation
  static async logGeneration(data: {
    prompt: string
    parameters: Record<string, any>
    itemsCount: number
    success: boolean
    error?: string
  }): Promise<void> {
    try {
      await prisma.generationLog.create({
        data: {
          prompt: data.prompt,
          parameters: JSON.stringify(data.parameters),
          itemsCount: data.itemsCount,
          success: data.success,
          error: data.error || null
        }
      })
    } catch (error) {
      console.error('Error logging generation:', error)
    }
  }

  // Get generation history
  static async getGenerationHistory(limit = 10) {
    try {
      return await prisma.generationLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit
      })
    } catch (error) {
      console.error('Error fetching generation history:', error)
      return []
    }
  }

  // Seed initial data
  static async seedInitialData(data: Omit<ContentItem, "id">[]): Promise<void> {
    try {
      const existingCount = await prisma.contentItem.count()
      
      if (existingCount === 0) {
        const seedData = data.map(item => ({
          content: item.content,
          author: item.author,
          source: item.source || null,
          category: item.category,
          type: item.type,
          published: true
        }))

        await prisma.contentItem.createMany({
          data: seedData
        })

        console.log(`Seeded ${data.length} initial content items`)
      }
    } catch (error) {
      console.error('Error seeding initial data:', error)
    }
  }

  // Export all data
  static async exportAllData() {
    try {
      const items = await prisma.contentItem.findMany({
        orderBy: { createdAt: 'desc' }
      })

      return {
        data: items.map(transformPrismaToContentItem),
        metadata: {
          exported: new Date().toISOString(),
          version: "2.0",
          total: items.length
        }
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      throw new Error('Failed to export data')
    }
  }
}