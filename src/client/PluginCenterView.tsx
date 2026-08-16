/** Plugin Center view: toolbar (search/filter/refresh), card grid, detail expansion, and mutation feedback. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  PluginCenterEntry, PluginCenterSnapshot, PluginInstallState, PluginOperationResult,
} from '@deepseek-ai/dsh-plugin-center/types'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  IconChevronDownOutline14, IconRefreshOutline16, IconSearchOutline16,
  Modal, Toast,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { PluginCenterKey } from './locales.ts'
import {
  filterPluginEntries, PLUGIN_CENTER_FILTERS, type PluginCenterFilter,
} from './plugin-center-store.ts'
import css from './PluginCenterView.module.css'

/** The list/refresh payload: the snapshot plus an optional GitHub load error. */
export type PluginCenterListResult = PluginCenterSnapshot & { readonly error: string | null }

/** Session-independent controls supplied by the registration's inject factory. */
export interface PluginCenterViewInjected {
  list: () => Promise<PluginCenterListResult>
  refresh: () => Promise<PluginCenterListResult>
  install: (id: string) => Promise<PluginOperationResult>
  uninstall: (id: string) => Promise<PluginOperationResult>
  update: (id: string) => Promise<PluginOperationResult>
  setEnabled: (id: string, enabled: boolean) => Promise<PluginOperationResult>
}

/** The mutation verbs the view drives (for pending state and success copy). */
type ActionKind = 'install' | 'uninstall' | 'update' | 'enable' | 'disable'

type ViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly snapshot: PluginCenterSnapshot; readonly error: string | null }

interface ToastState {
  readonly seq: number
  readonly text: string
}

const STATUS_LABEL_KEY = {
  'not-installed': 'status.notInstalled',
  'enabled': 'status.enabled',
  'disabled': 'status.disabled',
  'update-available': 'status.updateAvailable',
} as const satisfies Record<PluginInstallState, PluginCenterKey>

const FILTER_LABEL_KEY = {
  all: 'filter.all',
  installed: 'filter.installed',
  updatable: 'filter.updatable',
  disabled: 'filter.disabled',
} as const satisfies Record<PluginCenterFilter, PluginCenterKey>

const ACTION_LABEL_KEY = {
  install: 'action.install',
  uninstall: 'action.uninstall',
  update: 'action.update',
  enable: 'action.enable',
  disable: 'action.disable',
} as const satisfies Record<ActionKind, PluginCenterKey>

const SUCCESS_TOAST_KEY = {
  install: 'toast.install',
  uninstall: 'toast.uninstall',
  update: 'toast.update',
  enable: 'toast.enable',
  disable: 'toast.disable',
} as const satisfies Record<ActionKind, PluginCenterKey>

/** Build one card's action buttons for the entry's current state. */
function actionButtons(entry: PluginCenterEntry): readonly ActionKind[] {
  switch (entry.state) {
    case 'not-installed': return ['install']
    case 'enabled': return ['disable', 'uninstall']
    case 'disabled': return ['enable', 'uninstall']
    case 'update-available': return ['update', 'disable', 'uninstall']
  }
}

/** The Plugin Center conversation view. */
export function PluginCenterView({
  t, list, refresh, install, uninstall, update, setEnabled,
}: ConvViewProps & InjectFace<PluginCenterViewInjected> & PropsLocale<'pluginCenter'>): ReactNode {
  const [state, setState] = useState<ViewState>({ status: 'loading' })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PluginCenterFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())
  const [confirmEntry, setConfirmEntry] = useState<PluginCenterEntry | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastSeq = useRef(0)

  const applyResult = useCallback((result: PluginCenterListResult) => {
    setState({ status: 'ready', snapshot: result, error: result.error })
  }, [])

  const load = useCallback(() => {
    setState(current => current.status === 'ready' ? current : { status: 'loading' })
    void list().then(applyResult, () => { setState({ status: 'error' }) })
  }, [applyResult, list])

  useEffect(() => { load() }, [load])

  const reload = useCallback(() => {
    void list().then(applyResult, () => { setState({ status: 'error' }) })
  }, [applyResult, list])

  const runRefresh = useCallback(() => {
    setState({ status: 'loading' })
    void refresh().then(applyResult, () => { setState({ status: 'error' }) })
  }, [applyResult, refresh])

  const run = useCallback((id: string, action: ActionKind, op: () => Promise<PluginOperationResult>) => {
    setPending(current => new Set(current).add(id))
    void op().then(
      (result) => {
        setToast({
          seq: ++toastSeq.current,
          text: result.ok
            ? t(SUCCESS_TOAST_KEY[action])
            : t('toast.failed', { message: result.message }),
        })
      },
      (error: unknown) => {
        setToast({
          seq: ++toastSeq.current,
          text: t('toast.failed', { message: error instanceof Error ? error.message : String(error) }),
        })
      },
    ).finally(() => {
      setPending(current => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
      reload()
    })
  }, [reload, t])

  const snapshot = state.status === 'ready' ? state.snapshot : undefined
  const loadError = state.status === 'ready' ? state.error : null
  const filtered = useMemo(
    () => snapshot === undefined ? [] : filterPluginEntries(snapshot.entries, query, filter),
    [filter, query, snapshot],
  )

  const invoke = (id: string, action: ActionKind): void => {
    switch (action) {
      case 'install': void run(id, 'install', () => install(id)); return
      case 'uninstall': setConfirmEntry(snapshot?.entries.find(entry => entry.id === id) ?? null); return
      case 'update': void run(id, 'update', () => update(id)); return
      case 'enable': void run(id, 'enable', () => setEnabled(id, true)); return
      case 'disable': void run(id, 'disable', () => setEnabled(id, false)); return
    }
  }

  return (
    <div className={css.root} data-plugin-center="">
      <div className={css.toolbar} role="toolbar" aria-label={t('toolbar.aria')}>
        <div className={css.titleRow}>
          <h2 className={css.title}>{t('view.pluginCenter')}</h2>
          {snapshot !== undefined && (
            <span className={css.stats}>{t('stats', { installed: snapshot.installedCount, total: snapshot.totalCount })}</span>
          )}
        </div>
        <div className={css.controls}>
          <label className={css.search}>
            <IconSearchOutline16 aria-hidden="true" />
            <input
              type="search"
              value={query}
              placeholder={t('search')}
              aria-label={t('search')}
              onChange={(event) => { setQuery(event.currentTarget.value) }}
            />
          </label>
          <select
            className={css.filter}
            value={filter}
            aria-label={t('filter.all')}
            onChange={(event) => { setFilter(event.currentTarget.value as PluginCenterFilter) }}
          >
            {PLUGIN_CENTER_FILTERS.map(option => (
              <option key={option} value={option}>{t(FILTER_LABEL_KEY[option])}</option>
            ))}
          </select>
          <button type="button" className={css.refresh} onClick={runRefresh}>
            <IconRefreshOutline16 size={14} aria-hidden="true" />
            <span>{t('refresh')}</span>
          </button>
        </div>
      </div>

      {loadError !== null ? <p className={css.banner} role="alert">{t('githubError', { message: loadError })}</p> : null}
      {state.status === 'loading' ? <p className={css.status}>{t('loading')}</p> : null}
      {state.status === 'error' ? (
        <div className={css.failure}>
          <p role="alert">{t('error')}</p>
          <button type="button" onClick={load}>{t('retry')}</button>
        </div>
      ) : null}
      {snapshot !== undefined && snapshot.entries.length === 0 && loadError === null
        ? <p className={css.status}>{t('empty')}</p>
        : null}
      {snapshot !== undefined && snapshot.entries.length > 0 && filtered.length === 0 ? (
        <p className={css.status}>{t('emptySearch')}</p>
      ) : null}
      {filtered.length > 0 ? (
        <ul className={css.cards}>
          {filtered.map((entry) => {
            const open = expandedId === entry.id
            const busy = pending.has(entry.id)
            return (
              <li key={entry.id} className={css.card} data-open={open || undefined}>
                <div className={css.cardBody}>
                  <button
                    type="button"
                    className={css.cardContent}
                    aria-expanded={open}
                    onClick={() => { setExpandedId(current => current === entry.id ? null : entry.id) }}
                  >
                    <span className={css.icon} aria-hidden="true">{entry.icon}</span>
                    <span className={css.cardMain}>
                      <span className={css.cardTitleRow}>
                        <strong className={css.cardTitle}>{entry.name}</strong>
                        <span className={css.version}>{entry.version}</span>
                      </span>
                      <span className={css.description}>{entry.description}</span>
                    </span>
                    <span className={css.cardTrailing}>
                      <span className={css.statusTag} data-state={entry.state}>{t(STATUS_LABEL_KEY[entry.state])}</span>
                      <IconChevronDownOutline14 className={css.chevron} size={12} aria-hidden="true" />
                    </span>
                  </button>
                  <div className={css.actions}>
                    {actionButtons(entry).map(kind => (
                      <button
                        key={kind}
                        type="button"
                        disabled={busy}
                        data-action={kind}
                        onClick={() => { invoke(entry.id, kind) }}
                      >
                        {busy ? t('loading') : t(ACTION_LABEL_KEY[kind])}
                      </button>
                    ))}
                  </div>
                </div>
                {open ? (
                  <div className={css.details}>
                    <dl>
                      <div><dt>{t('detail.version')}</dt><dd>{entry.version}</dd></div>
                      <div><dt>{t('detail.installedVersion')}</dt><dd>{entry.installedVersion ?? '—'}</dd></div>
                      <div><dt>{t('detail.author')}</dt><dd>{entry.author}</dd></div>
                      <div>
                        <dt>{t('detail.repository')}</dt>
                        <dd><a href={entry.repository} target="_blank" rel="noreferrer">{entry.repository}</a></dd>
                      </div>
                      <div><dt>{t('detail.changelog')}</dt><dd>{entry.changelog}</dd></div>
                      <div>
                        <dt>{t('detail.requirements')}</dt>
                        <dd>{entry.requirements.length > 0 ? entry.requirements.join('、') : t('detail.requirementsEmpty')}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      {toast !== null && <Toast key={toast.seq} text={toast.text} onDone={() => { setToast(null) }} />}
      {confirmEntry !== null && (
        <Modal
          open
          onClose={() => { setConfirmEntry(null) }}
          title={t('confirm.uninstallTitle')}
          footer={(
            <>
              <button type="button" onClick={() => { setConfirmEntry(null) }}>{t('confirm.cancel')}</button>
              <button
                type="button"
                data-danger="true"
                onClick={() => {
                  const entry = confirmEntry
                  setConfirmEntry(null)
                  void run(entry.id, 'uninstall', () => uninstall(entry.id))
                }}
              >
                {t('confirm.confirm')}
              </button>
            </>
          )}
        >
          <p>{t('confirm.uninstallBody', { name: confirmEntry.name })}</p>
        </Modal>
      )}
    </div>
  )
}
