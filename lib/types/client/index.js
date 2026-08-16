/**
 * Browser Plugin Center plugin: the conversation view tab plus the settings
 * enable card. It is a pure consumer of the host `/plugin-center` HTTP routes
 * and the `plugin-center` settings namespace.
 */
import { PluginCenterView } from "./PluginCenterView.js";
import { PluginCenterCard } from "./PluginCenterCard.js";
import { PluginCenterCardController } from "./plugin-center-card.js";
import { en, NS, zh } from "./locales.js";
/** Services required: the conversation slot, locale, and the settings scope. */
export const inject = ['slots', 'locale', 'settingsScope'];
/** Fetch one `/plugin-center` endpoint and parse its JSON body, throwing on a transport error. */
async function request(path, init) {
    const response = await fetch(`/plugin-center${path}`, {
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        ...init,
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? `HTTP ${response.status}`);
    }
    return (await response.json());
}
/**
 * Client plugin body: register the Plugin Center view tab and the settings
 * enable card. Both registrations ride the slot service's effect wrapper, so
 * plugin unload removes them.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-plugin-center: dictionaries');
    const t = ctx.locale.bind(NS);
    const list = () => request('/list');
    const refresh = () => request('/refresh', { method: 'POST' });
    const install = (id) => request('/install', { method: 'POST', body: JSON.stringify({ id }) });
    const uninstall = (id) => request('/uninstall', { method: 'POST', body: JSON.stringify({ id }) });
    const update = (id) => request('/update', { method: 'POST', body: JSON.stringify({ id }) });
    const setEnabled = (id, enabled) => request(enabled ? '/enable' : '/disable', {
        method: 'POST',
        body: JSON.stringify({ id }),
    });
    ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id: 'plugin-center',
        order: 20,
        locale: NS,
        label: () => t('view.pluginCenter'),
        inject: (_sessionId) => ({
            list, refresh, install, uninstall, update, setEnabled,
        }),
    }, PluginCenterView));
    const card = new PluginCenterCardController(ctx.settingsScope.bind({ namespace: NS }));
    ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
        name: 'settings.plugin.item',
        id: 'plugin-center',
        order: 20,
        locale: NS,
        inject: () => card.inject(),
    }, PluginCenterCard));
}
//# sourceMappingURL=index.js.map