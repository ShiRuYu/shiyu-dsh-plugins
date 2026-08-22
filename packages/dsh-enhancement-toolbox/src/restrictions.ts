import type { ToolFilter, ToolDescriptor } from './types.ts'

export function normalizeToolFilter(filter: ToolFilter, visible: readonly ToolDescriptor[]): ToolFilter {
  const known = new Set(visible.map(tool => tool.name))
  const allow = filter.allow === undefined ? undefined : uniqueNames(filter.allow)
  const deny = filter.deny === undefined ? undefined : uniqueNames(filter.deny)
  for (const name of [...allow ?? [], ...deny ?? []]) {
    if (!known.has(name)) throw new Error(`unknown tool: ${name}`)
  }
  if ((allow?.length ?? 0) === 0 && (deny?.length ?? 0) === 0) throw new Error('tool restriction cannot be empty')
  if (allow !== undefined && deny !== undefined && allow.some(name => deny.includes(name))) {
    throw new Error('tool cannot be both allowed and denied')
  }
  return { ...(allow === undefined ? {} : { allow }), ...(deny === undefined ? {} : { deny }) }
}

function uniqueNames(names: readonly string[]): string[] {
  return [...new Set(names.map(name => name.trim()).filter(Boolean))]
}
