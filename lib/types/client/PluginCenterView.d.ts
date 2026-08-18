/** Plugin Center view: header, filter pills, card grid, detail expansion, and mutation feedback. */
import type { ReactNode } from 'react';
import type { PluginCenterSnapshot, PluginOperationResult } from '@ticoguo/dsh-plugin-center/types';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
/** The list/refresh payload: the snapshot plus an optional load error. */
export type PluginCenterListResult = PluginCenterSnapshot & {
    readonly error: string | null;
};
/** Session-independent controls supplied by the registration's inject factory. */
export interface PluginCenterViewInjected {
    list: () => Promise<PluginCenterListResult>;
    refresh: () => Promise<PluginCenterListResult>;
    install: (id: string) => Promise<PluginOperationResult>;
    uninstall: (id: string) => Promise<PluginOperationResult>;
    update: (id: string) => Promise<PluginOperationResult>;
    setEnabled: (id: string, enabled: boolean) => Promise<PluginOperationResult>;
}
/** The full view prop set: the injected ops plus the live feature flag. */
export interface PluginCenterViewProps extends PluginCenterViewInjected {
    /** Whether the plugin-center feature is on; `null` while the status is unresolved. */
    featureEnabled: boolean | null;
    /** Flip the feature flag (the shared store refreshes on success). */
    setFeatureEnabled: (enabled: boolean) => Promise<{
        ok: boolean;
        enabled: boolean;
    }>;
}
/** The Plugin Center conversation view. */
export declare function PluginCenterView({ t, list, refresh, install, uninstall, update, setEnabled, featureEnabled, setFeatureEnabled, }: PluginCenterViewProps & PropsLocale<'pluginCenter'>): ReactNode;
//# sourceMappingURL=PluginCenterView.d.ts.map