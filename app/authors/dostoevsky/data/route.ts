import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import fs from 'fs'
import path from 'path'

function findFirstExisting(candidates: string[]): string | null {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return null
}

export async function GET() {
  try {
    const root = process.cwd()
    const bioPath = findFirstExisting([
      path.resolve(root, 'public/assets/authors/dostoevsky/dostoevsky.txt'),
    ])
    const summaryPath = findFirstExisting([
      path.resolve(root, 'public/assets/authors/dostoevsky/crime-and-punishment.txt'),
    ])
    const themesPath = findFirstExisting([
      path.resolve(root, 'public/assets/authors/dostoevsky/themes-in-crime-and-punishment.txt'),
    ])
    const videoPath = findFirstExisting([
      path.resolve(root, 'public/assets/authors/dostoevsky/crime-and-punishment.mp4'),
    ])

    const data = {
      bio: bioPath ? fs.readFileSync(bioPath, 'utf8') : '',
      summary: summaryPath ? fs.readFileSync(summaryPath, 'utf8') : '',
      themes: themesPath ? fs.readFileSync(themesPath, 'utf8') : '',
      video: Boolean(videoPath),
    }
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to load Dostoevsky assets' }, { status: 500 })
  }
}


