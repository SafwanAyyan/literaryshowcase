import { prisma } from './prisma'
import type { ContentItem as PrismaContentItem, Prisma } from '@prisma/client'
import type { ContentItem, Category, OrderByOption } from '@/types/literary'
import { CacheService } from './cache-service'

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
  // Get all content items (cached for performance)
  static async getAllContent(): Promise<ContentItem[]> {
    return CacheService.getOrSet('all-content', async () => {
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
    }, CacheService.TTL.CONTENT)
  }

  // Get public content with filters and sorting
  static async getPublicContent(options: {
    category?: string | null
    author?: string | null
    search?: string | null
    orderBy?: OrderByOption | null
    limit?: number | null
    page?: number | null
  }): Promise<{ items: ContentItem[]; total: number; page: number; pages: number }> {
    const {
      category = null,
      author = null,
      search = null,
      orderBy = 'newest',
      limit = 30,
      page = 1,
    } = options || {}

    const cacheKey = `content:list:cat=${category || 'all'}:author=${author || 'all'}:q=${search || ''}:sort=${orderBy}:p=${page}:l=${limit}`

    return CacheService.getOrSet(cacheKey, async () => {
      const where: Prisma.ContentItemWhereInput = {
        published: true,
        AND: [
          category && category !== 'all' ? { category } : {},
          author ? { author: { contains: author } } : {},
          search
            ? {
                OR: [
                  { content: { contains: search } },
                  { author: { contains: search } },
                  { source: { contains: search } },
                ],
              }
            : {},
        ],
      }

      let orderByClause: Prisma.ContentItemOrderByWithRelationInput
      switch (orderBy) {
        case 'oldest':
          orderByClause = { createdAt: 'asc' }
          break
        case 'author-asc':
          orderByClause = { author: 'asc' }
          break
        case 'author-desc':
          orderByClause = { author: 'desc' }
          break
        case 'likes':
          orderByClause = { likes: 'desc' }
          break
        case 'views':
          orderByClause = { views: 'desc' }
          break
        case 'newest':
        default:
          orderByClause = { createdAt: 'desc' }
      }

      const take = Math.max(1, Math.min(100, limit || 30))
      const currentPage = Math.max(1, page || 1)
      const skip = (currentPage - 1) * take

      const [items, total] = await Promise.all([
        prisma.contentItem.findMany({ where, orderBy: orderByClause, skip, take }),
        prisma.contentItem.count({ where }),
      ])

      return {
        items: items.map(transformPrismaToContentItem),
        total,
        page: currentPage,
        pages: Math.ceil(total / take) || 1,
      }
    }, CacheService.TTL.CONTENT)
  }

  // Get distinct authors (cached)
  static async getAuthors(): Promise<string[]> {
    return CacheService.getOrSet('content:authors', async () => {
      try {
        const rows = await prisma.contentItem.findMany({
          where: { published: true },
          distinct: ['author'],
          select: { author: true },
          orderBy: { author: 'asc' },
        })
        return rows.map(r => r.author).filter(Boolean)
      } catch (error) {
        console.error('Error fetching authors:', error)
        return []
      }
    }, CacheService.TTL.LONG)
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
      
      // Invalidate content cache when new content is added
      CacheService.invalidatePattern('content')
      CacheService.invalidate('content-statistics')
      
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
      
      // Invalidate content cache when content is updated
      CacheService.invalidatePattern('content')
      CacheService.invalidate('content-statistics')
      
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
      
      // Invalidate content cache when content is deleted
      CacheService.invalidatePattern('content')
      CacheService.invalidate('content-statistics')
      
      return true
    } catch (error) {
      console.error('Error deleting content:', error)
      return false
    }
  }

  // Bulk add content
  static async bulkAddContent(items: Omit<ContentItem, "id">[]): Promise<ContentItem[]> {
    try {
      // Deduplicate within batch by normalized content
      const seen = new Set<string>()
      const normalized = (s: string) => s.trim().replace(/\s+/g, ' ')
      const uniqueBatch = items.filter(it => {
        const key = normalized(it.content)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      // Skip anything already in DB (exact content match after trim)
      const candidates = uniqueBatch.map(i => normalized(i.content))
      const existing = await prisma.contentItem.findMany({
        where: { content: { in: candidates } },
        select: { content: true }
      })
      const existingSet = new Set(existing.map(e => normalized(e.content)))

      const data = uniqueBatch.filter(i => !existingSet.has(normalized(i.content))).map(item => ({
        content: item.content,
        author: item.author,
        source: item.source || null,
        category: item.category,
        type: item.type,
        published: true
      }))

      if (data.length === 0) {
        return []
      }
      const result = await prisma.contentItem.createMany({ data })

      // Get the newly created items
      const newItems = await prisma.contentItem.findMany({
        orderBy: { createdAt: 'desc' },
        take: result.count
      })

      // Invalidate content cache when bulk content is added
      CacheService.invalidatePattern('content')
      CacheService.invalidate('content-statistics')
      
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
              { content: { contains: query } },
              { author: { contains: query } },
              { source: { contains: query } }
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
  // Get statistics (cached for performance)
  static async getStatistics(): Promise<{
    total: number
    byCategory: Record<string, number>
    byType: Record<string, number>
    recentCount: number
    totals: { likes: number; views: number }
    submissions: {
      total: number
      pending: number
      approved: number
      rejected: number
    }
  }> {
    return CacheService.getOrSet('content-statistics', async () => {
      try {
        const [
          total,
          categoryStats,
          typeStats,
          recentCount,
          sumAgg
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
          }),
          prisma.contentItem.aggregate({ _sum: { likes: true, views: true }, where: { published: true } })
        ])

        // Get submission stats
        const submissionStats = await prisma.submission.groupBy({
          by: ['status'],
          _count: { status: true }
        })

        const byCategory = categoryStats.reduce((acc, stat) => {
          acc[stat.category] = stat._count.category
          return acc
        }, {} as Record<string, number>)

        const byType = typeStats.reduce((acc, stat) => {
          acc[stat.type] = stat._count.type
          return acc
        }, {} as Record<string, number>)

        // Convert submission stats
        const submissionCounts = submissionStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.status
          return acc
        }, {} as Record<string, number>)

        return { 
          total, 
          byCategory, 
          byType, 
          recentCount,
          totals: { likes: sumAgg._sum.likes || 0, views: sumAgg._sum.views || 0 },
          submissions: {
            total: (submissionCounts.pending || 0) + (submissionCounts.approved || 0) + (submissionCounts.rejected || 0),
            pending: submissionCounts.pending || 0,
            approved: submissionCounts.approved || 0,
            rejected: submissionCounts.rejected || 0
          }
        }
      } catch (error) {
        console.error('Error getting statistics:', error)
        return { 
          total: 0, 
          byCategory: {}, 
          byType: {}, 
          recentCount: 0,
          totals: { likes: 0, views: 0 },
          submissions: {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0
          }
        }
      }
    }, CacheService.TTL.STATS)
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

  // Get all admin settings (cached for performance)
  static async getSettings(): Promise<Record<string, string> | null> {
    return CacheService.getOrSet('admin-settings', async () => {
      try {
        // Get all settings from database
        const settings = await prisma.adminSettings.findMany()
        
        // Convert to key-value object
        const settingsObject = settings.reduce((acc, setting) => {
          acc[setting.key] = setting.value
          return acc
        }, {} as Record<string, string>)

        // Add default values for missing settings
        const defaultSettings = {
          maintenanceMode: 'false',
          openaiApiKey: process.env.OPENAI_API_KEY || '',
          geminiApiKey: process.env.GEMINI_API_KEY || '',
          deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
          defaultAiProvider: 'openai',
          openaiModel: 'gpt-4o',
          geminiModel: 'gemini-2.5-pro',
          deepseekModel: 'deepseek-chat-v3',
          // AI tuning
          aiTemperature: '0.9',
          aiMaxTokens: '2000',
          aiEnableProviderFallback: 'true',
          maintenanceMessage: 'The Literary Showcase is currently undergoing maintenance. Please check back soon!',
          siteName: 'Literary Showcase',
          allowedMaintenanceEmails: process.env.ADMIN_EMAIL || 'admin@literaryshowcase.com',
          // OCR Settings
          ocrDefaultProvider: 'ocr-space',
          ocrFallbackEnabled: 'true',
          ocrLanguage: 'eng',
          ocrQuality: 'balanced',
          ocrEnhanceImage: 'true',
          ocrDetectOrientation: 'true',
          ocrMaxFileSize: '5',
          ocrTimeout: '30',
          ocrCacheDuration: '30',
          ocrRateLimit: '100',
          ocrLogRequests: 'true',
          ocrSecureMode: 'true',
          ocrSpaceEnabled: 'true',
          geminiOcrEnabled: 'true',
          freeOcrAiEnabled: 'false'
        }

        const allSettings = { ...defaultSettings, ...settingsObject }
        console.log(`[DatabaseService] Loaded settings: defaultAiProvider=${allSettings.defaultAiProvider}`)
        
        return allSettings
      } catch (error) {
        console.error('Error fetching settings from database:', error)
        return null
      }
    }, CacheService.TTL.SETTINGS)
  }

  // Export all data including submissions
  static async exportAllData() {
    try {
      const items = await prisma.contentItem.findMany({
        orderBy: { createdAt: 'desc' }
      })

      const submissions = await prisma.submission.findMany({
        orderBy: { createdAt: 'desc' }
      })

      return {
        data: items.map(transformPrismaToContentItem),
        submissions: submissions,
        metadata: {
          exported: new Date().toISOString(),
          version: "2.1",
          totalContent: items.length,
          totalSubmissions: submissions.length,
          total: items.length + submissions.length
        }
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      throw new Error('Failed to export data')
    }
  }

  // Update admin setting
  static async updateSetting(key: string, value: string): Promise<void> {
    try {
      await prisma.adminSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
      
      // Invalidate settings cache
      CacheService.invalidate('admin-settings')
    } catch (error) {
      console.error('Error updating admin setting:', error)
      throw error
    }
  }

  // Submission management methods
  static async createSubmission(data: {
    content: string
    author: string
    source?: string
    category: string
    type: string
    submitterName?: string
    submitterEmail?: string
    submitterMessage?: string
  }) {
    try {
      const submission = await prisma.submission.create({
        data: {
          content: data.content.trim(),
          author: data.author.trim(),
          source: data.source?.trim() || null,
          category: data.category,
          type: data.type,
          submitterName: data.submitterName?.trim() || null,
          submitterEmail: data.submitterEmail?.trim() || null,
          submitterMessage: data.submitterMessage?.trim() || null,
          status: 'pending'
        }
      })

      // Invalidate submission caches
      CacheService.invalidatePattern('submissions')
      CacheService.invalidate('content-statistics')

      return submission
    } catch (error) {
      console.error('Error creating submission:', error)
      throw error
    }
  }

  static async getSubmissions(options: {
    status?: string
    page?: number
    limit?: number
  } = {}) {
    try {
      const { status, page = 1, limit = 20 } = options
      const offset = (page - 1) * limit

      const whereClause: any = {}
      if (status && status !== 'all') {
        whereClause.status = status
      }

      const [submissions, total] = await Promise.all([
        prisma.submission.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.submission.count({ where: whereClause })
      ])

      return {
        submissions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      console.error('Error fetching submissions:', error)
      throw error
    }
  }

  static async getSubmissionById(id: string) {
    try {
      return await prisma.submission.findUnique({ where: { id } })
    } catch (error) {
      console.error('Error fetching submission by ID:', error)
      throw error
    }
  }

  static async updateSubmissionStatus(
    id: string,
    action: 'approve' | 'reject',
    adminNotes?: string,
    reviewedBy?: string
  ) {
    try {
      const submission = await prisma.submission.findUnique({
        where: { id }
      })

      if (!submission) {
        throw new Error('Submission not found')
      }

      if (submission.status !== 'pending') {
        throw new Error('Submission has already been reviewed')
      }

      if (action === 'approve') {
        // Create content item from approved submission
        const contentItem = await prisma.contentItem.create({
          data: {
            content: submission.content,
            author: submission.author,
            source: submission.source,
            category: submission.category,
            type: submission.type,
            published: true
          }
        })

        // Update submission status
        await prisma.submission.update({
          where: { id },
          data: {
            status: 'approved',
            adminNotes: adminNotes?.trim() || null,
            reviewedAt: new Date(),
            reviewedBy: reviewedBy || 'unknown'
          }
        })

        // Invalidate all relevant caches
        CacheService.invalidatePattern('content')
        CacheService.invalidatePattern('submissions')
        CacheService.invalidate('content-statistics')

        return { contentId: contentItem.id }
      } else {
        // Reject submission
        await prisma.submission.update({
          where: { id },
          data: {
            status: 'rejected',
            adminNotes: adminNotes?.trim() || null,
            reviewedAt: new Date(),
            reviewedBy: reviewedBy || 'unknown'
          }
        })

        // Invalidate submission caches
        CacheService.invalidatePattern('submissions')
        CacheService.invalidate('content-statistics')

        return null
      }
    } catch (error) {
      console.error('Error updating submission status:', error)
      throw error
    }
  }

  static async bulkImportSubmissions(submissions: any[]): Promise<number> {
    try {
      const validSubmissions = submissions.filter(sub => 
        sub.content && 
        sub.author && 
        sub.category && 
        sub.type
      ).map(sub => ({
        content: sub.content.trim(),
        author: sub.author.trim(),
        source: sub.source?.trim() || null,
        category: sub.category,
        type: sub.type,
        submitterName: sub.submitterName?.trim() || null,
        submitterEmail: sub.submitterEmail?.trim() || null,
        submitterMessage: sub.submitterMessage?.trim() || null,
        status: sub.status || 'pending'
      }))

      if (validSubmissions.length === 0) {
        return 0
      }

      await prisma.submission.createMany({ data: validSubmissions })

      // Invalidate caches
      CacheService.invalidatePattern('submissions')
      CacheService.invalidate('content-statistics')

      return validSubmissions.length
    } catch (error) {
      console.error('Error bulk importing submissions:', error)
      throw error
    }
  }
}