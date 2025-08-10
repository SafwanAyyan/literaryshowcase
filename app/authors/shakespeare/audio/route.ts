import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import fs from 'fs'
import path from 'path'

const AUDIO_PATH = path.resolve(process.cwd(), 'public/assets/authors/shakespeare/william.m4a')

export async function GET() {
  if (!fs.existsSync(AUDIO_PATH)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  const stat = fs.statSync(AUDIO_PATH)
  const stream = fs.createReadStream(AUDIO_PATH)
  return new NextResponse(stream as any, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mp4',
      'Content-Length': stat.size.toString(),
      // Prevent ISR fallback from capturing huge payloads
      'Cache-Control': 'public, max-age=0, s-maxage=0',
      'Accept-Ranges': 'bytes'
    }
  })
}


