import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

function locateVideo(): string | null {
  const root = process.cwd()
  const candidates = [
    path.resolve(root, 'public/assets/authors/dostoevsky/crime-and-punishment.mp4'),
  ]
  for (const p of candidates) { if (fs.existsSync(p)) return p }
  return null
}

export async function GET(request: NextRequest) {
  const videoPath = locateVideo()
  if (!videoPath) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  const { size } = fs.statSync(videoPath)
  const range = request.headers.get('range')
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : size - 1
    const chunkSize = (end - start) + 1
    const file = fs.createReadStream(videoPath, { start, end })
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
  const file = fs.createReadStream(videoPath)
  return new NextResponse(file as any, { status: 200, headers: { 'Content-Type': 'video/mp4', 'Content-Length': size.toString() } })
}


