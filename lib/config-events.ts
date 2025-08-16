import { EventEmitter } from 'events'

/**
 * Lightweight in-process config change broadcaster.
 * Note: Across multiple server instances this does not fan-out automatically.
 * Pair with DB-backed versioning + cache invalidation to ensure eventual consistency.
 */

const emitter = new EventEmitter()

const TOPIC = 'config-changed'
const PROMPTS_TOPIC = 'prompts-changed'

export type ConfigChangedPayload = {
  source: 'admin-settings' | 'prompt-manager' | 'system'
  at: number
  note?: string
}

export function onConfigChanged(listener: (p: ConfigChangedPayload) => void) {
  emitter.on(TOPIC, listener)
  return () => emitter.off(TOPIC, listener)
}

export function emitConfigChanged(payload: ConfigChangedPayload) {
  emitter.emit(TOPIC, payload)
}

export function onPromptsChanged(listener: (p: ConfigChangedPayload) => void) {
  emitter.on(PROMPTS_TOPIC, listener)
  return () => emitter.off(PROMPTS_TOPIC, listener)
}

export function emitPromptsChanged(payload: ConfigChangedPayload) {
  emitter.emit(PROMPTS_TOPIC, payload)
}