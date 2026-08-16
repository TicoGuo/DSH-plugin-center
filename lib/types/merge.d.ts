/**
 * Pure merge of the registry catalog with the profile's installed state into
 * the snapshot a browser renders. No filesystem or network: the gateway
 * supplies installed-versions and plugin state, so the projection (and the
 * popularity/status decisions) is unit-testable.
 */
import type { ProfilePluginState } from './profile-state.ts';
import type { PluginCenterSnapshot, PluginInstallState, PluginRegistryEntry } from './types.ts';
/**
 * Compare two dotted version strings by their leading numeric `x.y.z` triple.
 * A missing or non-numeric segment sorts as 0; a trailing prerelease/build
 * suffix is ignored. Returns negative/zero/positive like `Array#sort`.
 * @param left - first version string.
 * @param right - second version string.
 * @returns the numeric ordering of the two versions.
 */
export declare function compareSemver(left: string, right: string): number;
/**
 * Resolve one plugin's lifecycle state from installed facts.
 * @param entry - the registry entry.
 * @param plugins - the profile's plugin state.
 * @param installedVersion - resolved installed version, or null when absent.
 * @returns the display state.
 */
export declare function entryState(entry: PluginRegistryEntry, plugins: ProfilePluginState, installedVersion: string | null): PluginInstallState;
/**
 * Merge registry entries with the profile state into the rendered snapshot,
 * keeping the registry's popularity order.
 * @param registry - registry entries ordered by popularity.
 * @param plugins - the profile's plugin state.
 * @param installedVersions - resolved installed version per package name.
 * @returns the merged snapshot with aggregate counts.
 */
export declare function mergeCatalog(registry: readonly PluginRegistryEntry[], plugins: ProfilePluginState, installedVersions: ReadonlyMap<string, string>): PluginCenterSnapshot;
//# sourceMappingURL=merge.d.ts.map