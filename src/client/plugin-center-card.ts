/** The Plugin Center settings card: an enable toggle bound to the `plugin-center` settings namespace. */

import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

/** The `plugin-center` settings section (only the user-facing toggle is rendered). */
export interface PluginCenterSettings {
  enabled?: boolean
}

/** What the card renders. */
export interface PluginCenterCardState {
  /** False while the namespace is not served to this client; the card renders nothing. */
  available: boolean
  /** The current on/off value (defaults to enabled). */
  enabled: boolean
  /** Whether a toggle write is crossing the wire. */
  saving: boolean
}

/** The registration-side face the card's slot entry injects. */
export interface PluginCenterCardFace {
  hooks: {
    /** Card snapshot bound by the renderer as useCard. */
    card: SnapshotStore<PluginCenterCardState>
  }
  /** Toggle the enable state. */
  toggle: (enabled: boolean) => void
}

/** Bridges the `plugin-center` settings namespace onto the enable card. */
export class PluginCenterCardController {
  private readonly store: SnapshotStore<PluginCenterCardState>
  private saving = false

  /** @param scope - the bound settings scope for the `plugin-center` namespace. */
  constructor(private readonly scope: SettingsScope<PluginCenterSettings>) {
    this.store = createSnapshotStore(this.projection())
    scope.subscribe(() => { this.store.set(this.projection()) })
  }

  /** Build the face the card's slot registration injects. */
  inject(): PluginCenterCardFace {
    return {
      hooks: { card: this.store },
      toggle: (enabled) => { void this.toggle(enabled) },
    }
  }

  private projection(): PluginCenterCardState {
    const snapshot = this.scope.getSnapshot()
    return {
      available: snapshot.status === 'ready',
      enabled: snapshot.value?.enabled ?? false,
      saving: this.saving,
    }
  }

  private async toggle(enabled: boolean): Promise<void> {
    if (this.saving) return
    this.saving = true
    this.store.set(this.projection())
    try {
      await this.scope.set('enabled', enabled)
    } finally {
      this.saving = false
      this.store.set(this.projection())
    }
  }
}
