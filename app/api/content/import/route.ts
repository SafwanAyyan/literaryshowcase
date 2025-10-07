import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { DatabaseService } from '@/lib/database-service'
import { GeminiService } from '@/lib/gemini-service'

type ParsedItem = {
  content: string
  author: string
  source?: string
  category: string
  type: 'quote' | 'poem' | 'reflection'
}

// Map common section headings to site categories and default type
const SECTION_MAP: Record<string, { category: string; type: ParsedItem['type'] }> = {
  'literary masters': { category: 'literary-masters', type: 'quote' },
  'found/made': { category: 'found-made', type: 'quote' },
  'from cinemas': { category: 'cinema', type: 'quote' },
  'spiritual reflections': { category: 'spiritual', type: 'reflection' },
  'original poetry': { category: 'original-poetry', type: 'poem' },
}

function normalizeHeading(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, ' ')
}

function stripOuterQuotes(s: string) {
  const t = s.trim()
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) return t.slice(1, -1)
  const fancy = [ ['“','”'], ['‘','’'] ] as const
  for (const [l,r] of fancy) { if (t.startsWith(l) && t.endsWith(r)) return t.slice(1,-1) }
  return t
}

function parseLineQuote(raw: string): { content: string; author?: string; source?: string } | null {
  let line = raw.replace(/^#\s*/,'').trim()
  if (!line) return null
  let source: string | undefined
  const srcMatch = line.match(/\(([^)]+)\)\s*$/)
  if (srcMatch) { source = srcMatch[1].trim(); line = line.slice(0, srcMatch.index).trim() }
  // author at end after last hyphen/dash
  const dashIdx = Math.max(line.lastIndexOf(' -'), line.lastIndexOf(' –'))
  let author: string | undefined
  if (dashIdx > 0 && dashIdx >= line.length - 80) { // heuristic: keep end-part short
    author = line.slice(dashIdx + 1).replace(/^[–-]\s*/, '').trim()
    line = line.slice(0, dashIdx).trim()
  }
  const content = stripOuterQuotes(line)
  return { content, author, source }
}

function parsePlainText(input: string) {
  const items: (Omit<ParsedItem,'category'|'type'> & Partial<Pick<ParsedItem,'category'|'type'>>)[] = []
  const lines = input.split(/\n/)
  let current: { category?: string; type?: ParsedItem['type'] } = {}
  for (let raw of lines) {
    const l = raw.trim()
    if (!l) continue
    // Section heading e.g. -Literary Masters
    const sec = l.match(/^-[\s]*([^#].*)$/)
    if (sec) {
      const key = normalizeHeading(sec[1])
      current = { ...SECTION_MAP[key] }
      continue
    }
    if (l.startsWith('#')) {
      const parsed = parseLineQuote(l)
      if (!parsed) continue
      items.push({ ...parsed, author: parsed.author || 'Anonymous', ...current })
    }
  }
  return items
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    const base = parsePlainText(text)
    // Fill missing category/type using Gemini classifier
    const classified = await Promise.all(base.map(async (b) => {
      try {
        if (b.category && b.type) return b as any
        const c = await GeminiService.classifyContent(b.content)
        return { ...b, category: b.category || c.category, type: (b.type || c.type) as any }
      } catch {
        return { ...b, category: (b.category || 'found-made'), type: ((b.type as any) || 'quote') }
      }
    }))
    return NextResponse.json({ success: true, data: classified })
  } catch (error) {
    console.error('Import parse error:', error)
    return NextResponse.json({ success: false, error: 'Failed to parse file' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  // Publish selected items
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const items = (body.items || []) as ParsedItem[]
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'No items provided' }, { status: 400 })
    }
    // Normalize and validate
    const prepared = items
      .map(i => ({
        content: (i.content || '').trim(),
        author: (i.author || 'Anonymous').trim() || 'Anonymous',
        source: i.source?.trim() || undefined,
        category: (i.category || 'found-made') as any,
        type: (i.type || 'quote'),
      }))
      .filter(i => i.content.length > 0)

    if (prepared.length === 0) {
      return NextResponse.json({ success: false, error: 'All items empty after normalization' }, { status: 400 })
    }

    const created = await DatabaseService.bulkAddContent(prepared as any)
    return NextResponse.json({ success: true, data: { created: created.length } })
  } catch (error) {
    console.error('Import publish error:', error)
    return NextResponse.json({ success: false, error: (error as any)?.message || 'Failed to publish items' }, { status: 500 })
  }
}


