import { NextRequest, NextResponse } from 'next/server'
import { CollectionsService, type LocalCollection } from '@/lib/collections-service'
import { z } from 'zod'

const ShareCollectionSchema = z.object({
  collection: z.object({
    id: z.string(),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    items: z.array(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  deviceId: z.string()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = ShareCollectionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const { collection, deviceId } = parsed.data
    const result = await CollectionsService.syncToDatabase(collection, deviceId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      shareSlug: result.shareSlug,
      shareUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/collections/${result.shareSlug}`
    })
  } catch (error) {
    console.error('Error sharing collection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to share collection' },
      { status: 500 }
    )
  }
}
