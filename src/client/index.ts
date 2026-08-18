/**
 * Browser Plugin Center plugin: the sidebar footer button (always mounted — the
 * panel itself shows the disabled state with a re-enable switch) plus its
 * right-panel overlay. It is a pure consumer of the host `/plugin-center` HTTP
 * routes (no settings namespace).
 */

import type { Context } from '@deepseek-ai/cordis'
import type { PluginOperationResult } from '@ticoguo/dsh-plugin-center/types'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the sidebar's `sidebar.footer.action` SlotMap merge.
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { PluginCenterListResult } from './PluginCenterView.tsx'
import {
  PluginCenterSidebarButton, type PluginCenterSidebarButtonFace,
} from './PluginCenterSidebarButton.tsx'
import { en, NS, zh } from './locales.ts'

export type { PluginCenterViewInjected } from './PluginCenterView.tsx'

/** Services required: the slots service and the locale. */
export const inject = ['slots', 'locale']

/** Timeout for read endpoints; mutations may legitimately run for minutes. */
const READ_TIMEOUT_MS = 35_000
const REFRESH_TIMEOUT_MS = 60_000

/** Fetch one `/plugin-center` endpoint and parse its JSON body, throwing on a transport error. */
async function request<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs, ...fetchInit } = init
  const response = await fetch(`/plugin-center${path}`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...(timeoutMs !== undefined ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
    ...fetchInit,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

/**
 * Client plugin body: register the sidebar footer button. The on/off flag is
 * read from the host's `/plugin-center/status` route; a transient failure
 * retries with exponential backoff instead of permanently hiding the entry.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-plugin-center: dictionaries')

  const list = (): Promise<PluginCenterListResult> =>
    request<PluginCenterListResult>('/list', { timeoutMs: READ_TIMEOUT_MS })
  const refresh = (): Promise<PluginCenterListResult> =>
    request<PluginCenterListResult>('/refresh', { method: 'POST', timeoutMs: REFRESH_TIMEOUT_MS })
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
  const status = (): Promise<{ enabled: boolean }> =>
    request<{ enabled: boolean }>('/status', { timeoutMs: READ_TIMEOUT_MS })
  const setFeatureEnabled = (enabled: boolean): Promise<{ ok: boolean; enabled: boolean }> =>
    request<{ ok: boolean; enabled: boolean }>('/set-enabled', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }).then((result) => {
      // Keep the shared flag in sync so the panel re-renders immediately.
      enabledStore.set({ enabled: result.enabled })
      return result
    })

  // Shared feature-enabled flag (sidecar-backed via the host routes). `null`
  // means the status has not resolved yet; the panel renders a neutral state
  // instead of flashing "disabled".
  const enabledStore = createSnapshotStore<{ enabled: boolean | null }>({ enabled: null })

  let disposed = false
  const refreshEnabled = (): void => {
    const retryAfter = (delayMs: number): void => {
      if (disposed) return
      setTimeout(() => {
        if (disposed) return
        void status().then(
          snapshot => { enabledStore.set({ enabled: snapshot.enabled }) },
          () => { retryAfter(Math.min(delayMs * 2, 30_000)) },
        )
      }, delayMs)
    }
    void status().then(
      snapshot => { enabledStore.set({ enabled: snapshot.enabled }) },
      () => { retryAfter(1_000) },
    )
  }
  refreshEnabled()

  // The sidebar button is always mounted: while disabled, the panel shows the
  // disabled state with a re-enable switch, so the feature can never be locked
  // out of the UI (no settings namespace exists to flip it back).
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'plugin-center',
    order: 20,
    locale: NS,
    inject: (): PluginCenterSidebarButtonFace => ({
      list,
      refresh,
      install,
      uninstall,
      update,
      setEnabled,
      setFeatureEnabled,
      hooks: { featureEnabled: enabledStore },
    }),
  }, PluginCenterSidebarButton))
}
