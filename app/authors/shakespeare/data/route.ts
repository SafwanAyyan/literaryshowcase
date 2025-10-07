import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import fs from 'fs'
import path from 'path'

const HAMLET_DEVICES = path.resolve(process.cwd(), 'public/assets/authors/shakespeare/literary-devices-in-hamlet.txt')
const HAMLET_NOTES = path.resolve(process.cwd(), 'public/assets/authors/shakespeare/hamlet.txt')
const AUDIO_INTRO = path.resolve(process.cwd(), 'public/assets/authors/shakespeare/william.m4a')
const VIDEO_RECAP = path.resolve(process.cwd(), 'public/assets/authors/shakespeare/hamlet.mp4')

export async function GET(request: NextRequest) {
  try {
    const data = {
      devices: fs.existsSync(HAMLET_DEVICES) ? fs.readFileSync(HAMLET_DEVICES, 'utf8') : '',
      notes: fs.existsSync(HAMLET_NOTES) ? fs.readFileSync(HAMLET_NOTES, 'utf8') : '',
      audio: fs.existsSync(AUDIO_INTRO),
      video: fs.existsSync(VIDEO_RECAP),
    }
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to load assets' }, { status: 500 })
  }
}


