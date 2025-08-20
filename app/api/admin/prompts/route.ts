import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { PromptService } from '@/lib/prompt-service'
import { UnifiedAIService } from '@/lib/unified-ai-service'
import { CacheService } from '@/lib/cache-service'
import { emitPromptsChanged } from '@/lib/config-events'

type UseCase = 'generate' | 'findSource' | 'explain' | 'analyze'

function ok(data: any, init?: number) {
  return NextResponse.json({ success: true, data }, { status: init ?? 200 })
}
function bad(message: string, status: number = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return bad('Unauthorized', 401)
    }

    const { searchParams } = new URL(request.url)
    const useCase = (searchParams.get('useCase') || '').trim() as UseCase
    if (!useCase) return bad('Missing useCase')
    if (!['generate', 'findSource', 'explain', 'analyze'].includes(useCase)) return bad('Invalid useCase')

    const result = await PromptService.listVersions(useCase)
    return ok(result)
  } catch (e: any) {
    console.error('GET /api/admin/prompts failed:', e)
    return bad('Failed to fetch prompts', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return bad('Unauthorized', 401)
    }

    const body = await request.json().catch(() => ({}))
    const action = (body.action || 'save') as 'save' | 'rollback' | 'preview'
    const useCase = (body.useCase || '').trim() as UseCase
    if (!useCase) return bad('Missing useCase')
    if (!['generate', 'findSource', 'explain', 'analyze'].includes(useCase)) return bad('Invalid useCase')

    const editor =
      ((session.user as any)?.email as string) ||
      ((session.user as any)?.name as string) ||
      'admin'

    if (action === 'save') {
      const content = (body.content || '').toString()
      if (content.length < 20) return bad('Prompt too short (min 20 chars)')
      if (content.length > 16000) return bad('Prompt too long (max 16k chars)')
      // simple placeholder validation example
      if ((content.match(/\{\{.*?\}\}/g) || []).some((ph: string) => ph.length < 4)) {
        return bad('Invalid placeholder format')
      }

      const saved = await PromptService.savePrompt({
        useCase,
        content,
        provider: (body.provider || null),
        model: (body.model || null),
        editor,
        previousVersion: typeof body.previousVersion === 'number' ? body.previousVersion : null,
      })

      // Invalidate any memoized active prompt cache and notify listeners
      CacheService.invalidate(PromptService.cacheKey(useCase))
      emitPromptsChanged({ source: 'prompt-manager', at: Date.now(), note: `save ${useCase}` })

      return ok({ id: saved.id, version: saved.version, updatedAt: saved.updatedAt })
    }

    if (action === 'rollback') {
      const targetVersion = Number(body.targetVersion)
      if (!Number.isFinite(targetVersion) || targetVersion < 1) return bad('Invalid targetVersion')
      const updated = await PromptService.rollbackPrompt({ useCase, targetVersion, editor })

      CacheService.invalidate(PromptService.cacheKey(useCase))
      emitPromptsChanged({ source: 'prompt-manager', at: Date.now(), note: `rollback ${useCase} -> ${targetVersion}` })

      return ok({ id: updated.id, version: updated.version, updatedAt: updated.updatedAt })
    }

    // Dry-run preview: do not persist; execute with systemPromptOverride
    if (action === 'preview') {
      const content = (body.content || '').toString()
      if (content.length < 20) return bad('Prompt too short for preview')

      // Sample input required for preview
      const sample = (body.sampleInput || '').toString().trim()
      if (!sample) return bad('sampleInput is required for preview')

      let preview: any = null
      try {
        if (useCase === 'explain') {
          preview = await UnifiedAIService.explainText(sample, body.question || 'Explain this', { systemPromptOverride: content })
        } else if (useCase === 'analyze') {
          preview = await UnifiedAIService.analyzeText(sample, {}, { systemPromptOverride: content })
        } else if (useCase === 'findSource') {
          // Use explain flow for dry-run context when no explicit preview pathway
          preview = await UnifiedAIService.explainText(sample, 'Give a concise analysis for preview purposes', { systemPromptOverride: content })
        } else if (useCase === 'generate') {
          preview = await UnifiedAIService.explainText(sample, 'Summarize tone and core instruction for preview purposes', { systemPromptOverride: content })
        }
      } catch (e: any) {
        return bad(`Preview failed: ${e?.message || 'unknown error'}`, 502)
      }

      return ok({ preview })
    }

    return bad('Unsupported action', 400)
  } catch (e: any) {
    console.error('POST /api/admin/prompts failed:', e)
    return bad('Failed to process request', 500)
  }
}