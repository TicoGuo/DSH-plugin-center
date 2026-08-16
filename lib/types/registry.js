/**
 * Plugin catalog loading. The default source is the curated awesome-dsh-plugin
 * list (parsed from its README); the older curated-JSON helpers are retained
 * for deployments that publish a manifest document with per-plugin `download` +
 * `sha256` integrity metadata.
 */
import { awesomeCatalog } from "./awesome.js";
/** String fields every curated-JSON registry entry must carry. */
const REQUIRED_STRINGS = [
    'id', 'name', 'packageName', 'description', 'icon', 'author', 'repository',
    'version', 'changelog', 'spec',
];
/**
 * Validate and project one curated-JSON catalog row. Unknown fields are
 * dropped and required fields are type-checked so a malformed remote row fails
 * loud rather than leaking a half-typed entry into the merged catalog.
 * @param value - one JSON value from the registry `plugins` array.
 * @param index - position in the array, for the error message.
 * @returns the validated, frozen registry entry.
 */
export function parseRegistryEntry(value, index) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`plugin-center: registry entry ${index} must be a JSON object`);
    }
    const record = value;
    for (const key of REQUIRED_STRINGS) {
        if (typeof record[key] !== 'string' || record[key].trim() === '') {
            throw new TypeError(`plugin-center: registry entry ${index} field "${key}" must be a non-empty string`);
        }
    }
    if (typeof record.stars !== 'number' || !Number.isFinite(record.stars) || record.stars < 0) {
        throw new TypeError(`plugin-center: registry entry ${index} field "stars" must be a non-negative number`);
    }
    const requirementsValue = record.requirements;
    if (requirementsValue !== undefined
        && (!Array.isArray(requirementsValue)
            || requirementsValue.some(item => typeof item !== 'string'))) {
        throw new TypeError(`plugin-center: registry entry ${index} field "requirements" must be a string array`);
    }
    const requirements = Array.isArray(requirementsValue)
        ? requirementsValue
        : [];
    const download = typeof record.download === 'string' && record.download !== ''
        ? record.download
        : undefined;
    const sha256 = typeof record.sha256 === 'string' && /^[0-9a-f]{64}$/.test(record.sha256)
        ? record.sha256
        : undefined;
    return Object.freeze({
        id: record.id,
        name: record.name,
        packageName: record.packageName,
        description: record.description,
        icon: record.icon,
        author: record.author,
        repository: record.repository,
        stars: record.stars,
        version: record.version,
        changelog: record.changelog,
        requirements,
        ...(download === undefined ? {} : { download }),
        ...(sha256 === undefined ? {} : { sha256 }),
        spec: record.spec,
    });
}
/**
 * Parse a curated-JSON registry document into validated entries.
 * @param json - parsed JSON value from the registry URL.
 * @returns frozen entries in document order.
 */
export function parseRegistry(json) {
    if (json === null || typeof json !== 'object' || Array.isArray(json)) {
        throw new TypeError('plugin-center: registry document must be a JSON object');
    }
    const plugins = json.plugins;
    if (!Array.isArray(plugins)) {
        throw new TypeError('plugin-center: registry document field "plugins" must be an array');
    }
    return Object.freeze(plugins.map((entry, index) => parseRegistryEntry(entry, index)));
}
/**
 * Order curated-JSON entries by popularity: stars descending, ties broken by id.
 * @param entries - validated entries in any order.
 * @returns a new array ordered by popularity.
 */
export function sortRegistry(entries) {
    return Object.freeze([...entries].sort((left, right) => right.stars - left.stars || left.id.localeCompare(right.id)));
}
/**
 * Load the catalog from the curated awesome-dsh-plugin list. A fetch failure
 * returns an explicit error string (never a hardcoded fallback list).
 * @param catalogUrl - the catalog README URL.
 * @param fetchFn - injectable fetch (Node's global fetch in production).
 * @returns entries in curated order plus an optional load error.
 */
export async function loadRegistry(catalogUrl, fetchFn = fetch) {
    try {
        return { entries: await awesomeCatalog(catalogUrl, fetchFn), error: null };
    }
    catch (error) {
        return {
            entries: Object.freeze([]),
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
//# sourceMappingURL=registry.js.map