import { describe, expect, it } from 'vitest'
import { cycleOverride } from '../src/client/controller.ts'

describe('browser feature toggle model', () => {
  it('cycles inherit -> enabled -> disabled -> inherit', () => {
    expect(cycleOverride('inherit')).toBe('enabled')
    expect(cycleOverride('enabled')).toBe('disabled')
    expect(cycleOverride('disabled')).toBe('inherit')
  })
})
