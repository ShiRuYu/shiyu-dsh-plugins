import { describe, expect, it } from 'vitest'
import { normalizeToolFilter } from '../src/restrictions.ts'

const visible = [{ name: 'read' }, { name: 'write' }]

describe('tool restrictions', () => {
  it('normalizes allow/deny and rejects unknown or empty filters', () => {
    expect(normalizeToolFilter({ allow: ['read', 'read'] }, visible)).toEqual({ allow: ['read'] })
    expect(() => normalizeToolFilter({ deny: ['unknown'] }, visible)).toThrow('unknown tool')
    expect(() => normalizeToolFilter({}, visible)).toThrow('cannot be empty')
    expect(() => normalizeToolFilter({ allow: ['read'], deny: ['read'] }, visible)).toThrow('both')
  })
})
