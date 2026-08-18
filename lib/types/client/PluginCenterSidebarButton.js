import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** The Plugin Center sidebar entry: a footer button (New-Session chrome) that opens a right-panel overlay. */
import { useEffect, useRef, useState } from 'react';
import { IconCordisPluginOutline14 } from '@deepseek-ai/dsh-client-ui-primitives';
import { PluginCenterView } from "./PluginCenterView.js";
import css from './PluginCenterSidebarButton.module.css';
/** The footer button plus the right-panel overlay it toggles. */
export function PluginCenterSidebarButton({ t, wide, useFeatureEnabled, setFeatureEnabled, list, refresh, install, uninstall, update, setEnabled, }) {
    const [open, setOpen] = useState(false);
    const [left, setLeft] = useState(0);
    const buttonRef = useRef(null);
    const featureEnabled = useFeatureEnabled(value => value.enabled);
    useEffect(() => {
        if (!open)
            return;
        const onKey = (event) => { if (event.key === 'Escape')
            setOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('keydown', onKey); };
    }, [open]);
    const toggle = () => {
        if (open) {
            setOpen(false);
            return;
        }
        const rect = buttonRef.current?.getBoundingClientRect();
        setLeft(wide ? (rect?.right ?? 280) : 56);
        setOpen(true);
    };
    return (_jsxs(_Fragment, { children: [_jsxs("button", { ref: buttonRef, type: "button", className: wide ? css.button : css.buttonRail, onClick: toggle, title: t('view.pluginCenter'), children: [_jsx(IconCordisPluginOutline14, { size: wide ? 14 : 18 }), wide && _jsx("span", { className: css.label, children: t('view.pluginCenter') })] }), open && (_jsx("div", { className: css.overlay, style: { left }, role: "dialog", "aria-modal": "true", children: _jsx(PluginCenterView, { t: t, list: list, refresh: refresh, install: install, uninstall: uninstall, update: update, setEnabled: setEnabled, featureEnabled: featureEnabled, setFeatureEnabled: setFeatureEnabled }) }))] }));
}
//# sourceMappingURL=PluginCenterSidebarButton.js.map