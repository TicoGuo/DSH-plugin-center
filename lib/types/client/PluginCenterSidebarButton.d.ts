/** The Plugin Center sidebar entry: a footer button (New-Session chrome) that opens a right-panel overlay. */
import type { ReactNode } from 'react';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client';
import { type PluginCenterViewInjected } from './PluginCenterView.tsx';
/** Registration-side face the sidebar button injects (the view ops plus the feature flag store). */
export interface PluginCenterSidebarButtonFace extends PluginCenterViewInjected {
    /** Flip the plugin-center feature flag; the store is refreshed on success. */
    setFeatureEnabled: (enabled: boolean) => Promise<{
        ok: boolean;
        enabled: boolean;
    }>;
    /** The shared feature-enabled flag (`null` until the status resolves). */
    hooks: {
        featureEnabled: SnapshotStore<{
            enabled: boolean | null;
        }>;
    };
}
/** The footer button plus the right-panel overlay it toggles. */
export declare function PluginCenterSidebarButton({ t, wide, useFeatureEnabled, setFeatureEnabled, list, refresh, install, uninstall, update, setEnabled, }: InjectFace<PluginCenterSidebarButtonFace> & SidebarFooterActionOwnerProps & PropsLocale<'pluginCenter'>): ReactNode;
//# sourceMappingURL=PluginCenterSidebarButton.d.ts.map