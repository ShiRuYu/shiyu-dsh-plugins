import type { InvocationDescriptor, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import type { DiagnosticsSnapshot, FeatureDescriptor, SessionFeatureState, TokenMeterSnapshot, ToolDescriptor, ToolFilter } from './types.ts'

const json = { mode: 'src-json' as const }

export const ENHANCEMENT_REMOTE_DESCRIPTORS: readonly InvocationDescriptor[] = [
  descriptor('listFeatures', [], 'enhancement.listFeatures'),
  descriptor('getState', [{ name: 'sessionId', wire: 'sessionId' }], 'enhancement.getState'),
  descriptor('setSessionOverride', [
    { name: 'sessionId', wire: 'sessionId' },
    { name: 'feature', wire: 'feature' },
    { name: 'value', wire: 'value' },
  ], 'enhancement.setSessionOverride'),
  descriptor('resetSession', [{ name: 'sessionId', wire: 'sessionId' }], 'enhancement.resetSession'),
  descriptor('listVisibleTools', [{ name: 'sessionId', wire: 'sessionId' }], 'enhancement.listVisibleTools'),
  descriptor('setToolRestriction', [
    { name: 'sessionId', wire: 'sessionId' },
    { name: 'filter', wire: 'filter' },
  ], 'enhancement.setToolRestriction'),
  descriptor('measureContext', [{ name: 'sessionId', wire: 'sessionId' }], 'enhancement.measureContext'),
  descriptor('diagnostics', [{ name: 'sessionId', wire: 'sessionId', acceptsUndefined: true }], 'enhancement.diagnostics'),
] as const

export const TYPERT_REMOTE: TypertRemoteContribution = {
  package: 'dsh-enhancement-toolbox',
  descriptors: ENHANCEMENT_REMOTE_DESCRIPTORS,
}

export default TYPERT_REMOTE

function descriptor(method: string, parameters: readonly { name: string; wire: string; acceptsUndefined?: true }[], id: string): InvocationDescriptor {
  return {
    id,
    service: 'enhancementToolbox',
    namespace: 'enhancement',
    method,
    invocation: { kind: 'direct' },
    parameters: parameters.map(parameter => ({
      ...parameter,
      source: 'json' as const,
      codec: json,
    })),
    result: json,
  }
}

export interface EnhancementRemoteNamespace {
  listFeatures: () => Promise<{ ok: true; value: readonly FeatureDescriptor[] } | { ok: false; error: { code: string; message: string; details: object } }>
  getState: (sessionId: string) => Promise<{ ok: true; value: SessionFeatureState } | { ok: false; error: { code: string; message: string; details: object } }>
  setSessionOverride: (sessionId: string, feature: string, value: string) => Promise<{ ok: true; value: void } | { ok: false; error: { code: string; message: string; details: object } }>
  resetSession: (sessionId: string) => Promise<{ ok: true; value: void } | { ok: false; error: { code: string; message: string; details: object } }>
  listVisibleTools: (sessionId: string) => Promise<{ ok: true; value: readonly ToolDescriptor[] } | { ok: false; error: { code: string; message: string; details: object } }>
  setToolRestriction: (sessionId: string, filter: ToolFilter) => Promise<{ ok: true; value: void } | { ok: false; error: { code: string; message: string; details: object } }>
  measureContext: (sessionId: string) => Promise<{ ok: true; value: TokenMeterSnapshot | null } | { ok: false; error: { code: string; message: string; details: object } }>
  diagnostics: (sessionId?: string) => Promise<{ ok: true; value: DiagnosticsSnapshot } | { ok: false; error: { code: string; message: string; details: object } }>
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteMap {
    'enhancement/listFeatures': () => Promise<unknown>
    'enhancement/getState': (sessionId: string) => Promise<unknown>
    'enhancement/setSessionOverride': (sessionId: string, feature: string, value: string) => Promise<unknown>
    'enhancement/resetSession': (sessionId: string) => Promise<unknown>
    'enhancement/listVisibleTools': (sessionId: string) => Promise<unknown>
    'enhancement/setToolRestriction': (sessionId: string, filter: ToolFilter) => Promise<unknown>
    'enhancement/measureContext': (sessionId: string) => Promise<unknown>
    'enhancement/diagnostics': (sessionId?: string) => Promise<unknown>
  }
  interface TypertRemoteNamespaceMap {
    enhancement: EnhancementRemoteNamespace
  }
}
