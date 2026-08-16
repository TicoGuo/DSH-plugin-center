/**
 * Plugin registry loading: fetch a JSON catalog from a configurable URL,
 * validate each entry at the network boundary, and order the result by GitHub
 * popularity. A bundled default catalog keeps the Plugin Center usable before
 * a deployment publishes its own registry.
 */

import { githubCatalog } from './github.ts'
import type { PluginRegistryEntry } from './types.ts'

/** String fields every registry entry must carry. */
const REQUIRED_STRINGS = [
  'id', 'name', 'packageName', 'description', 'icon', 'author', 'repository',
  'version', 'changelog', 'spec',
] as const

/**
 * Validate and project one catalog row. Unknown fields are dropped, required
 * fields are checked for type, and numeric/optional fields are coerced with
 * their defaults so a malformed remote row fails loud rather than leaking a
 * half-typed entry into the merged catalog.
 * @param value - one JSON value from the registry `plugins` array.
 * @param index - position in the array, for the error message.
 * @returns the validated, frozen registry entry.
 */
export function parseRegistryEntry(value: unknown, index: number): PluginRegistryEntry {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`plugin-center: registry entry ${index} must be a JSON object`)
  }
  const record = value as Record<string, unknown>
  for (const key of REQUIRED_STRINGS) {
    if (typeof record[key] !== 'string' || record[key].trim() === '') {
      throw new TypeError(`plugin-center: registry entry ${index} field "${key}" must be a non-empty string`)
    }
  }
  if (typeof record.stars !== 'number' || !Number.isFinite(record.stars) || record.stars < 0) {
    throw new TypeError(`plugin-center: registry entry ${index} field "stars" must be a non-negative number`)
  }
  const requirementsValue = record.requirements
  if (requirementsValue !== undefined
    && (!Array.isArray(requirementsValue)
      || requirementsValue.some(item => typeof item !== 'string'))) {
    throw new TypeError(`plugin-center: registry entry ${index} field "requirements" must be a string array`)
  }
  const requirements: readonly string[] = Array.isArray(requirementsValue)
    ? (requirementsValue as string[])
    : []
  const download = typeof record.download === 'string' && record.download !== ''
    ? record.download
    : undefined
  const sha256 = typeof record.sha256 === 'string' && /^[0-9a-f]{64}$/.test(record.sha256)
    ? record.sha256
    : undefined
  return Object.freeze({
    id: record.id as string,
    name: record.name as string,
    packageName: record.packageName as string,
    description: record.description as string,
    icon: record.icon as string,
    author: record.author as string,
    repository: record.repository as string,
    stars: record.stars as number,
    version: record.version as string,
    changelog: record.changelog as string,
    requirements,
    ...(download === undefined ? {} : { download }),
    ...(sha256 === undefined ? {} : { sha256 }),
    spec: record.spec as string,
  })
}

/**
 * Parse a registry document into validated entries.
 * @param json - parsed JSON value from the registry URL.
 * @returns frozen entries in document order.
 */
export function parseRegistry(json: unknown): readonly PluginRegistryEntry[] {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw new TypeError('plugin-center: registry document must be a JSON object')
  }
  const plugins = (json as Record<string, unknown>).plugins
  if (!Array.isArray(plugins)) {
    throw new TypeError('plugin-center: registry document field "plugins" must be an array')
  }
  return Object.freeze(plugins.map((entry, index) => parseRegistryEntry(entry, index)))
}

/**
 * Order entries by popularity: GitHub stars descending, ties broken by id so
 * the sort is deterministic across fetches.
 * @param entries - validated entries in any order.
 * @returns a new array ordered by popularity.
 */
export function sortRegistry(entries: readonly PluginRegistryEntry[]): readonly PluginRegistryEntry[] {
  return Object.freeze([...entries].sort((left, right) =>
    right.stars - left.stars || left.id.localeCompare(right.id)))
}

/**
 * Load the catalog live from GitHub and order it by popularity. A search
 * failure returns an explicit error string (never a hardcoded fallback list);
 * an empty result is a genuine "no public DSH plugins found" state.
 * @param githubQuery - GitHub search query.
 * @param fetchFn - injectable fetch (Node's global fetch in production).
 * @returns entries ordered by popularity plus an optional load error.
 */
export async function loadRegistry(
  githubQuery: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ entries: readonly PluginRegistryEntry[]; error: string | null }> {
  try {
    return { entries: sortRegistry(await githubCatalog(githubQuery, fetchFn)), error: null }
  } catch (error) {
    return {
      entries: Object.freeze([]),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
