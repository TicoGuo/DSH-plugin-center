import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import css from './PluginCenterCard.module.css';
/** The card component rendered by the `settings.plugin.item` slot. */
export function PluginCenterCard({ t, useCard, toggle, }) {
    const card = useCard(value => value);
    if (!card.available)
        return null;
    return (_jsxs("div", { className: css.card, children: [_jsxs("div", { className: css.header, children: [_jsx("h3", { className: css.title, children: t('card.title') }), _jsxs("label", { className: css.switch, children: [_jsx("input", { type: "checkbox", checked: card.enabled, disabled: card.saving, onChange: (event) => { toggle(event.currentTarget.checked); } }), _jsx("span", { children: t('card.enable') })] })] }), _jsx("p", { className: css.description, children: t('card.description') })] }));
}
//# sourceMappingURL=PluginCenterCard.js.map