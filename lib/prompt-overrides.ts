import fs from 'fs'
import path from 'path'

/**
 * Default category-specific prompt overrides.
 * These are merged with any values stored in config/prompt-overrides.json.
 */
export const DefaultCategoryOverrides: Record<string, string> = {
  'found-made': [
    '- Prioritize intimate, diary-like observations that feel discovered rather than declared.',
    '- Let silence and negative space imply meaning; avoid direct advice.'
  ].join('\n'),

  'cinema': [
    '- Favor subtext-heavy lines that could live in a quiet close-up.',
    '- Compose with visual beats: cut, linger, reveal; keep dialogue lean.'
  ].join('\n'),

  'literary-masters': [
    '- Temper philosophy with concrete images to avoid abstraction drift.',
    '- Allow contradictions; precision over certainty.'
  ].join('\n'),

  'spiritual': [
    '- Speak with humility; avoid doctrinal authority.',
    '- Prefer metaphors from nature and breath; keep language gentle.'
  ].join('\n'),

  'original-poetry': [
    '- Choose one governing image system and stay faithful to it.',
    '- Use line breaks as meaning, not decoration.'
  ].join('\n'),

  'heartbreak': [
    '- Avoid revenge or bitterness; stay with honest grief and ache.',
    '- Hint at the life that remains after loss; no neat resolutions.'
  ].join('\n'),
}

// Back-compat named export expected by UnifiedAIService
export const CategoryPromptOverrides = DefaultCategoryOverrides

const CONFIG_DIR = path.join(process.cwd(), 'config')
const CONFIG_PATH = path.join(CONFIG_DIR, 'prompt-overrides.json')

/**
 * Load overrides from JSON (if present), merged over defaults.
 */
export async function loadOverrides(): Promise<Record<string, string>> {
  try {
    const raw = await fs.promises.readFile(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw || '{}')
    return { ...DefaultCategoryOverrides, ...(parsed || {}) }
  } catch {
    // If the file doesn't exist, return defaults
    return { ...DefaultCategoryOverrides }
  }
}

/**
 * Persist overrides to JSON (creates config directory if necessary).
 */
export async function saveOverrides(overrides: Record<string, string>) {
  await fs.promises.mkdir(CONFIG_DIR, { recursive: true })
  const sanitized: Record<string, string> = {}
  for (const [k, v] of Object.entries(overrides || {})) {
    if (typeof v === 'string') sanitized[k] = v
  }
  await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(sanitized, null, 2), 'utf-8')
}

/**
 * Get a single category override. Falls back to defaults.
 */
export async function getCategoryOverride(category: string): Promise<string | undefined> {
  const all = await loadOverrides()
  return all[category]
}