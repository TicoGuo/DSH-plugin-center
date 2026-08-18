/** `pluginCenter` namespace dictionaries (view tab, toolbar, cards, actions, settings card). */
/** Dictionary namespace owned by this plugin. */
export declare const NS = "pluginCenter";
/** The plugin-center dictionary key set (the source of truth for both locales). */
export type PluginCenterKey = 'view.pluginCenter' | 'toolbar.aria' | 'search' | 'filter.all' | 'filter.installed' | 'filter.updatable' | 'filter.disabled' | 'refresh' | 'stats' | 'status.notInstalled' | 'status.enabled' | 'status.disabled' | 'status.updateAvailable' | 'action.install' | 'action.uninstall' | 'action.update' | 'action.enable' | 'action.disable' | 'detail.version' | 'detail.installedVersion' | 'detail.author' | 'detail.repository' | 'detail.changelog' | 'detail.requirements' | 'detail.requirementsEmpty' | 'detail.description' | 'detail.stars' | 'detail.installCommand' | 'confirm.uninstallTitle' | 'confirm.uninstallBody' | 'confirm.cancel' | 'confirm.confirm' | 'toast.install' | 'toast.uninstall' | 'toast.update' | 'toast.enable' | 'toast.disable' | 'toast.failed' | 'toast.upToDate' | 'toast.restartHint' | 'loading' | 'error' | 'retry' | 'empty' | 'emptySearch' | 'disabled' | 'enableFeature' | 'githubError';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The Plugin Center view tab, toolbar, cards, actions, and settings-card copy. */
        'pluginCenter': PluginCenterKey;
    }
}
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: Record<PluginCenterKey, string>;
/** English dictionary. */
export declare const en: Record<PluginCenterKey, string>;
//# sourceMappingURL=locales.d.ts.map