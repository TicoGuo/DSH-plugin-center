/**
 * Wire vocabulary for the Plugin Center Remote: registry catalog entries,
 * the merged catalog view a browser renders, and the mutation results every
 * operation reports back. Plugin ids are registry-owned slugs (plain strings,
 * like the `moduleName` field of the plugin-inventory projection) — they are
 * catalog labels, not security boundaries.
 */
/** One plugin's lifecycle relationship to the managed profile. */
export type PluginInstallState = 'not-installed' | 'enabled' | 'disabled' | 'update-available';
/** Immutable catalog metadata for one plugin, as published by the registry. */
export interface PluginRegistryEntry {
    /** Stable registry slug (also the pnpm package name when no distinct `packageName` is given). */
    readonly id: string;
    /** Display name shown on the card. */
    readonly name: string;
    /** npm package name used for install/uninstall/update resolution. */
    readonly packageName: string;
    /** Short description for the card list. */
    readonly description: string;
    /** Emoji or URL rendered as the card icon. */
    readonly icon: string;
    /** Plugin author or publisher handle. */
    readonly author: string;
    /** Public GitHub repository URL. */
    readonly repository: string;
    /** GitHub star count used for the popularity sort. */
    readonly stars: number;
    /** Latest published version in the registry. */
    readonly version: string;
    /** Brief change notes for the latest version. */
    readonly changelog: string;
    /** Human-readable dependency or requirement list. */
    readonly requirements: readonly string[];
    /** Optional tarball download URL; when present with `sha256` the install verifies integrity first. */
    readonly download?: string;
    /** Expected lowercase-hex SHA256 of `download`. */
    readonly sha256?: string;
    /** pnpm install specifier used when `download`/`sha256` are absent (e.g. `github:owner/repo`). */
    readonly spec: string;
}
/** One row of the merged catalog returned to the browser. */
export interface PluginCenterEntry {
    readonly id: string;
    readonly name: string;
    readonly packageName: string;
    readonly description: string;
    readonly icon: string;
    readonly author: string;
    readonly repository: string;
    readonly stars: number;
    /** Latest version available in the registry. */
    readonly version: string;
    /** Version currently installed, or null when not installed. */
    readonly installedVersion: string | null;
    readonly changelog: string;
    readonly requirements: readonly string[];
    readonly state: PluginInstallState;
}
/** Point-in-time merged catalog plus its aggregate counts. */
export interface PluginCenterSnapshot {
    /** Registry entries ordered by popularity (stars, descending). */
    readonly entries: readonly PluginCenterEntry[];
    /** Number of entries currently installed (enabled, disabled, or update-available). */
    readonly installedCount: number;
    /** Total number of registry entries. */
    readonly totalCount: number;
}
/** The mutation verbs recorded in the operation log. */
export type PluginOperation = 'install' | 'uninstall' | 'update' | 'enable' | 'disable';
/** Request payloads for the mutation Remotes. */
export interface PluginCenterIdRequest {
    readonly id: string;
}
/** Request payload for the enable/disable toggle. */
export interface PluginCenterSetEnabledRequest {
    readonly id: string;
    readonly enabled: boolean;
}
/** Flat, JSON-safe result every mutation Remote returns. */
export interface PluginOperationResult {
    /** Whether the operation committed successfully. */
    readonly ok: boolean;
    /** The verb that was attempted. */
    readonly action: PluginOperation;
    /** The npm package name the operation targeted (null when unresolved). */
    readonly packageName: string | null;
    /** The version installed or targeted by the operation (null when unknown). */
    readonly version: string | null;
    /** Whether a SHA256 check ran and matched during this operation. */
    readonly sha256Verified: boolean;
    /** Machine-readable failure code; null on success. */
    readonly code: string | null;
    /** Human-readable result for the toast/log. */
    readonly message: string;
}
/** One durable operation-log row, newest first when listed. */
export interface PluginOperationLogEntry {
    /** Epoch milliseconds when the operation committed. */
    readonly timestamp: number;
    readonly action: PluginOperation;
    readonly packageName: string;
    readonly version: string | null;
    readonly ok: boolean;
    readonly message: string;
}
/** Log-list Remote result: entries wrapped so the wire schema stays object-rooted. */
export interface PluginOperationLogResult {
    readonly entries: readonly PluginOperationLogEntry[];
}
//# sourceMappingURL=types.d.ts.map