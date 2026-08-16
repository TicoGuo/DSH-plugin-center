/** Plugin Center view: toolbar (search/filter/refresh), card grid, detail expansion, and mutation feedback. */
import type { ReactNode } from 'react';
import type { PluginCenterSnapshot, PluginOperationResult } from '@ticoguo/dsh-plugin-center/types';
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
/** The list/refresh payload: the snapshot plus an optional GitHub load error. */
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
/** The Plugin Center conversation view. */
export declare function PluginCenterView({ t, list, refresh, install, uninstall, update, setEnabled, }: ConvViewProps & InjectFace<PluginCenterViewInjected> & PropsLocale<'pluginCenter'>): ReactNode;
//# sourceMappingURL=PluginCenterView.d.ts.map