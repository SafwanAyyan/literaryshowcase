import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'
import { CacheService } from '@/lib/cache-service'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

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

// POST /api/admin/duplicates - Find semantic duplicates
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { threshold = 0.85, limit = 100 } = body

    // Check cache first
    const cacheKey = `duplicates:${threshold}:${limit}`
    const cached = CacheService.get<DuplicateGroup[]>(cacheKey)
    if (cached) {
      return NextResponse.json({
        success: true,
        duplicates: cached,
        cached: true,
        count: cached.length,
      })
    }

    // Get all published content
    const items = await prisma.contentItem.findMany({
      where: { published: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    if (!items || items.length < 2) {
      return NextResponse.json({
        success: true,
        duplicates: [],
        count: 0,
      })
    }

    // Find duplicates using semantic similarity
    const duplicateGroups: DuplicateGroup[] = []
    const processedIds = new Set<string>()

    for (let i = 0; i < items.length; i++) {
      if (processedIds.has(items[i].id)) continue

      const primary = items[i]
      const duplicates: Array<{ item: any; similarity: number }> = []

      for (let j = i + 1; j < items.length; j++) {
        if (processedIds.has(items[j].id)) continue

        const candidate = items[j]
        
        // Calculate similarity
        const similarity = calculateTextSimilarity(
          primary.content,
          candidate.content
        )

        if (similarity >= threshold) {
          duplicates.push({
            item: candidate,
            similarity: Math.round(similarity * 100) / 100,
          })
          processedIds.add(candidate.id)
        }
      }

      if (duplicates.length > 0) {
        duplicateGroups.push({
          primary,
          duplicates: duplicates.sort((a, b) => b.similarity - a.similarity),
        })
        processedIds.add(primary.id)
      }
    }

    // Cache results for 1 hour
    CacheService.set(cacheKey, duplicateGroups, 3600)

    return NextResponse.json({
      success: true,
      duplicates: duplicateGroups,
      cached: false,
      count: duplicateGroups.length,
    })
  } catch (error) {
    console.error('Error finding duplicates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to find duplicates' },
      { status: 500 }
    )
  }
}

// Helper: Calculate text similarity (Levenshtein distance normalized)
function calculateTextSimilarity(text1: string, text2: string): number {
  // Normalize texts
  const normalize = (text: string) =>
    text.toLowerCase().replace(/[^\w\s]/g, '').trim()

  const a = normalize(text1)
  const b = normalize(text2)

  if (a === b) return 1.0

  // If one is contained in the other
  if (a.includes(b) || b.includes(a)) {
    return Math.max(a.length, b.length) / Math.min(a.length, b.length) >= 2
      ? 0.7
      : 0.9
  }

  // Levenshtein distance
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  const distance = matrix[b.length][a.length]
  const maxLength = Math.max(a.length, b.length)

  return 1 - distance / maxLength
}

// DELETE /api/admin/duplicates - Merge duplicates
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { keepId, deleteIds } = body

    if (!keepId || !deleteIds || !Array.isArray(deleteIds)) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    // Delete duplicates
    const deleted = await Promise.all(
      deleteIds.map((id: string) => prisma.contentItem.delete({ where: { id } }).catch(() => null))
    )

    // Clear cache (clear all caches since CacheService doesn't support prefix clear)
    // Future: Implement prefix-based cache clearing
    // For now, specific keys will expire naturally after TTL

    return NextResponse.json({
      success: true,
      deleted: deleted.filter(Boolean).length,
      message: `Deleted ${deleted.filter(Boolean).length} duplicates`,
    })
  } catch (error) {
    console.error('Error deleting duplicates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete duplicates' },
      { status: 500 }
    )
  }
}
