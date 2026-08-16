/** The Plugin Center sidebar entry: a button above the workspace region. */

import type { ReactNode } from 'react'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarHeaderActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import css from './PluginCenterSidebarButton.module.css'

/** Registration-side face the sidebar button injects. */
export interface PluginCenterSidebarButtonFace {
  /** Open the Plugin Center (switch the main panel to it). */
  open: () => void
}

/** The button rendered by the `sidebar.header.action` slot. */
export function PluginCenterSidebarButton({
  t, wide, open,
}: InjectFace<PluginCenterSidebarButtonFace> & SidebarHeaderActionOwnerProps & PropsLocale<'pluginCenter'>): ReactNode {
  return (
    <button
      type="button"
      className={wide ? css.button : css.buttonRail}
      onClick={open}
      title={t('view.pluginCenter')}
    >
      <span className={css.icon} aria-hidden="true">🧩</span>
      {wide && <span className={css.label}>{t('view.pluginCenter')}</span>}
    </button>
  )
}
