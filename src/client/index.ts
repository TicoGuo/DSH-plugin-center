/**
 * Browser Plugin Center plugin: the conversation view tab (shown only while the
 * plugin is enabled) plus the settings enable card. It is a pure consumer of the
 * host `/plugin-center` HTTP routes and the `plugin-center` settings namespace.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { PluginOperationResult } from '@ticoguo/dsh-plugin-center/types'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the settings shell's ctx.settingsScope Context merge.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: the settings-plugins section's `settings.plugin.item` SlotMap merge.
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
// Type-only: the sidebar's `sidebar.footer.action` SlotMap merge.
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { PluginCenterListResult, PluginCenterViewInjected } from './PluginCenterView.tsx'
import { PluginCenterCard } from './PluginCenterCard.tsx'
import { PluginCenterSidebarButton } from './PluginCenterSidebarButton.tsx'
import { PluginCenterCardController, type PluginCenterSettings } from './plugin-center-card.ts'
import { en, NS, zh } from './locales.ts'

export type { PluginCenterViewInjected } from './PluginCenterView.tsx'

/** Services required: the conversation slot, locale, and the settings scope. */
export const inject = ['slots', 'locale', 'settingsScope']

/** Fetch one `/plugin-center` endpoint and parse its JSON body, throwing on a transport error. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/plugin-center${path}`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...init,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

/**
 * Client plugin body: register the settings enable card and, while enabled,
 * the conversation view tab. Both registrations ride the slot service's effect
 * wrapper, so plugin unload removes them.
 * @param ctx - client root context.
 */
/** Host settings namespace (must match the host `settingsNamespace('plugin-center')`). */
const SETTINGS_NS = 'plugin-center'

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-plugin-center: dictionaries')
  const t = ctx.locale.bind(NS)
  const scope = ctx.settingsScope.bind({ namespace: SETTINGS_NS }) as SettingsScope<PluginCenterSettings>

  const list = (): Promise<PluginCenterListResult> => request<PluginCenterListResult>('/list')
  const refresh = (): Promise<PluginCenterListResult> =>
    request<PluginCenterListResult>('/refresh', { method: 'POST' })
  const install = (id: string): Promise<PluginOperationResult> =>
    request<PluginOperationResult>('/install', { method: 'POST', body: JSON.stringify({ id }) })
  const uninstall = (id: string): Promise<PluginOperationResult> =>
    request<PluginOperationResult>('/uninstall', { method: 'POST', body: JSON.stringify({ id }) })
  const update = (id: string): Promise<PluginOperationResult> =>
    request<PluginOperationResult>('/update', { method: 'POST', body: JSON.stringify({ id }) })
  const setEnabled = (id: string, enabled: boolean): Promise<PluginOperationResult> =>
    request<PluginOperationResult>(enabled ? '/enable' : '/disable', {
      method: 'POST',
      body: JSON.stringify({ id }),
    })

  // The sidebar button is mounted only while the feature is enabled, so the
  // default-off state never shows "插件中心" in the sidebar foot.
  let disposeButton: (() => void) | null = null
  const syncButton = (): void => {
    const enabled = scope.getSnapshot().value?.enabled ?? false
    if (enabled && disposeButton === null) {
      disposeButton = ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'plugin-center',
        order: 20,
        locale: NS,
        inject: (): PluginCenterViewInjected => ({
          list, refresh, install, uninstall, update, setEnabled,
        }),
      }, PluginCenterSidebarButton))
    } else if (!enabled && disposeButton !== null) {
      disposeButton()
      disposeButton = null
    }
  }
  syncButton()
  scope.subscribe(syncButton)

  const card = new PluginCenterCardController(scope)
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    id: 'plugin-center',
    order: 20,
    locale: NS,
    inject: () => card.inject(),
  }, PluginCenterCard))
}
