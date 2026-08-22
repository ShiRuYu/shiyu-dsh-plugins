import type { SessionFeatureState, FeatureId, FeatureOverride } from './types.ts'
import { FEATURE_IDS } from './types.ts'

export interface ToggleEvent {
  readonly feature: FeatureId
  readonly value: FeatureOverride
}

interface MutableSessionState {
  overrides: Partial<Record<FeatureId, FeatureOverride>>
  effective: Record<FeatureId, boolean>
}

export class SessionStateStore {
  private readonly states = new Map<string, MutableSessionState>()
  private defaults: Record<FeatureId, boolean>

  constructor(defaults: Record<FeatureId, boolean>) {
    this.defaults = { ...defaults }
  }

  setDefaults(defaults: Record<FeatureId, boolean>): void {
    this.defaults = { ...defaults }
    for (const state of this.states.values()) this.recompute(state)
  }

  ensure(sessionId: string): SessionFeatureState {
    let state = this.states.get(sessionId)
    if (state === undefined) {
      state = { overrides: {}, effective: { ...this.defaults } }
      this.states.set(sessionId, state)
    }
    return snapshot(state)
  }

  apply(sessionId: string, event: ToggleEvent): SessionFeatureState {
    assertFeature(event.feature)
    assertOverride(event.value)
    const state = this.mutable(sessionId)
    if (event.value === 'inherit') delete state.overrides[event.feature]
    else state.overrides[event.feature] = event.value
    this.recompute(state)
    return snapshot(state)
  }

  get(sessionId: string): SessionFeatureState {
    return this.ensure(sessionId)
  }

  reset(sessionId: string): void {
    this.states.delete(sessionId)
  }

  clear(): void {
    this.states.clear()
  }

  has(sessionId: string): boolean {
    return this.states.has(sessionId)
  }

  private mutable(sessionId: string): MutableSessionState {
    let state = this.states.get(sessionId)
    if (state === undefined) {
      state = { overrides: {}, effective: { ...this.defaults } }
      this.states.set(sessionId, state)
    }
    return state
  }

  private recompute(state: MutableSessionState): void {
    for (const feature of FEATURE_IDS) {
      const override = state.overrides[feature]
      state.effective[feature] = override === 'enabled'
        ? true
        : override === 'disabled'
          ? false
          : this.defaults[feature]
    }
  }
}

export function assertFeature(value: string): asserts value is FeatureId {
  if (!(FEATURE_IDS as readonly string[]).includes(value)) throw new Error(`unknown feature id: ${value}`)
}

export function assertOverride(value: string): asserts value is FeatureOverride {
  if (value !== 'inherit' && value !== 'enabled' && value !== 'disabled') throw new Error(`invalid feature override: ${value}`)
}

function snapshot(state: MutableSessionState): SessionFeatureState {
  return {
    overrides: { ...state.overrides },
    effective: { ...state.effective },
  }
}
