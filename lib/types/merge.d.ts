/**
 * Pure merge of the catalog with the profile's installed state into the
 * snapshot a browser renders. No filesystem or network: the gateway supplies
 * plugin state and resolved installed versions, so the projection is
 * unit-testable.
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
 * Resolve the resolved npm package name for a catalog entry, if the Plugin
 * Center installed it.
 * @param entry - the catalog entry.
 * @param plugins - the profile's plugin state.
 * @returns the resolved package name, or undefined when not installed by this plugin.
 */
export declare function installedPackageName(entry: PluginRegistryEntry, plugins: ProfilePluginState): string | undefined;
/**
 * Resolve one plugin's lifecycle state from installed facts.
 * @param entry - the registry entry.
 * @param plugins - the profile's plugin state.
 * @param installedVersion - resolved installed version, or null when absent.
 * @returns the display state.
 */
export declare function entryState(entry: PluginRegistryEntry, plugins: ProfilePluginState, installedVersion: string | null): PluginInstallState;
/**
 * Merge catalog entries with the profile state into the rendered snapshot,
 * keeping the catalog's order.
 * @param registry - catalog entries in curated order.
 * @param plugins - the profile's plugin state.
 * @param installedVersions - resolved installed version per npm package name.
 * @returns the merged snapshot with aggregate counts.
 */
export declare function mergeCatalog(registry: readonly PluginRegistryEntry[], plugins: ProfilePluginState, installedVersions: ReadonlyMap<string, string>): PluginCenterSnapshot;
//# sourceMappingURL=merge.d.ts.map