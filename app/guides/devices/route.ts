import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import fs from 'fs'
import path from 'path'

const PDF_PATH = path.resolve(process.cwd(), 'public/assets/guides/Literary-Devices-2024.pdf')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === '1'

    if (!fs.existsSync(PDF_PATH)) {
      return NextResponse.json({ success: false, error: 'PDF not found' }, { status: 404 })
    }
    const stat = fs.statSync(PDF_PATH)
    const stream = fs.createReadStream(PDF_PATH)
    const response = new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': download ? 'attachment; filename="Literary-Devices-2024.pdf"' : 'inline',
      },
    })
    return response
  } catch (error) {
    console.error('PDF serve error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load PDF' }, { status: 500 })
  }
}


