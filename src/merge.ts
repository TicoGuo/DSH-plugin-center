/**
 * Pure merge of the catalog with the profile's installed state into the
 * snapshot a browser renders. No filesystem or network: the gateway supplies
 * plugin state and resolved installed versions, so the projection is
 * unit-testable.
 */

import type { ProfilePluginState } from './profile-state.ts'
import type {
  PluginCenterEntry, PluginCenterSnapshot, PluginInstallState, PluginRegistryEntry,
} from './types.ts'

/** Empty version map shared by callers that resolved no latest versions. */
const EMPTY_VERSIONS: ReadonlyMap<string, string> = new Map()

/**
 * Compare two dotted version strings by their leading numeric `x.y.z` triple.
 * A missing or non-numeric segment sorts as 0; build metadata after `+` is
 * ignored; a prerelease tag (`-beta.1`) sorts before its release. Returns
 * negative/zero/positive like `Array#sort`.
 * @param left - first version string.
 * @param right - second version string.
 * @returns the numeric ordering of the two versions.
 */
export function compareSemver(left: string, right: string): number {
  const leftMain = (left.split('+', 1)[0] ?? left).trim()
  const rightMain = (right.split('+', 1)[0] ?? right).trim()
  const leftCore = leftMain.split('-', 1)[0] ?? leftMain
  const rightCore = rightMain.split('-', 1)[0] ?? rightMain
  const leftPre = leftMain !== leftCore
  const rightPre = rightMain !== rightCore
  const leftParts = leftCore.split('.')
  const rightParts = rightCore.split('.')
  for (let index = 0; index < 3; index++) {
    const leftNumber = Number.parseInt(leftParts[index] ?? '', 10)
    const rightNumber = Number.parseInt(rightParts[index] ?? '', 10)
    const l = Number.isNaN(leftNumber) ? 0 : leftNumber
    const r = Number.isNaN(rightNumber) ? 0 : rightNumber
    if (l !== r) return l - r
  }
  if (leftPre !== rightPre) return leftPre ? -1 : 1
  return 0
}

/**
 * Resolve the resolved npm package name for a catalog entry, if the Plugin
 * Center installed it.
 * @param entry - the catalog entry.
 * @param plugins - the profile's plugin state.
 * @returns the resolved package name, or undefined when not installed by this plugin.
 */
export function installedPackageName(entry: PluginRegistryEntry, plugins: ProfilePluginState): string | undefined {
  return plugins.packages.get(entry.id)
}

/**
 * Resolve one plugin's lifecycle state from installed facts.
 * @param entry - the registry entry.
 * @param plugins - the profile's plugin state.
 * @param installedVersion - resolved installed version, or null when absent.
 * @param availableVersion - the latest version offered for the entry (the
 * registry's own `version` when published, else the npm-registry lookup), or
 * '' when unknown.
 * @returns the display state.
 */
export function entryState(
  entry: PluginRegistryEntry,
  plugins: ProfilePluginState,
  installedVersion: string | null,
  availableVersion: string,
): PluginInstallState {
  const realName = installedPackageName(entry, plugins)
  if (realName === undefined) return 'not-installed'
  if (plugins.disabledNames.has(realName)) return 'disabled'
  if (availableVersion !== '' && installedVersion !== null && compareSemver(availableVersion, installedVersion) > 0) {
    return 'update-available'
  }
  return 'enabled'
}

/**
 * Merge catalog entries with the profile state into the rendered snapshot,
 * keeping the catalog's order.
 * @param registry - catalog entries in curated order.
 * @param plugins - the profile's plugin state.
 * @param installedVersions - resolved installed version per npm package name.
 * @param availableVersions - latest published version per installed npm package
 * name (resolved from the npm registry); used when the catalog publishes no
 * version of its own.
 * @returns the merged snapshot with aggregate counts.
 */
export function mergeCatalog(
  registry: readonly PluginRegistryEntry[],
  plugins: ProfilePluginState,
  installedVersions: ReadonlyMap<string, string>,
  availableVersions: ReadonlyMap<string, string> = EMPTY_VERSIONS,
): PluginCenterSnapshot {
  const entries: PluginCenterEntry[] = registry.map((entry) => {
    const realName = installedPackageName(entry, plugins)
    const installedVersion = realName === undefined ? null : (installedVersions.get(realName) ?? null)
    const available = entry.version !== ''
      ? entry.version
      : (realName !== undefined ? (availableVersions.get(realName) ?? '') : '')
    return Object.freeze({
      id: entry.id,
      name: entry.name,
      packageName: realName ?? entry.packageName,
      description: entry.description,
      icon: entry.icon,
      author: entry.author,
      repository: entry.repository,
      stars: entry.stars,
      version: available,
      installedVersion,
      changelog: entry.changelog,
      requirements: entry.requirements,
      state: entryState(entry, plugins, installedVersion, available),
    })
  })
  return {
    entries: Object.freeze(entries),
    // Count matches the Installed toolbar tab scope (enabled + update-available);
    // disabled plugins have their own tab and would otherwise double-count.
    installedCount: entries.filter(entry => entry.state === 'enabled' || entry.state === 'update-available').length,
    totalCount: entries.length,
  }
}
