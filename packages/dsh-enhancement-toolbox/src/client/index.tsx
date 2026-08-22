import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type { TypertClientRemote } from '@deepseek-ai/dsh-typert-protocol'
import { TYPERT_REMOTE } from '../remote.ts'
import type { EnhancementRemoteNamespace } from '../remote.ts'
import { SETTINGS_NAMESPACE, DEFAULT_SETTINGS } from '../config.ts'
import type { EnhancementSettings } from '../types.ts'
import { ToolboxController } from './controller.ts'
import { ToolboxFooterAction, ToolboxOverlay, ToolboxSettingsCard } from './ui.tsx'

export const inject = ['slots', 'sessions']

declare module '@deepseek-ai/cordis' {
  interface Context {
    remote: TypertClientRemote & { enhancement?: EnhancementRemoteNamespace }
  }
}

/** Browser half: mounts the generated Remote face and contributes additive slots only. */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  const remote = (ctx as ClientContext & { remote?: TypertClientRemote }).remote
  let unmountRemote: (() => Promise<void>) | undefined
  if (remote !== undefined) unmountRemote = await remote.$mount(TYPERT_REMOTE)

  const controller = new ToolboxController(ctx)
  const scope = settingsScope(ctx)
  ctx.effect(() => () => {
    controller.dispose()
    void scope.dispose?.()
    void unmountRemote?.()
  }, 'dsh-enhancement-toolbox: browser lifecycle')

  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    key: SETTINGS_NAMESPACE,
    inject: () => ({ scope }),
  }, ToolboxSettingsCard as never))

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'dsh-enhancement-toolbox',
    order: 100,
    inject: () => ({ controller }),
  }, ToolboxFooterAction as never))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'dsh-enhancement-toolbox',
    order: 100,
    inject: () => ({ controller, scope }),
  }, ToolboxOverlay as never))

  return async () => {
    controller.dispose()
    await scope.dispose?.()
    await unmountRemote?.()
  }
}

function settingsScope(ctx: ClientContext): {
  getSnapshot: () => { status: string; writable: boolean; value: EnhancementSettings | undefined }
  subscribe: (listener: () => void) => () => void
  set: (field: string, value: unknown) => Promise<void>
  dispose?: () => Promise<void>
} {
  try {
    return bindSettingsScope<EnhancementSettings>(ctx, {
      namespace: SETTINGS_NAMESPACE,
      decode: value => isSettings(value) ? value : undefined,
    })
  } catch {
    let value: EnhancementSettings | undefined = cloneDefaults()
    const listeners = new Set<() => void>()
    return {
      getSnapshot: () => ({ status: 'unavailable', writable: false, value }),
      subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
      set: async () => { throw new Error('settings service is unavailable') },
    }
  }
}

function cloneDefaults(): EnhancementSettings { return { defaults: { ...DEFAULT_SETTINGS.defaults }, templates: [] } }
function isSettings(value: unknown): value is EnhancementSettings {
  if (value === null || typeof value !== 'object') return false
  const candidate = value as EnhancementSettings
  return candidate.defaults !== undefined && candidate.templates !== undefined
}

export { ToolboxController }
export * from './ui.tsx'
