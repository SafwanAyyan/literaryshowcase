import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database-service'
import { apiLimiter } from '@/lib/rate-limit'

export async function GET(request: Request) {
    try {
        // Rate limit: 20 requests per minute for random content to prevent abuse
        const ip = request.headers.get('x-forwarded-for') || 'unknown'
        const success = apiLimiter.check(ip)

        if (!success) {
            return new NextResponse('Too Many Requests', { status: 429 })
        }

        const item = await DatabaseService.getRandomContent()

        if (!item) {
            return NextResponse.json({ error: 'No content found' }, { status: 404 })
        }

        return NextResponse.json(item)
    } catch (error) {
        console.error('Error fetching random content:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
