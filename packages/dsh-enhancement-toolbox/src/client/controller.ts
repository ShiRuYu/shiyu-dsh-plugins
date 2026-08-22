import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { EnhancementRemoteNamespace } from '../remote.ts'
import type { FeatureId, FeatureOverride, SessionFeatureState, ToolDescriptor, ToolFilter, TokenMeterSnapshot, DiagnosticsSnapshot, EnhancementSettings } from '../types.ts'
import { FEATURE_IDS } from '../types.ts'
import { DEFAULT_SETTINGS } from '../config.ts'

export interface FeatureView {
  readonly id: FeatureId
  readonly state: FeatureOverride | 'unavailable'
  readonly enabled: boolean
  readonly available: boolean
}

export interface ToolboxSnapshot {
  readonly open: boolean
  readonly sessionId: SessionId | undefined
  readonly sessionState: SessionFeatureState | undefined
  readonly features: readonly FeatureView[]
  readonly tools: readonly ToolDescriptor[]
  readonly meter: TokenMeterSnapshot | null
  readonly diagnostics: DiagnosticsSnapshot | null
  readonly error: string | undefined
}

export class ToolboxController {
  private readonly listeners = new Set<() => void>()
  private current: ToolboxSnapshot = emptySnapshot()
  private readonly remote: EnhancementRemoteNamespace | undefined
  private readonly ctx: ClientContext
  private unsubscribeSessions: (() => void) | undefined

  constructor(ctx: ClientContext) {
    this.ctx = ctx
    this.remote = (ctx as ClientContext & { remote?: { enhancement?: EnhancementRemoteNamespace } }).remote?.enhancement
    this.refreshSession()
    const list = ctx.sessions.list
    this.unsubscribeSessions = list.subscribe(() => { this.refreshSession() })
  }

  getSnapshot = (): ToolboxSnapshot => this.current

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  dispose(): void {
    this.unsubscribeSessions?.()
    this.listeners.clear()
  }

  togglePanel(): void {
    this.current = { ...this.current, open: !this.current.open }
    this.publish()
  }

  async toggleFeature(feature: FeatureId): Promise<void> {
    const sessionId = this.current.sessionId
    if (sessionId === undefined || this.remote === undefined) return
    const old = this.current
    const state = old.sessionState
    if (state === undefined) return
    const previous = state.overrides[feature] ?? 'inherit'
    const next = cycleOverride(previous)
    const optimistic: SessionFeatureState = {
      overrides: { ...state.overrides, [feature]: next },
      effective: { ...state.effective, [feature]: next === 'inherit' ? state.effective[feature] : next === 'enabled' },
    }
    this.current = this.project({ ...old, sessionState: optimistic, features: this.features(optimistic), error: undefined })
    this.publish()
    const result = await this.remote.setSessionOverride(String(sessionId), feature, next)
    if (!result.ok) {
      this.current = { ...old, error: result.error.message }
      this.publish()
      return
    }
    await this.refreshSession()
  }

  async refreshSession(): Promise<void> {
    const sessionId = this.readCurrentSession()
    if (sessionId === undefined || this.remote === undefined) {
      this.current = { ...this.current, sessionId, sessionState: undefined, features: unavailableFeatures(), tools: [], meter: null, diagnostics: null }
      this.publish()
      return
    }
    const stateResult = await this.remote.getState(String(sessionId))
    if (!stateResult.ok) {
      this.current = { ...this.current, sessionId, error: stateResult.error.message, features: unavailableFeatures() }
      this.publish()
      return
    }
    const [tools, meter, diagnostics] = await Promise.all([
      this.remote.listVisibleTools(String(sessionId)),
      this.remote.measureContext(String(sessionId)),
      this.remote.diagnostics(String(sessionId)),
    ])
    this.current = this.project({
      ...this.current,
      sessionId,
      sessionState: stateResult.value,
      features: this.features(stateResult.value, {
        tokenMeter: meter.ok && meter.value !== null,
        tools: diagnostics.ok && diagnostics.value.tools === 'ready',
        connection: diagnostics.ok && diagnostics.value.connection === 'ready',
      }),
      tools: tools.ok ? tools.value : [],
      meter: meter.ok ? meter.value : null,
      diagnostics: diagnostics.ok ? diagnostics.value : null,
      error: undefined,
    })
    this.publish()
  }

  async resetSession(): Promise<void> {
    const sessionId = this.current.sessionId
    if (sessionId === undefined || this.remote === undefined) return
    const result = await this.remote.resetSession(String(sessionId))
    if (!result.ok) this.current = { ...this.current, error: result.error.message }
    await this.refreshSession()
  }

  async setToolRestriction(filter: ToolFilter): Promise<boolean> {
    const sessionId = this.current.sessionId
    if (sessionId === undefined || this.remote === undefined) return false
    const result = await this.remote.setToolRestriction(String(sessionId), filter)
    if (!result.ok) {
      this.current = { ...this.current, error: result.error.message }
      this.publish()
      await this.refreshSession()
      return false
    }
    await this.refreshSession()
    return true
  }

  insertTemplate(prompt: string): void {
    const input = (this.ctx as ClientContext & { input?: { insertText?: (value: string) => void } }).input
    if (input?.insertText !== undefined) input.insertText(prompt)
    else if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) void navigator.clipboard.writeText(prompt)
  }

  private readCurrentSession(): SessionId | undefined {
    return this.ctx.sessions.list.getSnapshot().current
  }

  private features(state: SessionFeatureState, capabilities: { tokenMeter: boolean; tools: boolean; connection: boolean } = { tokenMeter: true, tools: true, connection: true }): FeatureView[] {
    return FEATURE_IDS.map(id => {
      const available = id === 'context-meter' ? capabilities.tokenMeter : id === 'tool-control' ? capabilities.tools : id === 'diagnostics' ? capabilities.connection : true
      return { id, state: available ? state.overrides[id] ?? 'inherit' : 'unavailable', enabled: available && state.effective[id], available }
    })
  }

  private project(snapshot: ToolboxSnapshot): ToolboxSnapshot {
    return snapshot
  }

  private publish(): void {
    for (const listener of [...this.listeners]) listener()
  }
}

function emptySnapshot(): ToolboxSnapshot {
  return { open: false, sessionId: undefined, sessionState: undefined, features: unavailableFeatures(), tools: [], meter: null, diagnostics: null, error: undefined }
}

function unavailableFeatures(): FeatureView[] {
  return FEATURE_IDS.map(id => ({ id, state: 'unavailable' as const, enabled: false, available: false }))
}

export function defaultSettings(): EnhancementSettings {
  return { defaults: { ...DEFAULT_SETTINGS.defaults }, templates: DEFAULT_SETTINGS.templates.map(template => ({ ...template })) }
}

export function cycleOverride(value: FeatureOverride): FeatureOverride {
  return value === 'inherit' ? 'enabled' : value === 'enabled' ? 'disabled' : 'inherit'
}
