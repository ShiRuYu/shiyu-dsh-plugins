declare module '@deepseek-ai/cordis' {
  export class Context {
    readonly sessions: any
    readonly tools: any
    readonly settings: any
    readonly tokenMeter?: any
    readonly slots: any
    plugin(plugin: unknown): any
    provide(key: string, value: unknown): void
    effect(factory: () => unknown, name?: string): unknown
    on(event: string, listener: (...args: any[]) => unknown): () => void
    get(key: string): unknown
  }
  export class Service<T = unknown> {
    protected readonly ctx: Context
    constructor(ctx: Context, ...args: any[])
  }
  export interface Events {}
}

declare module '@deepseek-ai/schemastery' {
  const Schema: any
  export default Schema
}

declare module '@deepseek-ai/dsh-session/types' {
  export interface SessionEventMap {
    [key: string]: any
  }
  export type SessionEvent<T extends keyof SessionEventMap = keyof SessionEventMap> = { type: T; data: SessionEventMap[T]; seq: number }
  export type SessionId = string
}

declare module '@deepseek-ai/dsh-session' {
  import type { Context } from '@deepseek-ai/cordis'
  import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session/types'
  export interface Session { readonly id: SessionId; readonly events: readonly SessionEvent[]; append(type: string, data: any): any }
  export class SessionStore { get(id: SessionId): Session | undefined }
  export type { Session, SessionEvent, SessionId }
}

declare module '@deepseek-ai/dsh-tools' {
  export interface ToolSchema { name: string; description?: string; parameters?: unknown }
  export interface ToolRuntime { schemas(scope?: unknown): ToolSchema[]; restrict(filter: { allow?: readonly string[]; deny?: readonly string[] }): () => void }
}

declare module '@deepseek-ai/dsh-token-meter' {
  export interface TokenMeasurement { totalTokens: number; surfaceTokens: number; logRevision: number; baseline: { kind: string } }
  export class TokenMeterService { measure(session: unknown): TokenMeasurement }
}

declare module '@deepseek-ai/dsh-settings' {
  export function settingsNamespace(value: string): unknown
  export function installSettingsSection(...args: any[]): void
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  import { Service, Context } from '@deepseek-ai/cordis'
  export interface InvocationParameterDescriptor { name: string; wire: string; source: 'json'; codec: { mode: 'src-json' }; acceptsUndefined?: true }
  export interface InvocationDescriptor { id: string; service: string; namespace: string; method: string; invocation: { kind: 'direct' }; parameters: readonly InvocationParameterDescriptor[]; result: { mode: 'src-json' } }
  export interface TypertRemoteContribution { package: string; descriptors: readonly InvocationDescriptor[] }
  export interface TypertRemoteMap {}
  export interface TypertRemoteNamespaceMap {}
  export interface TypertClientRemote { $mount(contribution: TypertRemoteContribution): Promise<() => Promise<void>> }
  export type RemoteMethodDecorator = (...args: any[]) => void
  export class TypertRemoteService extends Service { readonly typertRemote: unknown; constructor(ctx: Context, key: string, options?: unknown) }
  export function Remote(name: string): RemoteMethodDecorator
}

declare module '@deepseek-ai/dsh-client-runtime/client' {
  import type { Context } from '@deepseek-ai/cordis'
  export type ClientContext = Context
  export type SessionId = string
  export interface SettingsScope<T> { getSnapshot(): { status: string; value: T | undefined; writable: boolean }; subscribe(listener: () => void): () => void; set(field: string, value: unknown): Promise<void> }
  export function bindSettingsScope<T>(ctx: Context, spec: { namespace: string; decode?: (value: unknown) => T | undefined }): SettingsScope<T>
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  export type PropsRuntime<K extends string> = any
}

declare module '@deepseek-ai/dsh-client-ui-layout/client' {}
declare module '@deepseek-ai/dsh-client-ui-sidebar/client' {}
declare module '@deepseek-ai/dsh-client-ui-settings-plugins/client' {}
