import z from '@deepseek-ai/schemastery'
import type { EnhancementSettings, FeatureId, PromptTemplate } from './types.ts'
import { FEATURE_IDS } from './types.ts'

export const SETTINGS_NAMESPACE = 'dsh-enhancement-toolbox'

export const DEFAULT_SETTINGS: EnhancementSettings = {
  defaults: {
    'quick-actions': false,
    'prompt-templates': false,
    'context-meter': false,
    'tool-control': false,
    diagnostics: false,
  },
  templates: [],
}

const featureDefaults = Object.fromEntries(FEATURE_IDS.map(id => [id, z.boolean().default(false)])) as Record<FeatureId, any>

export const settingsSchema = z.object({
  defaults: z.object(featureDefaults),
  templates: z.array(z.object({
    id: z.string().pattern(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/),
    label: z.string().min(1).max(80),
    prompt: z.string().min(1).max(20_000),
    enabled: z.boolean().default(true),
  })).max(200).default([]),
})

export function cloneSettings(value: EnhancementSettings): EnhancementSettings {
  return {
    defaults: Object.fromEntries(FEATURE_IDS.map(id => [id, value.defaults[id]])) as Record<FeatureId, boolean>,
    templates: value.templates.map(template => ({ ...template })),
  }
}

export function validateSettings(value: EnhancementSettings): void {
  if (value === null || typeof value !== 'object') throw new Error('enhancement settings must be an object')
  const keys = Object.keys(value.defaults).sort()
  const expected = [...FEATURE_IDS].sort()
  if (keys.join('|') !== expected.join('|')) throw new Error('defaults must contain exactly the five known feature ids')
  const ids = new Set<string>()
  for (const template of value.templates) {
    validateTemplate(template)
    if (ids.has(template.id)) throw new Error(`duplicate prompt template id: ${template.id}`)
    ids.add(template.id)
  }
}

export function validateTemplate(template: PromptTemplate): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(template.id)) throw new Error(`invalid prompt template id: ${template.id}`)
  if (template.label.trim() === '') throw new Error('prompt template label cannot be empty')
  if (template.prompt.trim() === '') throw new Error(`prompt template ${template.id} cannot be empty`)
}
