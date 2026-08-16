/** The Plugin Center settings card: an enable toggle bound to the `plugin-center` settings namespace. */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
/** Bridges the `plugin-center` settings namespace onto the enable card. */
export class PluginCenterCardController {
    scope;
    store;
    saving = false;
    /** @param scope - the bound settings scope for the `plugin-center` namespace. */
    constructor(scope) {
        this.scope = scope;
        this.store = createSnapshotStore(this.projection());
        scope.subscribe(() => { this.store.set(this.projection()); });
    }
    /** Build the face the card's slot registration injects. */
    inject() {
        return {
            hooks: { card: this.store },
            toggle: (enabled) => { void this.toggle(enabled); },
        };
    }
    projection() {
        const snapshot = this.scope.getSnapshot();
        return {
            available: snapshot.status === 'ready',
            enabled: snapshot.value?.enabled ?? true,
            saving: this.saving,
        };
    }
    async toggle(enabled) {
        if (this.saving)
            return;
        this.saving = true;
        this.store.set(this.projection());
        try {
            await this.scope.set('enabled', enabled);
        }
        finally {
            this.saving = false;
            this.store.set(this.projection());
        }
    }
}
//# sourceMappingURL=plugin-center-card.js.map