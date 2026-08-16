/** The Plugin Center sidebar entry: a footer button (New-Session chrome) that opens a right-panel overlay. */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { IconCordisPluginOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { PluginCenterView, type PluginCenterViewInjected } from './PluginCenterView.tsx'
import css from './PluginCenterSidebarButton.module.css'

/** Registration-side face the sidebar button injects. */
export type PluginCenterSidebarButtonFace = PluginCenterViewInjected

/** The footer button plus the right-panel overlay it toggles. */
export function PluginCenterSidebarButton({
  t, wide, list, refresh, install, uninstall, update, setEnabled,
}: InjectFace<PluginCenterSidebarButtonFace> & SidebarFooterActionOwnerProps & PropsLocale<'pluginCenter'>): ReactNode {
  const [open, setOpen] = useState(false)
  const [left, setLeft] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey) }
  }, [open])

  const toggle = (): void => {
    if (open) { setOpen(false); return }
    const rect = buttonRef.current?.getBoundingClientRect()
    setLeft(wide ? (rect?.right ?? 280) : 56)
    setOpen(true)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={wide ? css.button : css.buttonRail}
        onClick={toggle}
        title={t('view.pluginCenter')}
      >
        <IconCordisPluginOutline14 size={wide ? 14 : 18} />
        {wide && <span className={css.label}>{t('view.pluginCenter')}</span>}
      </button>
      {open && (
        <div className={css.overlay} style={{ left }} role="dialog" aria-modal="true">
          <PluginCenterView
            t={t}
            list={list}
            refresh={refresh}
            install={install}
            uninstall={uninstall}
            update={update}
            setEnabled={setEnabled}
          />
        </div>
      )}
    </>
  )
}
