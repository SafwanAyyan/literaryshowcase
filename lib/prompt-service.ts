import { prisma } from '@/lib/prisma'
import { CacheService } from '@/lib/cache-service'
import { emitPromptsChanged } from '@/lib/config-events'

type UseCase = 'generate' | 'findSource' | 'explain' | 'analyze'

const ACTIVE_TTL = CacheService.TTL.SETTINGS

export class PromptService {
  static cacheKey(useCase: string) {
    return `prompt:active:${useCase}`
  }

  static async getActivePrompt(useCase: UseCase): Promise<string | null> {
    const key = this.cacheKey(useCase)
    const db = prisma as any
    return CacheService.getOrSet(key, async () => {
      const prompt = await db.systemPrompt?.findFirst({
        where: { useCase, active: true },
        orderBy: { updatedAt: 'desc' },
      })
      return prompt?.content ?? null
    }, ACTIVE_TTL)
  }

  static async listVersions(useCase: UseCase) {
    const db = prisma as any
    const prompt = await db.systemPrompt?.findFirst({
      where: { useCase },
      orderBy: { updatedAt: 'desc' },
    })
    if (!prompt) return { active: null, versions: [] as any[] }
    const versions = await db.systemPromptVersion?.findMany({
      where: { promptId: prompt.id },
      orderBy: { version: 'desc' },
      take: 20,
    })
    return { active: prompt, versions }
  }

  /**
   * Save a new version for useCase. Optimistic concurrency using previousVersion if provided.
   * Marks new version as active and increments version.
   */
  static async savePrompt(params: {
    useCase: UseCase
    content: string
    provider?: string | null
    model?: string | null
    editor?: string | null
    previousVersion?: number | null
  }) {
    const db = prisma as any
    return await db.$transaction(async (txRaw: any) => {
      const tx = txRaw as any
      let prompt = await tx.systemPrompt?.findFirst({
        where: { useCase: params.useCase },
        orderBy: { updatedAt: 'desc' },
      })

      if (!prompt) {
        prompt = await tx.systemPrompt?.create({
          data: {
            useCase: params.useCase,
            content: params.content,
            provider: params.provider ?? undefined,
            model: params.model ?? undefined,
            version: 1,
            active: true,
            createdBy: params.editor ?? undefined,
            updatedBy: params.editor ?? undefined,
          },
        })
        await tx.systemPromptVersion?.create({
          data: {
            promptId: prompt.id,
            version: 1,
            provider: prompt.provider ?? undefined,
            model: prompt.model ?? undefined,
            content: prompt.content,
            editor: params.editor ?? undefined,
          },
        })
      } else {
        if (params.previousVersion && prompt.version !== params.previousVersion) {
          throw new Error(`Version conflict: current=${prompt.version}, expected=${params.previousVersion}`)
        }
        const nextVersion = prompt.version + 1
        prompt = await tx.systemPrompt?.update({
          where: { id: prompt.id },
          data: {
            content: params.content,
            provider: params.provider ?? prompt.provider ?? undefined,
            model: params.model ?? prompt.model ?? undefined,
            version: nextVersion,
            active: true,
            updatedBy: params.editor ?? undefined,
          },
        })
        await tx.systemPromptVersion?.create({
          data: {
            promptId: prompt.id,
            version: nextVersion,
            provider: prompt.provider ?? undefined,
            model: prompt.model ?? undefined,
            content: prompt.content,
            editor: params.editor ?? undefined,
          },
        })
      }

      await tx.promptAudit?.create({
        data: {
          action: 'update',
          useCase: params.useCase,
          editor: params.editor ?? undefined,
          fromVersion: (prompt.version || 1) - 1,
          toVersion: prompt.version,
        } as any,
      })

      CacheService.invalidate(this.cacheKey(params.useCase))
      emitPromptsChanged({ source: 'prompt-manager', at: Date.now(), note: `updated ${params.useCase}` })
      return prompt
    })
  }

  /**
   * Roll back an existing useCase to a specific version by creating a new latest version that copies content.
   */
  static async rollbackPrompt(params: {
    useCase: UseCase
    targetVersion: number
    editor?: string | null
  }) {
    const db = prisma as any
    return await db.$transaction(async (txRaw: any) => {
      const tx = txRaw as any
      const current = await tx.systemPrompt?.findFirst({
        where: { useCase: params.useCase },
        orderBy: { updatedAt: 'desc' },
      })
      if (!current) throw new Error('Prompt not found')

      const target = await tx.systemPromptVersion?.findFirst({
        where: { promptId: current.id, version: params.targetVersion },
      })
      if (!target) throw new Error('Target version not found')

      const nextVersion = current.version + 1
      const updated = await tx.systemPrompt?.update({
        where: { id: current.id },
        data: {
          content: target.content,
          provider: target.provider ?? current.provider ?? undefined,
          model: target.model ?? current.model ?? undefined,
          version: nextVersion,
          active: true,
          updatedBy: params.editor ?? undefined,
        },
      })
      await tx.systemPromptVersion?.create({
        data: {
          promptId: current.id,
          version: nextVersion,
          provider: updated.provider ?? undefined,
          model: updated.model ?? undefined,
          content: updated.content,
          editor: params.editor ?? undefined,
        },
      })
      await tx.promptAudit?.create({
        data: {
          action: 'rollback',
          useCase: params.useCase,
          editor: params.editor ?? undefined,
          fromVersion: current.version,
          toVersion: nextVersion,
        } as any,
      })

      CacheService.invalidate(this.cacheKey(params.useCase))
      emitPromptsChanged({ source: 'prompt-manager', at: Date.now(), note: `rollback ${params.useCase} to ${params.targetVersion}` })
      return updated
    })
  }
}