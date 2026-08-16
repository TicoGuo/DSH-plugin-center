import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** The Plugin Center settings card: mirrors the native plugin-card chrome. */
import { useState } from 'react';
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './PluginCenterCard.module.css';
/** The card component rendered by the `settings.plugin.item` slot. */
export function PluginCenterCard({ t, useCard, toggle, }) {
    const [open, setOpen] = useState(false);
    const card = useCard(value => value);
    if (!card.available)
        return null;
    return (_jsxs("li", { className: open ? `${css.card} ${css.cardOpen}` : css.card, children: [_jsxs("button", { type: "button", className: css.header, "aria-expanded": open, onClick: () => { setOpen(!open); }, children: [_jsxs("span", { className: css.headText, children: [_jsx("span", { className: css.name, children: t('card.title') }), _jsx("span", { className: css.description, children: t('card.description') })] }), _jsx(IconChevronDownOutline14, { className: open ? css.chevronOpen : css.chevron })] }), open ? (_jsx("div", { className: css.body, children: _jsxs("div", { className: css.field, children: [_jsx("label", { className: css.label, htmlFor: "plugin-center-enabled", children: t('card.enable') }), _jsx("input", { id: "plugin-center-enabled", className: css.switch, type: "checkbox", role: "switch", "aria-checked": card.enabled, checked: card.enabled, disabled: card.saving, onChange: (event) => { toggle(event.currentTarget.checked); } })] }) })) : null] }));
}
//# sourceMappingURL=PluginCenterCard.js.map