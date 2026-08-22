import type { Context } from '@deepseek-ai/cordis'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { SessionEventMap } from '@deepseek-ai/dsh-session/types'
import type { ToolRuntime, ToolSchema } from '@deepseek-ai/dsh-tools'
import type { TokenMeterService } from '@deepseek-ai/dsh-token-meter'
import type { EnhancementSettings, EnhancementToolboxService, FeatureId, FeatureOverride, SessionFeatureState, ToolDescriptor, ToolFilter, DiagnosticsSnapshot, TokenMeterSnapshot } from './types.ts'
import { FEATURE_IDS } from './types.ts'
import { FEATURE_DESCRIPTORS } from './features.ts'
import { DEFAULT_SETTINGS, SETTINGS_NAMESPACE, cloneSettings, settingsSchema, validateSettings } from './config.ts'
import { SessionStateStore, assertFeature, assertOverride, type ToggleEvent } from './session-state.ts'
import { normalizeToolFilter } from './restrictions.ts'

export type * from './types.ts'
export { DEFAULT_SETTINGS, SETTINGS_NAMESPACE, settingsSchema } from './config.ts'
export { FEATURE_DESCRIPTORS } from './features.ts'
export { SessionStateStore } from './session-state.ts'
export { TYPERT_REMOTE } from './remote.ts'

export const inject = ['settings', 'sessions', 'tools']
export const name = 'dsh-enhancement-toolbox'

const SERVICE_KEY = 'enhancementToolbox'

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /** Log-only event owned by dsh-enhancement-toolbox. */
    'enhancement/feature-toggle': ToggleEvent
    /** Log-only event recording a successful tool visibility update. */
    'enhancement/tool-restriction': ToolFilter
    /** Log-only event clearing a session tool visibility update. */
    'enhancement/tool-restriction-reset': Record<never, never>
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    enhancementToolbox: EnhancementToolboxGateway
  }
}

/** Optional context adapter supplied by an Agent composition. */
export interface SessionScopeAdapter {
  tools(sessionId: string): ToolRuntime | undefined
  tokenMeter?: TokenMeterService
}

/** Host implementation for settings, session replay, diagnostics and restrictions. */
export class EnhancementToolboxGateway extends TypertRemoteService implements EnhancementToolboxService {
  static inject = ['settings', 'sessions', 'tools']

  private settings: EnhancementSettings = cloneSettings(DEFAULT_SETTINGS)
  private settingsSource: () => EnhancementSettings = () => this.settings
  private readonly states = new SessionStateStore(this.settings.defaults)
  private readonly restrictions = new Map<string, ToolFilter>()
  private readonly restrictionDisposers = new Map<string, () => void>()
  private readonly scopes = new Map<string, SessionScopeAdapter>()

  constructor(ctx: Context) {
    super(ctx, SERVICE_KEY, { namespace: 'enhancement' })
    installSettingsSection(
      ctx,
      settingsNamespace(SETTINGS_NAMESPACE),
      settingsSchema,
      cloneSettings(DEFAULT_SETTINGS),
      {
        setSource: (source: () => EnhancementSettings) => { this.settingsSource = source },
        onChange: () => {
          const next = cloneSettings(this.settingsSource())
          validateSettings(next)
          this.settings = next
          this.states.setDefaults(next.defaults)
        },
        validate: validateSettings,
      },
    )

    ctx.on('session/created', session => {
      this.states.ensure(String(session.id))
      this.replay(session)
    })
    ctx.on('session/event', (session, event) => {
      if (event.type === 'enhancement/feature-toggle') {
        this.states.apply(String(session.id), event.data)
      } else if (event.type === 'enhancement/tool-restriction') {
        this.installRestriction(String(session.id), event.data)
      } else if (event.type === 'enhancement/tool-restriction-reset') {
        this.clearRestriction(String(session.id))
        this.restrictions.delete(String(session.id))
      }
    })
    ctx.on('session/disposed', session => {
      this.clearRestriction(String(session.id))
      this.states.reset(String(session.id))
      this.scopes.delete(String(session.id))
    })
  }

  /** Bind the actual Agent-scoped tool runtime; never call restrict on root ctx.tools. */
  bindSessionScope(sessionId: string, adapter: SessionScopeAdapter): () => void {
    this.scopes.set(sessionId, adapter)
    const existing = this.restrictions.get(sessionId)
    if (existing !== undefined) this.installRestriction(sessionId, existing)
    return () => {
      if (this.scopes.get(sessionId) === adapter) this.scopes.delete(sessionId)
    }
  }

  @Remote('listFeatures')
  listFeatures() {
    return FEATURE_DESCRIPTORS
  }

  @Remote('getState')
  getState(sessionId: string): SessionFeatureState {
    this.requireSession(sessionId)
    return this.states.get(sessionId)
  }

  @Remote('setSessionOverride')
  setSessionOverride(sessionId: string, feature: FeatureId, value: FeatureOverride): void {
    this.requireSession(sessionId)
    assertFeature(feature)
    assertOverride(value)
    this.states.apply(sessionId, { feature, value })
    const session = this.session(sessionId)
    session.append('enhancement/feature-toggle', { feature, value })
  }

  @Remote('resetSession')
  resetSession(sessionId: string): void {
    const session = this.requireSession(sessionId)
    const previousOverrides = { ...this.states.get(sessionId).overrides }
    this.clearRestriction(sessionId)
    this.states.reset(sessionId)
    this.restrictions.delete(sessionId)
    session.append('enhancement/tool-restriction-reset', {})
    // Re-creating the state is deliberate: a reset means inherit all defaults.
    this.states.ensure(sessionId)
    for (const feature of FEATURE_IDS) {
      if (previousOverrides[feature] !== undefined) {
        session.append('enhancement/feature-toggle', { feature, value: 'inherit' })
      }
    }
  }

  @Remote('listVisibleTools')
  listVisibleTools(sessionId: string): readonly ToolDescriptor[] {
    this.requireSession(sessionId)
    const runtime = this.scopeTools(sessionId)
    if (runtime === undefined) return []
    return runtime.schemas().map(schema => toToolDescriptor(schema))
  }

  @Remote('setToolRestriction')
  setToolRestriction(sessionId: string, filter: ToolFilter): void {
    const session = this.requireSession(sessionId)
    const runtime = this.scopeTools(sessionId)
    if (runtime === undefined) throw new Error('tool-control is unavailable: Agent scope is not bound')
    const visible = runtime.schemas().map(schema => toToolDescriptor(schema))
    const normalized = normalizeToolFilter(filter, visible)
    const previous = this.restrictions.get(sessionId)
    const previousDisposer = this.restrictionDisposers.get(sessionId)
    previousDisposer?.()
    let nextDisposer: (() => void)
    try {
      nextDisposer = runtime.restrict(normalized)
    } catch (error) {
      if (previous !== undefined) {
        const restored = runtime.restrict(previous)
        this.restrictionDisposers.set(sessionId, restored)
      }
      throw error
    }
    this.restrictionDisposers.set(sessionId, nextDisposer)
    try {
      session.append('enhancement/tool-restriction', normalized)
      this.restrictions.set(sessionId, normalized)
    } catch (error) {
      if (previous === undefined) {
        this.clearRestriction(sessionId)
        this.restrictions.delete(sessionId)
      } else this.installRestriction(sessionId, previous)
      throw error
    }
  }

  @Remote('measureContext')
  measureContext(sessionId: string): TokenMeterSnapshot | null {
    const session = this.requireSession(sessionId)
    const meter = this.scopes.get(sessionId)?.tokenMeter ?? this.optionalTokenMeter()
    if (meter === undefined) return null
    const measurement = meter.measure(session)
    return {
      totalTokens: measurement.totalTokens,
      surfaceTokens: measurement.surfaceTokens,
      logRevision: measurement.logRevision,
      baseline: measurement.baseline.kind,
    }
  }

  @Remote('diagnostics')
  diagnostics(sessionId?: string): DiagnosticsSnapshot {
    const messages: string[] = []
    const session = sessionId === undefined ? undefined : this.ctx.sessions.get(sessionId as never)
    const tokenMeter = sessionId === undefined ? this.optionalTokenMeter() : this.scopes.get(sessionId)?.tokenMeter ?? this.optionalTokenMeter()
    const tools = sessionId === undefined ? undefined : this.scopeTools(sessionId)
    if (session === undefined && sessionId !== undefined) messages.push(`session not found: ${sessionId}`)
    if (tools === undefined) messages.push('Agent-scoped tools are not bound')
    if (tokenMeter === undefined) messages.push('tokenMeter service is not installed')
    return {
      plugin: 'ready',
      session: session === undefined && sessionId !== undefined ? 'missing' : 'ready',
      tools: tools === undefined ? 'missing' : 'ready',
      tokenMeter: tokenMeter === undefined ? 'missing' : 'ready',
      connection: 'ready',
      messages,
    }
  }

  private replay(session: Session): void {
    for (const event of session.events) {
      if (event.type === 'enhancement/feature-toggle') this.states.apply(String(session.id), event.data)
      if (event.type === 'enhancement/tool-restriction') this.installRestriction(String(session.id), event.data)
      if (event.type === 'enhancement/tool-restriction-reset') {
        this.clearRestriction(String(session.id))
        this.restrictions.delete(String(session.id))
      }
    }
  }

  private installRestriction(sessionId: string, filter: ToolFilter): void {
    const runtime = this.scopeTools(sessionId)
    if (runtime === undefined) return
    const previous = this.restrictionDisposers.get(sessionId)
    previous?.()
    const disposer = runtime.restrict(filter)
    this.restrictionDisposers.set(sessionId, disposer)
    this.restrictions.set(sessionId, filter)
  }

  private clearRestriction(sessionId: string): void {
    this.restrictionDisposers.get(sessionId)?.()
    this.restrictionDisposers.delete(sessionId)
  }

  private session(sessionId: string): Session {
    const session = this.ctx.sessions.get(sessionId as never)
    if (session === undefined) throw new Error(`session not found: ${sessionId}`)
    return session
  }

  private requireSession(sessionId: string): Session {
    return this.session(sessionId)
  }

  private scopeTools(sessionId: string): ToolRuntime | undefined {
    return this.scopes.get(sessionId)?.tools(sessionId)
  }

  private optionalTokenMeter(): TokenMeterService | undefined {
    return this.ctx.get?.('tokenMeter') as TokenMeterService | undefined
  }
}

function toToolDescriptor(schema: ToolSchema): ToolDescriptor {
  return { name: schema.name, description: schema.description, parameters: schema.parameters }
}

export function apply(ctx: Context): void {
  ctx.plugin(EnhancementToolboxGateway)
}

export default EnhancementToolboxGateway
