import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Plugin Center view: toolbar (search/filter/refresh), card grid, detail expansion, and mutation feedback. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconChevronDownOutline14, IconRefreshOutline16, IconSearchOutline16, Modal, Toast, } from '@deepseek-ai/dsh-client-ui-primitives';
import { filterPluginEntries, PLUGIN_CENTER_FILTERS, } from "./plugin-center-store.js";
import css from './PluginCenterView.module.css';
const STATUS_LABEL_KEY = {
    'not-installed': 'status.notInstalled',
    'enabled': 'status.enabled',
    'disabled': 'status.disabled',
    'update-available': 'status.updateAvailable',
};
const FILTER_LABEL_KEY = {
    all: 'filter.all',
    installed: 'filter.installed',
    updatable: 'filter.updatable',
    disabled: 'filter.disabled',
};
const ACTION_LABEL_KEY = {
    install: 'action.install',
    uninstall: 'action.uninstall',
    update: 'action.update',
    enable: 'action.enable',
    disable: 'action.disable',
};
const SUCCESS_TOAST_KEY = {
    install: 'toast.install',
    uninstall: 'toast.uninstall',
    update: 'toast.update',
    enable: 'toast.enable',
    disable: 'toast.disable',
};
/** Build one card's action buttons for the entry's current state. */
function actionButtons(entry) {
    switch (entry.state) {
        case 'not-installed': return ['install'];
        case 'enabled': return ['disable', 'uninstall'];
        case 'disabled': return ['enable', 'uninstall'];
        case 'update-available': return ['update', 'disable', 'uninstall'];
    }
}
/** The Plugin Center conversation view. */
export function PluginCenterView({ t, list, refresh, install, uninstall, update, setEnabled, }) {
    const [state, setState] = useState({ status: 'loading' });
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);
    const [pending, setPending] = useState(new Set());
    const [confirmEntry, setConfirmEntry] = useState(null);
    const [toast, setToast] = useState(null);
    const toastSeq = useRef(0);
    const applyResult = useCallback((result) => {
        setState({ status: 'ready', snapshot: result, error: result.error });
    }, []);
    const load = useCallback(() => {
        setState(current => current.status === 'ready' ? current : { status: 'loading' });
        void list().then(applyResult, () => { setState({ status: 'error' }); });
    }, [applyResult, list]);
    useEffect(() => { load(); }, [load]);
    const reload = useCallback(() => {
        void list().then(applyResult, () => { setState({ status: 'error' }); });
    }, [applyResult, list]);
    const runRefresh = useCallback(() => {
        setState({ status: 'loading' });
        void refresh().then(applyResult, () => { setState({ status: 'error' }); });
    }, [applyResult, refresh]);
    const run = useCallback((id, action, op) => {
        setPending(current => new Set(current).add(id));
        void op().then((result) => {
            setToast({
                seq: ++toastSeq.current,
                text: result.ok
                    ? t(SUCCESS_TOAST_KEY[action])
                    : t('toast.failed', { message: result.message }),
            });
        }, (error) => {
            setToast({
                seq: ++toastSeq.current,
                text: t('toast.failed', { message: error instanceof Error ? error.message : String(error) }),
            });
        }).finally(() => {
            setPending(current => {
                const next = new Set(current);
                next.delete(id);
                return next;
            });
            reload();
        });
    }, [reload, t]);
    const snapshot = state.status === 'ready' ? state.snapshot : undefined;
    const loadError = state.status === 'ready' ? state.error : null;
    const filtered = useMemo(() => snapshot === undefined ? [] : filterPluginEntries(snapshot.entries, query, filter), [filter, query, snapshot]);
    const invoke = (id, action) => {
        switch (action) {
            case 'install':
                void run(id, 'install', () => install(id));
                return;
            case 'uninstall':
                setConfirmEntry(snapshot?.entries.find(entry => entry.id === id) ?? null);
                return;
            case 'update':
                void run(id, 'update', () => update(id));
                return;
            case 'enable':
                void run(id, 'enable', () => setEnabled(id, true));
                return;
            case 'disable':
                void run(id, 'disable', () => setEnabled(id, false));
                return;
        }
    };
    return (_jsxs("div", { className: css.root, "data-plugin-center": "", children: [_jsxs("div", { className: css.toolbar, role: "toolbar", "aria-label": t('toolbar.aria'), children: [_jsxs("div", { className: css.titleRow, children: [_jsx("h2", { className: css.title, children: t('view.pluginCenter') }), snapshot !== undefined && (_jsx("span", { className: css.stats, children: t('stats', { installed: snapshot.installedCount, total: snapshot.totalCount }) }))] }), _jsxs("div", { className: css.controls, children: [_jsxs("label", { className: css.search, children: [_jsx(IconSearchOutline16, { "aria-hidden": "true" }), _jsx("input", { type: "search", value: query, placeholder: t('search'), "aria-label": t('search'), onChange: (event) => { setQuery(event.currentTarget.value); } })] }), _jsx("select", { className: css.filter, value: filter, "aria-label": t('filter.all'), onChange: (event) => { setFilter(event.currentTarget.value); }, children: PLUGIN_CENTER_FILTERS.map(option => (_jsx("option", { value: option, children: t(FILTER_LABEL_KEY[option]) }, option))) }), _jsxs("button", { type: "button", className: css.refresh, onClick: runRefresh, children: [_jsx(IconRefreshOutline16, { size: 14, "aria-hidden": "true" }), _jsx("span", { children: t('refresh') })] })] })] }), loadError !== null ? _jsx("p", { className: css.banner, role: "alert", children: t('githubError', { message: loadError }) }) : null, state.status === 'loading' ? _jsx("p", { className: css.status, children: t('loading') }) : null, state.status === 'error' ? (_jsxs("div", { className: css.failure, children: [_jsx("p", { role: "alert", children: t('error') }), _jsx("button", { type: "button", onClick: load, children: t('retry') })] })) : null, snapshot !== undefined && snapshot.entries.length === 0 && loadError === null
                ? _jsx("p", { className: css.status, children: t('empty') })
                : null, snapshot !== undefined && snapshot.entries.length > 0 && filtered.length === 0 ? (_jsx("p", { className: css.status, children: t('emptySearch') })) : null, filtered.length > 0 ? (_jsx("ul", { className: css.cards, children: filtered.map((entry) => {
                    const open = expandedId === entry.id;
                    const busy = pending.has(entry.id);
                    return (_jsxs("li", { className: css.card, "data-open": open || undefined, children: [_jsxs("div", { className: css.cardBody, children: [_jsxs("button", { type: "button", className: css.cardContent, "aria-expanded": open, onClick: () => { setExpandedId(current => current === entry.id ? null : entry.id); }, children: [_jsx("span", { className: css.icon, "aria-hidden": "true", children: entry.icon }), _jsxs("span", { className: css.cardMain, children: [_jsxs("span", { className: css.cardTitleRow, children: [_jsx("strong", { className: css.cardTitle, children: entry.name }), _jsx("span", { className: css.version, children: entry.version })] }), _jsx("span", { className: css.description, children: entry.description })] }), _jsxs("span", { className: css.cardTrailing, children: [_jsx("span", { className: css.statusTag, "data-state": entry.state, children: t(STATUS_LABEL_KEY[entry.state]) }), _jsx(IconChevronDownOutline14, { className: css.chevron, size: 12, "aria-hidden": "true" })] })] }), _jsx("div", { className: css.actions, children: actionButtons(entry).map(kind => (_jsx("button", { type: "button", disabled: busy, "data-action": kind, onClick: () => { invoke(entry.id, kind); }, children: busy ? t('loading') : t(ACTION_LABEL_KEY[kind]) }, kind))) })] }), open ? (_jsx("div", { className: css.details, children: _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: t('detail.version') }), _jsx("dd", { children: entry.version })] }), _jsxs("div", { children: [_jsx("dt", { children: t('detail.installedVersion') }), _jsx("dd", { children: entry.installedVersion ?? '—' })] }), _jsxs("div", { children: [_jsx("dt", { children: t('detail.author') }), _jsx("dd", { children: entry.author })] }), _jsxs("div", { children: [_jsx("dt", { children: t('detail.repository') }), _jsx("dd", { children: _jsx("a", { href: entry.repository, target: "_blank", rel: "noreferrer", children: entry.repository }) })] }), _jsxs("div", { children: [_jsx("dt", { children: t('detail.changelog') }), _jsx("dd", { children: entry.changelog })] }), _jsxs("div", { children: [_jsx("dt", { children: t('detail.requirements') }), _jsx("dd", { children: entry.requirements.length > 0 ? entry.requirements.join('、') : t('detail.requirementsEmpty') })] })] }) })) : null] }, entry.id));
                }) })) : null, toast !== null && _jsx(Toast, { text: toast.text, onDone: () => { setToast(null); } }, toast.seq), confirmEntry !== null && (_jsx(Modal, { open: true, onClose: () => { setConfirmEntry(null); }, title: t('confirm.uninstallTitle'), footer: (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => { setConfirmEntry(null); }, children: t('confirm.cancel') }), _jsx("button", { type: "button", "data-danger": "true", onClick: () => {
                                const entry = confirmEntry;
                                setConfirmEntry(null);
                                void run(entry.id, 'uninstall', () => uninstall(entry.id));
                            }, children: t('confirm.confirm') })] })), children: _jsx("p", { children: t('confirm.uninstallBody', { name: confirmEntry.name }) }) }))] }));
}
//# sourceMappingURL=PluginCenterView.js.map