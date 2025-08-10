import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const VIDEO_PATH = path.resolve(process.cwd(), 'public/assets/authors/shakespeare/hamlet.mp4')

export async function GET(request: NextRequest) {
  if (!fs.existsSync(VIDEO_PATH)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  const { size } = fs.statSync(VIDEO_PATH)
  const range = request.headers.get('range')
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : size - 1
    const chunkSize = (end - start) + 1
    const file = fs.createReadStream(VIDEO_PATH, { start, end })
    return new NextResponse(file as any, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'video/mp4'
      }
    })
  }
  const file = fs.createReadStream(VIDEO_PATH)
  return new NextResponse(file as any, { status: 200, headers: { 'Content-Type': 'video/mp4', 'Content-Length': size.toString() } })
}


