/**
 * Pure merge of the registry catalog with the profile's installed state into
 * the snapshot a browser renders. No filesystem or network: the gateway
 * supplies installed-versions and plugin state, so the projection (and the
 * popularity/status decisions) is unit-testable.
 */

import type { ProfilePluginState } from './profile-state.ts'
import type {
  PluginCenterEntry, PluginCenterSnapshot, PluginInstallState, PluginRegistryEntry,
} from './types.ts'

/**
 * Compare two dotted version strings by their leading numeric `x.y.z` triple.
 * A missing or non-numeric segment sorts as 0; a trailing prerelease/build
 * suffix is ignored. Returns negative/zero/positive like `Array#sort`.
 * @param left - first version string.
 * @param right - second version string.
 * @returns the numeric ordering of the two versions.
 */
export function compareSemver(left: string, right: string): number {
  const leftParts = left.split('.')
  const rightParts = right.split('.')
  for (let index = 0; index < 3; index++) {
    const leftNumber = Number.parseInt(leftParts[index] ?? '', 10)
    const rightNumber = Number.parseInt(rightParts[index] ?? '', 10)
    const l = Number.isNaN(leftNumber) ? 0 : leftNumber
    const r = Number.isNaN(rightNumber) ? 0 : rightNumber
    if (l !== r) return l - r
  }
  return 0
}

/**
 * Resolve one plugin's lifecycle state from installed facts.
 * @param entry - the registry entry.
 * @param plugins - the profile's plugin state.
 * @param installedVersion - resolved installed version, or null when absent.
 * @returns the display state.
 */
export function entryState(
  entry: PluginRegistryEntry,
  plugins: ProfilePluginState,
  installedVersion: string | null,
): PluginInstallState {
  if (!plugins.installedNames.has(entry.packageName)) return 'not-installed'
  if (plugins.disabledNames.has(entry.packageName)) return 'disabled'
  if (installedVersion !== null && compareSemver(entry.version, installedVersion) > 0) {
    return 'update-available'
  }
  return 'enabled'
}

/**
 * Merge registry entries with the profile state into the rendered snapshot,
 * keeping the registry's popularity order.
 * @param registry - registry entries ordered by popularity.
 * @param plugins - the profile's plugin state.
 * @param installedVersions - resolved installed version per package name.
 * @returns the merged snapshot with aggregate counts.
 */
export function mergeCatalog(
  registry: readonly PluginRegistryEntry[],
  plugins: ProfilePluginState,
  installedVersions: ReadonlyMap<string, string>,
): PluginCenterSnapshot {
  const entries: PluginCenterEntry[] = registry.map((entry) => {
    const installedVersion = installedVersions.get(entry.packageName) ?? null
    return Object.freeze({
      id: entry.id,
      name: entry.name,
      packageName: entry.packageName,
      description: entry.description,
      icon: entry.icon,
      author: entry.author,
      repository: entry.repository,
      stars: entry.stars,
      version: entry.version,
      installedVersion,
      changelog: entry.changelog,
      requirements: entry.requirements,
      state: entryState(entry, plugins, installedVersion),
    })
  })
  return {
    entries: Object.freeze(entries),
    installedCount: entries.filter(entry => entry.state !== 'not-installed').length,
    totalCount: entries.length,
  }
}
