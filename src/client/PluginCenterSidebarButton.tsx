/** The Plugin Center sidebar entry: a footer button that opens a full-screen overlay. */

import { useState } from 'react'
import type { ReactNode } from 'react'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { PluginCenterView, type PluginCenterViewInjected } from './PluginCenterView.tsx'
import css from './PluginCenterSidebarButton.module.css'

/** Registration-side face the sidebar button injects. */
export type PluginCenterSidebarButtonFace = PluginCenterViewInjected

/** The footer button plus the overlay it opens. */
export function PluginCenterSidebarButton({
  t, wide, list, refresh, install, uninstall, update, setEnabled,
}: InjectFace<PluginCenterSidebarButtonFace> & SidebarFooterActionOwnerProps & PropsLocale<'pluginCenter'>): ReactNode {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className={wide ? css.button : css.buttonRail}
        onClick={() => { setOpen(true) }}
        title={t('view.pluginCenter')}
      >
        <span className={css.icon} aria-hidden="true">🧩</span>
        {wide && <span className={css.label}>{t('view.pluginCenter')}</span>}
      </button>
      {open && (
        <div className={css.overlay} role="dialog" aria-modal="true">
          <PluginCenterView
            t={t}
            list={list}
            refresh={refresh}
            install={install}
            uninstall={uninstall}
            update={update}
            setEnabled={setEnabled}
            onClose={() => { setOpen(false) }}
          />
        </div>
      )}
    </>
  )
}
