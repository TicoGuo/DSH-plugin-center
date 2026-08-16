/** The Plugin Center settings card: an enable toggle backed by the host's `/plugin-center/status` + `/set-enabled` routes. */

import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

/** What the card renders. */
export interface PluginCenterCardState {
  /** False until the feature status resolves; the card renders nothing. */
  available: boolean
  /** The current on/off value (defaults to off). */
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

/** Bridges the host feature toggle onto the enable card (no settings namespace). */
export class PluginCenterCardController {
  private readonly store: SnapshotStore<PluginCenterCardState>
  private saving = false

  /** @param status - fetch the current feature-enabled flag. */
  constructor(
    private readonly status: () => Promise<{ enabled: boolean }>,
    private readonly setEnabled: (enabled: boolean) => Promise<{ enabled: boolean }>,
    private readonly onChanged: () => void,
  ) {
    this.store = createSnapshotStore({ available: false, enabled: false, saving: false })
    void this.load()
  }

  /** Build the face the card's slot registration injects. */
  inject(): PluginCenterCardFace {
    return {
      hooks: { card: this.store },
      toggle: (enabled) => { void this.toggle(enabled) },
    }
  }

  private async load(): Promise<void> {
    try {
      const snapshot = await this.status()
      this.store.set({ available: true, enabled: snapshot.enabled, saving: this.saving })
    } catch {
      this.store.set({ available: false, enabled: false, saving: this.saving })
    }
  }

  private async toggle(enabled: boolean): Promise<void> {
    if (this.saving) return
    this.saving = true
    this.store.set({ available: true, enabled, saving: true })
    try {
      await this.setEnabled(enabled)
      this.onChanged()
    } finally {
      this.saving = false
      await this.load()
    }
  }
}
