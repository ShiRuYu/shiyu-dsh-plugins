export const FEATURE_IDS = [
  'quick-actions',
  'prompt-templates',
  'context-meter',
  'tool-control',
  'diagnostics',
] as const

export type FeatureId = typeof FEATURE_IDS[number]
export type FeatureOverride = 'inherit' | 'enabled' | 'disabled'

export interface FeatureDescriptor {
  readonly id: FeatureId
  readonly label: string
  readonly description: string
  readonly requires: readonly ('tokenMeter' | 'tools' | 'slots' | 'connection')[]
}

export interface PromptTemplate {
  readonly id: string
  readonly label: string
  readonly prompt: string
  readonly enabled: boolean
}

export interface EnhancementSettings {
  readonly defaults: Record<FeatureId, boolean>
  readonly templates: readonly PromptTemplate[]
}

export interface SessionFeatureState {
  readonly overrides: Partial<Record<FeatureId, FeatureOverride>>
  readonly effective: Record<FeatureId, boolean>
}

export interface ToolDescriptor {
  readonly name: string
  readonly description?: string
  readonly parameters?: unknown
}

export interface ToolFilter {
  readonly allow?: readonly string[]
  readonly deny?: readonly string[]
}

export interface DiagnosticsSnapshot {
  readonly plugin: 'ready' | 'degraded'
  readonly session: 'ready' | 'missing'
  readonly tools: 'ready' | 'missing'
  readonly tokenMeter: 'ready' | 'missing'
  readonly connection: 'ready' | 'missing'
  readonly messages: readonly string[]
}

export interface TokenMeterSnapshot {
  readonly totalTokens: number
  readonly surfaceTokens: number
  readonly logRevision: number
  readonly baseline: string
}

export interface EnhancementToolboxService {
  listFeatures(): readonly FeatureDescriptor[]
  getState(sessionId: string): SessionFeatureState
  setSessionOverride(sessionId: string, feature: FeatureId, value: FeatureOverride): void
  resetSession(sessionId: string): void
  listVisibleTools(sessionId: string): readonly ToolDescriptor[]
  setToolRestriction(sessionId: string, filter: ToolFilter): void
}
