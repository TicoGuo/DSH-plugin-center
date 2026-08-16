/** The Plugin Center settings card: description + enable toggle. */

import type { ReactNode } from 'react'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { PluginCenterCardFace } from './plugin-center-card.ts'
import css from './PluginCenterCard.module.css'

/** The card component rendered by the `settings.plugin.item` slot. */
export function PluginCenterCard({
  t, useCard, toggle,
}: InjectFace<PluginCenterCardFace> & PropsLocale<'pluginCenter'>): ReactNode {
  const card = useCard(value => value)
  if (!card.available) return null
  return (
    <div className={css.card}>
      <div className={css.header}>
        <h3 className={css.title}>{t('card.title')}</h3>
        <label className={css.switch}>
          <input
            type="checkbox"
            checked={card.enabled}
            disabled={card.saving}
            onChange={(event) => { toggle(event.currentTarget.checked) }}
          />
          <span>{t('card.enable')}</span>
        </label>
      </div>
      <p className={css.description}>{t('card.description')}</p>
    </div>
  )
}
