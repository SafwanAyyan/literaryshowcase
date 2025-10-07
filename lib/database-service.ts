import { prisma } from './prisma'
import type {
  ContentItem as PrismaContentItem,
  Prisma,
  AIDraft as PrismaAIDraft,
  AIDraftEvent as PrismaAIDraftEvent,
} from '@prisma/client'
import type {
  ContentItem,
  Category,
  OrderByOption,
  AIDraftItem,
  AIDraftStatus,
  DraftEvent,
} from '@/types/literary'
import { CacheService } from './cache-service'

// Transform Prisma model to our frontend type
const parseContentTags = (value?: string | null): string[] =>
  (value || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)

const serializeContentTags = (tags?: string[] | null): string | null => {
  if (!tags || tags.length === 0) return null
  const sanitized = tags.map(tag => tag.trim()).filter(Boolean)
  return sanitized.length ? sanitized.join(',') : null
}

const shallowArrayEqual = (a: string[] = [], b: string[] = []): boolean => {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

const transformPrismaToContentItem = (item: PrismaContentItem): ContentItem => ({
  id: item.id,
  content: item.content,
  author: item.author,
  source: item.source || undefined,
  category: item.category as Category,
  type: item.type as "quote" | "poem" | "reflection",
  tags: parseContentTags(item.tags)
})

const transformDraft = (
  draft: PrismaAIDraft & { events?: PrismaAIDraftEvent[] }
): AIDraftItem => ({
  id: draft.id,
  content: draft.content,
  author: draft.author,
  source: draft.source || undefined,
  category: draft.category as Category,
  type: draft.type as "quote" | "poem" | "reflection",
  tags: draft.tags || [],
  status: draft.status as AIDraftStatus,
  theme: draft.theme,
  tone: draft.tone,
  writingMode: (draft.writingMode as AIDraftItem['writingMode']) || undefined,
  prompt: draft.prompt,
  provider: draft.provider,
  model: draft.model,
  reviewNotes: draft.reviewNotes,
  createdAt: draft.createdAt.toISOString(),
  updatedAt: draft.updatedAt.toISOString(),
  createdBy: draft.createdBy,
  createdByName: draft.createdByName,
  reviewedBy: draft.reviewedBy,
  reviewedByName: draft.reviewedByName,
  publishedBy: draft.publishedBy,
  publishedByName: draft.publishedByName,
  publishedAt: draft.publishedAt ? draft.publishedAt.toISOString() : undefined,
  history: (draft.events || [])
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((event): DraftEvent => ({
      id: event.id,
      action: event.action,
      actorId: event.actorId,
      actorName: event.actorName,
      payload: event.payload as Record<string, any> | null,
      createdAt: event.createdAt.toISOString(),
    })),
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
        const names = rows.map(r => r.author).filter(Boolean)
        // Replace 'Anonymous' for existing items with realistic names for display purposes only
        const pool = ['Ava Thompson','Liam Carter','Noah Patel','Maya Reynolds','Ethan Brooks','Sofia Kim','Oliver Nguyen','Isabella Rossi','James Walker','Amelia Clark']
        return names.map((n, i) => n === 'Anonymous' ? pool[i % pool.length] : n)
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
          tags: serializeContentTags(data.tags),
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
      if (data.tags !== undefined) updateData.tags = serializeContentTags(data.tags)

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
        tags: serializeContentTags(item.tags),
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

  // ---- AI Draft Library helpers ------------------------------------------------

  static async createDraftsFromGeneration(payload: {
    items: Array<{ content: string; author: string; source?: string | null }>
    category: Category
    type: 'quote' | 'poem' | 'reflection'
    theme?: string | null
    tone?: string | null
    writingMode?: 'known-writers' | 'original-ai'
    prompt?: string | null
    provider?: string | null
    model?: string | null
    metadata?: Record<string, any> | null
    createdBy?: { id?: string | null; name?: string | null }
    tags?: string[]
  }): Promise<AIDraftItem[]> {
    if (!payload.items?.length) return []

    const tags = (payload.tags || []).map(tag => tag.trim()).filter(Boolean)
    const metadata = payload.metadata ? JSON.parse(JSON.stringify(payload.metadata)) : null
    const actorId = payload.createdBy?.id || null
    const actorName = payload.createdBy?.name || null

    const created = await prisma.$transaction(async (tx) => {
      const records: Array<{ draft: PrismaAIDraft; events: PrismaAIDraftEvent[] }> = []

      for (const [index, item] of payload.items.entries()) {
        const draft = await tx.aIDraft.create({
          data: {
            content: item.content.trim(),
            author: item.author.trim() || 'Anonymous',
            source: item.source?.trim() || null,
            category: payload.category,
            type: payload.type,
            tags,
            status: 'pending',
            theme: payload.theme || null,
            tone: payload.tone || null,
            writingMode: payload.writingMode || null,
            prompt: payload.prompt || null,
            provider: payload.provider || null,
            model: payload.model || null,
            metadata,
            createdBy: actorId,
            createdByName: actorName,
          }
        })

        const event = await tx.aIDraftEvent.create({
          data: {
            draftId: draft.id,
            action: 'generated',
            actorId,
            actorName,
            payload: {
              provider: payload.provider,
              model: payload.model,
              order: index,
            }
          }
        })

        records.push({ draft, events: [event] })
      }

      return records
    })

    return created.map(({ draft, events }) => transformDraft({ ...draft, events }))
  }

  static async listDrafts(options: {
    status?: AIDraftStatus | 'all'
    category?: Category | 'all'
    tag?: string | null
    provider?: string | 'all'
    search?: string | null
    page?: number
    limit?: number
  } = {}): Promise<{ items: AIDraftItem[]; total: number; page: number; pages: number }> {
    const {
      status = 'all',
      category = 'all',
      tag = null,
      provider = 'all',
      search = null,
      page = 1,
      limit = 20,
    } = options

    const where: Prisma.AIDraftWhereInput = {
      AND: [
        status !== 'all' ? { status } : {},
        category !== 'all' ? { category } : {},
        provider !== 'all' ? { provider } : {},
        tag ? { tags: { has: tag } } : {},
        search
          ? {
              OR: [
                { content: { contains: search, mode: 'insensitive' } },
                { author: { contains: search, mode: 'insensitive' } },
                { reviewNotes: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    }

    const take = Math.max(1, Math.min(100, limit))
    const currentPage = Math.max(1, page)
    const skip = (currentPage - 1) * take

    const [records, total] = await Promise.all([
      prisma.aIDraft.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          events: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      }),
      prisma.aIDraft.count({ where }),
    ])

    return {
      items: records.map(transformDraft),
      total,
      page: currentPage,
      pages: Math.max(1, Math.ceil(total / take)),
    }
  }

  static async updateDraft(
    id: string,
    data: {
      content?: string
      category?: Category
      type?: 'quote' | 'poem' | 'reflection'
      tags?: string[]
      status?: AIDraftStatus
      reviewNotes?: string | null
    },
    actor?: { id?: string | null; name?: string | null }
  ): Promise<AIDraftItem | null> {
    const existing = await prisma.aIDraft.findUnique({ where: { id } })
    if (!existing) {
      return null
    }

    const updateData: Prisma.AIDraftUpdateInput = {}
    const changes: Record<string, { before: any; after: any }> = {}

    if (data.content !== undefined && data.content !== existing.content) {
      updateData.content = data.content.trim()
      changes.content = { before: existing.content, after: data.content.trim() }
    }
    if (data.category && data.category !== existing.category) {
      updateData.category = data.category
      changes.category = { before: existing.category, after: data.category }
    }
    if (data.type && data.type !== existing.type) {
      updateData.type = data.type
      changes.type = { before: existing.type, after: data.type }
    }
    if (data.tags !== undefined) {
      const sanitized = data.tags.map(tag => tag.trim()).filter(Boolean)
      updateData.tags = { set: sanitized }
      if (!shallowArrayEqual(sanitized, existing.tags)) {
        changes.tags = { before: existing.tags, after: sanitized }
      }
    }
    if (data.reviewNotes !== undefined && data.reviewNotes !== existing.reviewNotes) {
      updateData.reviewNotes = data.reviewNotes || null
      changes.reviewNotes = { before: existing.reviewNotes, after: data.reviewNotes || null }
    }

    if (data.status && data.status !== existing.status) {
      updateData.status = data.status
      changes.status = { before: existing.status, after: data.status }

      if (data.status === 'in_review' && !existing.reviewStartedAt) {
        updateData.reviewStartedAt = new Date()
      }

      if (data.status === 'approved' || data.status === 'needs_revision') {
        updateData.reviewedAt = new Date()
        updateData.reviewedBy = actor?.id || existing.reviewedBy
        updateData.reviewedByName = actor?.name || existing.reviewedByName
      }
    }

    if (Object.keys(changes).length === 0) {
      const withEvents = await prisma.aIDraft.findUnique({
        where: { id },
        include: { events: { orderBy: { createdAt: 'desc' }, take: 5 } },
      })
      return withEvents ? transformDraft(withEvents) : null
    }

    const updated = await prisma.aIDraft.update({
      where: { id },
      data: updateData,
      include: {
        events: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })

    await prisma.aIDraftEvent.create({
      data: {
        draftId: id,
        action: data.status && data.status !== existing.status ? 'status_changed' : 'updated',
        actorId: actor?.id || null,
        actorName: actor?.name || null,
        payload: { changes },
      },
    })

    return transformDraft(updated)
  }

  static async bulkPublishDrafts(
    ids: string[],
    actor?: { id?: string | null; name?: string | null }
  ): Promise<{ published: number; items: ContentItem[] }> {
    if (!ids?.length) return { published: 0, items: [] }

    const drafts = await prisma.aIDraft.findMany({
      where: { id: { in: ids } },
    })

    const publishable = drafts.filter(draft => draft.status === 'approved')
    if (publishable.length === 0) {
      return { published: 0, items: [] }
    }

    const createdItems: PrismaContentItem[] = []

    await prisma.$transaction(async (tx) => {
      for (const draft of publishable) {
        const item = await tx.contentItem.create({
          data: {
            content: draft.content,
            author: draft.author,
            source: draft.source,
            category: draft.category,
            type: draft.type,
            tags: draft.tags.length ? draft.tags.join(',') : null,
            published: true,
          },
        })

        await tx.aIDraft.update({
          where: { id: draft.id },
          data: {
            publishedAt: new Date(),
            publishedBy: actor?.id || null,
            publishedByName: actor?.name || null,
            publishedContentId: item.id,
          },
        })

        await tx.aIDraftEvent.create({
          data: {
            draftId: draft.id,
            action: 'published',
            actorId: actor?.id || null,
            actorName: actor?.name || null,
            payload: { contentId: item.id },
          },
        })

        createdItems.push(item)
      }
    })

    if (createdItems.length) {
      CacheService.invalidatePattern('content')
      CacheService.invalidate('content-statistics')
    }

    return {
      published: createdItems.length,
      items: createdItems.map(transformPrismaToContentItem),
    }
  }

  static async getDraftHistory(id: string): Promise<DraftEvent[]> {
    const events = await prisma.aIDraftEvent.findMany({
      where: { draftId: id },
      orderBy: { createdAt: 'asc' },
    })

    return events.map(event => ({
      id: event.id,
      action: event.action,
      actorId: event.actorId,
      actorName: event.actorName,
      payload: event.payload as Record<string, any> | null,
      createdAt: event.createdAt.toISOString(),
    }))
  }
}