/** The Plugin Center settings card: an enable toggle bound to the `plugin-center` settings namespace. */
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
/** The `plugin-center` settings section (only the user-facing toggle is rendered). */
export interface PluginCenterSettings {
    enabled?: boolean;
}
/** What the card renders. */
export interface PluginCenterCardState {
    /** False while the namespace is not served to this client; the card renders nothing. */
    available: boolean;
    /** The current on/off value (defaults to enabled). */
    enabled: boolean;
    /** Whether a toggle write is crossing the wire. */
    saving: boolean;
}
/** The registration-side face the card's slot entry injects. */
export interface PluginCenterCardFace {
    hooks: {
        /** Card snapshot bound by the renderer as useCard. */
        card: SnapshotStore<PluginCenterCardState>;
    };
    /** Toggle the enable state. */
    toggle: (enabled: boolean) => void;
}
/** Bridges the `plugin-center` settings namespace onto the enable card. */
export declare class PluginCenterCardController {
    private readonly scope;
    private readonly store;
    private saving;
    /** @param scope - the bound settings scope for the `plugin-center` namespace. */
    constructor(scope: SettingsScope<PluginCenterSettings>);
    /** Build the face the card's slot registration injects. */
    inject(): PluginCenterCardFace;
    private projection;
    private toggle;
}
//# sourceMappingURL=plugin-center-card.d.ts.map