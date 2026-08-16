import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Plugin Center view: header, filter pills, card grid, detail expansion, and mutation feedback. */
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
/** Format a star count compactly (20008 → "20.0k"). */
function formatStars(stars) {
    if (stars >= 1000)
        return `${(stars / 1000).toFixed(1)}k`;
    return String(stars);
}
/** Build one card's action buttons for the entry's current state. */
function actionButtons(entry) {
    switch (entry.state) {
        case 'not-installed': return ['install'];
        case 'enabled': return ['update', 'disable', 'uninstall'];
        case 'disabled': return ['update', 'enable', 'uninstall'];
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
                    ? result.code === 'up-to-date'
                        ? t('toast.upToDate')
                        : `${t(SUCCESS_TOAST_KEY[action])}${t('toast.restartHint')}`
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
    return (_jsxs("div", { className: css.root, "data-plugin-center": "", children: [_jsxs("header", { className: css.header, children: [_jsxs("div", { className: css.titleRow, children: [_jsx("h2", { className: css.title, children: t('view.pluginCenter') }), snapshot !== undefined && (_jsx("span", { className: css.stats, children: t('stats', { installed: snapshot.installedCount, total: snapshot.totalCount }) }))] }), _jsxs("div", { className: css.headerControls, children: [_jsxs("label", { className: css.search, children: [_jsx(IconSearchOutline16, { "aria-hidden": "true" }), _jsx("input", { type: "search", value: query, placeholder: t('search'), "aria-label": t('search'), onChange: (event) => { setQuery(event.currentTarget.value); } })] }), _jsx("button", { type: "button", className: css.refresh, title: t('refresh'), "aria-label": t('refresh'), onClick: runRefresh, children: _jsx(IconRefreshOutline16, { "aria-hidden": "true" }) })] })] }), _jsx("div", { className: css.filters, role: "tablist", "aria-label": t('filter.all'), children: PLUGIN_CENTER_FILTERS.map(option => (_jsx("button", { type: "button", role: "tab", "aria-selected": filter === option, className: filter === option ? css.filterActive : css.filterPill, onClick: () => { setFilter(option); }, children: t(FILTER_LABEL_KEY[option]) }, option))) }), loadError !== null ? _jsx("p", { className: css.banner, role: "alert", children: t('githubError', { message: loadError }) }) : null, state.status === 'loading' ? _jsx("p", { className: css.status, children: t('loading') }) : null, state.status === 'error' ? (_jsxs("div", { className: css.failure, children: [_jsx("p", { role: "alert", children: t('error') }), _jsx("button", { type: "button", onClick: load, children: t('retry') })] })) : null, snapshot !== undefined && snapshot.entries.length === 0 && loadError === null
                ? _jsx("p", { className: css.status, children: t('empty') })
                : null, snapshot !== undefined && snapshot.entries.length > 0 && filtered.length === 0 ? (_jsx("p", { className: css.status, children: t('emptySearch') })) : null, filtered.length > 0 ? (_jsx("ul", { className: css.cards, children: filtered.map((entry) => {
                    const open = expandedId === entry.id;
                    const busy = pending.has(entry.id);
                    return (_jsxs("li", { className: css.card, "data-open": open || undefined, children: [_jsxs("button", { type: "button", className: css.cardContent, "aria-expanded": open, onClick: () => { setExpandedId(current => current === entry.id ? null : entry.id); }, children: [_jsxs("span", { className: css.cardMain, children: [_jsxs("span", { className: css.nameRow, children: [_jsx("strong", { className: css.cardTitle, children: entry.name }), entry.stars > 0 && (_jsxs("span", { className: css.stars, title: t('detail.stars'), children: ["\u2605 ", formatStars(entry.stars)] }))] }), _jsx("span", { className: css.author, children: entry.author }), _jsx("span", { className: css.description, children: entry.description })] }), _jsxs("span", { className: css.cardTrailing, children: [_jsx("span", { className: css.statusTag, "data-state": entry.state, children: t(STATUS_LABEL_KEY[entry.state]) }), _jsx(IconChevronDownOutline14, { className: css.chevron, size: 14, "aria-hidden": "true" })] })] }), _jsx("div", { className: css.actions, children: actionButtons(entry).map(kind => (_jsx("button", { type: "button", disabled: busy, "data-action": kind, onClick: () => { invoke(entry.id, kind); }, children: busy ? t('loading') : t(ACTION_LABEL_KEY[kind]) }, kind))) }), open ? (_jsx("div", { className: css.details, children: _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: t('detail.description') }), _jsx("dd", { children: entry.description })] }), _jsxs("div", { children: [_jsx("dt", { children: t('detail.author') }), _jsx("dd", { children: entry.author })] }), _jsxs("div", { children: [_jsx("dt", { children: t('detail.stars') }), _jsx("dd", { children: entry.stars })] }), _jsxs("div", { children: [_jsx("dt", { children: t('detail.repository') }), _jsx("dd", { children: _jsx("a", { href: entry.repository, target: "_blank", rel: "noreferrer", children: entry.repository }) })] }), _jsxs("div", { children: [_jsx("dt", { children: t('detail.installCommand') }), _jsx("dd", { children: _jsx("code", { children: `dsh plugin add ${entry.packageName}` }) })] }), entry.installedVersion !== null && (_jsxs("div", { children: [_jsx("dt", { children: t('detail.installedVersion') }), _jsx("dd", { children: entry.installedVersion })] }))] }) })) : null] }, entry.id));
                }) })) : null, toast !== null && _jsx(Toast, { text: toast.text, onDone: () => { setToast(null); } }, toast.seq), confirmEntry !== null && (_jsx(Modal, { open: true, onClose: () => { setConfirmEntry(null); }, title: t('confirm.uninstallTitle'), footer: (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => { setConfirmEntry(null); }, children: t('confirm.cancel') }), _jsx("button", { type: "button", "data-danger": "true", onClick: () => {
                                const entry = confirmEntry;
                                setConfirmEntry(null);
                                void run(entry.id, 'uninstall', () => uninstall(entry.id));
                            }, children: t('confirm.confirm') })] })), children: _jsx("p", { children: t('confirm.uninstallBody', { name: confirmEntry.name }) }) }))] }));
}
//# sourceMappingURL=PluginCenterView.js.map