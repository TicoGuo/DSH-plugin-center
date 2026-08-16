/**
 * Plugin catalog loading. The default source is the curated awesome-dsh-plugin
 * list (parsed from its README); the older curated-JSON helpers are retained
 * for deployments that publish a manifest document with per-plugin `download` +
 * `sha256` integrity metadata.
 */
import type { PluginRegistryEntry } from './types.ts';
/**
 * Validate and project one curated-JSON catalog row. Unknown fields are
 * dropped and required fields are type-checked so a malformed remote row fails
 * loud rather than leaking a half-typed entry into the merged catalog.
 * @param value - one JSON value from the registry `plugins` array.
 * @param index - position in the array, for the error message.
 * @returns the validated, frozen registry entry.
 */
export declare function parseRegistryEntry(value: unknown, index: number): PluginRegistryEntry;
/**
 * Parse a curated-JSON registry document into validated entries.
 * @param json - parsed JSON value from the registry URL.
 * @returns frozen entries in document order.
 */
export declare function parseRegistry(json: unknown): readonly PluginRegistryEntry[];
/**
 * Order curated-JSON entries by popularity: stars descending, ties broken by id.
 * @param entries - validated entries in any order.
 * @returns a new array ordered by popularity.
 */
export declare function sortRegistry(entries: readonly PluginRegistryEntry[]): readonly PluginRegistryEntry[];
/**
 * Load the catalog from the curated awesome-dsh-plugin list. A fetch failure
 * returns an explicit error string (never a hardcoded fallback list).
 * @param catalogUrl - the catalog README URL.
 * @param fetchFn - injectable fetch (Node's global fetch in production).
 * @returns entries in curated order plus an optional load error.
 */
export declare function loadRegistry(catalogUrl: string, fetchFn?: typeof fetch): Promise<{
    entries: readonly PluginRegistryEntry[];
    error: string | null;
}>;
//# sourceMappingURL=registry.d.ts.map