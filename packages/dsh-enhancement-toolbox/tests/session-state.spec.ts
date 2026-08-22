import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, validateSettings } from '../src/config.ts'
import { SessionStateStore } from '../src/session-state.ts'

describe('session feature state', () => {
  it('uses false global defaults and gives overrides priority', () => {
    const store = new SessionStateStore(DEFAULT_SETTINGS.defaults)
    expect(store.get('s').effective['context-meter']).toBe(false)
    store.apply('s', { feature: 'context-meter', value: 'enabled' })
    expect(store.get('s').effective['context-meter']).toBe(true)
    store.setDefaults({ ...DEFAULT_SETTINGS.defaults, 'context-meter': true })
    store.apply('s', { feature: 'context-meter', value: 'inherit' })
    expect(store.get('s').effective['context-meter']).toBe(true)
  })

  it('rejects unknown features and invalid overrides', () => {
    const store = new SessionStateStore(DEFAULT_SETTINGS.defaults)
    expect(() => store.apply('s', { feature: 'unknown' as never, value: 'enabled' })).toThrow('unknown feature')
    expect(() => store.apply('s', { feature: 'diagnostics', value: 'maybe' as never })).toThrow('invalid feature')
  })

  it('validates the exact default key set and template ids', () => {
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, defaults: { ...DEFAULT_SETTINGS.defaults, extra: true } as never })).toThrow('exactly')
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, templates: [{ id: 'bad id', label: 'x', prompt: 'y', enabled: true }] })).toThrow('invalid prompt template')
  })
})
