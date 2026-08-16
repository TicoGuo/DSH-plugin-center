/** The Plugin Center settings card: mirrors the native plugin-card chrome. */

import { useState } from 'react'
import type { ReactNode } from 'react'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PluginCenterCardFace } from './plugin-center-card.ts'
import css from './PluginCenterCard.module.css'

/** The card component rendered by the `settings.plugin.item` slot. */
export function PluginCenterCard({
  t, useCard, toggle,
}: InjectFace<PluginCenterCardFace> & PropsLocale<'pluginCenter'>): ReactNode {
  const [open, setOpen] = useState(false)
  const card = useCard(value => value)
  if (!card.available) return null
  return (
    <li className={open ? `${css.card} ${css.cardOpen}` : css.card}>
      <button
        type="button"
        className={css.header}
        aria-expanded={open}
        onClick={() => { setOpen(!open) }}
      >
        <span className={css.headText}>
          <span className={css.name}>{t('card.title')}</span>
          <span className={css.description}>{t('card.description')}</span>
        </span>
        <IconChevronDownOutline14 className={open ? css.chevronOpen : css.chevron} />
      </button>
      {open ? (
        <div className={css.body}>
          <div className={css.field}>
            <label className={css.label} htmlFor="plugin-center-enabled">{t('card.enable')}</label>
            <input
              id="plugin-center-enabled"
              className={css.switch}
              type="checkbox"
              role="switch"
              aria-checked={card.enabled}
              checked={card.enabled}
              disabled={card.saving}
              onChange={(event) => { toggle(event.currentTarget.checked) }}
            />
          </div>
        </div>
      ) : null}
    </li>
  )
}
