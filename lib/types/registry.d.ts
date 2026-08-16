/**
 * Plugin registry loading: fetch a JSON catalog from a configurable URL,
 * validate each entry at the network boundary, and order the result by GitHub
 * popularity. A bundled default catalog keeps the Plugin Center usable before
 * a deployment publishes its own registry.
 */
import type { PluginRegistryEntry } from './types.ts';
/**
 * Validate and project one catalog row. Unknown fields are dropped, required
 * fields are checked for type, and numeric/optional fields are coerced with
 * their defaults so a malformed remote row fails loud rather than leaking a
 * half-typed entry into the merged catalog.
 * @param value - one JSON value from the registry `plugins` array.
 * @param index - position in the array, for the error message.
 * @returns the validated, frozen registry entry.
 */
export declare function parseRegistryEntry(value: unknown, index: number): PluginRegistryEntry;
/**
 * Parse a registry document into validated entries.
 * @param json - parsed JSON value from the registry URL.
 * @returns frozen entries in document order.
 */
export declare function parseRegistry(json: unknown): readonly PluginRegistryEntry[];
/**
 * Order entries by popularity: GitHub stars descending, ties broken by id so
 * the sort is deterministic across fetches.
 * @param entries - validated entries in any order.
 * @returns a new array ordered by popularity.
 */
export declare function sortRegistry(entries: readonly PluginRegistryEntry[]): readonly PluginRegistryEntry[];
/**
 * Load the catalog live from GitHub and order it by popularity. A search
 * failure returns an explicit error string (never a hardcoded fallback list);
 * an empty result is a genuine "no public DSH plugins found" state.
 * @param githubQuery - GitHub search query.
 * @param fetchFn - injectable fetch (Node's global fetch in production).
 * @returns entries ordered by popularity plus an optional load error.
 */
export declare function loadRegistry(githubQuery: string, fetchFn?: typeof fetch): Promise<{
    entries: readonly PluginRegistryEntry[];
    error: string | null;
}>;
//# sourceMappingURL=registry.d.ts.map