/**
 * Pure merge of the catalog with the profile's installed state into the
 * snapshot a browser renders. No filesystem or network: the gateway supplies
 * plugin state and resolved installed versions, so the projection is
 * unit-testable.
 */
/**
 * Compare two dotted version strings by their leading numeric `x.y.z` triple.
 * A missing or non-numeric segment sorts as 0; a trailing prerelease/build
 * suffix is ignored. Returns negative/zero/positive like `Array#sort`.
 * @param left - first version string.
 * @param right - second version string.
 * @returns the numeric ordering of the two versions.
 */
export function compareSemver(left, right) {
    const leftParts = left.split('.');
    const rightParts = right.split('.');
    for (let index = 0; index < 3; index++) {
        const leftNumber = Number.parseInt(leftParts[index] ?? '', 10);
        const rightNumber = Number.parseInt(rightParts[index] ?? '', 10);
        const l = Number.isNaN(leftNumber) ? 0 : leftNumber;
        const r = Number.isNaN(rightNumber) ? 0 : rightNumber;
        if (l !== r)
            return l - r;
    }
    return 0;
}
/**
 * Resolve the resolved npm package name for a catalog entry, if the Plugin
 * Center installed it.
 * @param entry - the catalog entry.
 * @param plugins - the profile's plugin state.
 * @returns the resolved package name, or undefined when not installed by this plugin.
 */
export function installedPackageName(entry, plugins) {
    return plugins.packages.get(entry.id);
}
/**
 * Resolve one plugin's lifecycle state from installed facts.
 * @param entry - the registry entry.
 * @param plugins - the profile's plugin state.
 * @param installedVersion - resolved installed version, or null when absent.
 * @returns the display state.
 */
export function entryState(entry, plugins, installedVersion) {
    const realName = installedPackageName(entry, plugins);
    if (realName === undefined)
        return 'not-installed';
    if (plugins.disabledNames.has(realName))
        return 'disabled';
    if (entry.version !== '' && installedVersion !== null && compareSemver(entry.version, installedVersion) > 0) {
        return 'update-available';
    }
    return 'enabled';
}
/**
 * Merge catalog entries with the profile state into the rendered snapshot,
 * keeping the catalog's order.
 * @param registry - catalog entries in curated order.
 * @param plugins - the profile's plugin state.
 * @param installedVersions - resolved installed version per npm package name.
 * @returns the merged snapshot with aggregate counts.
 */
export function mergeCatalog(registry, plugins, installedVersions) {
    const entries = registry.map((entry) => {
        const realName = installedPackageName(entry, plugins);
        const installedVersion = realName === undefined ? null : (installedVersions.get(realName) ?? null);
        return Object.freeze({
            id: entry.id,
            name: entry.name,
            packageName: realName ?? entry.packageName,
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
        });
    });
    return {
        entries: Object.freeze(entries),
        installedCount: entries.filter(entry => entry.state !== 'not-installed').length,
        totalCount: entries.length,
    };
}
//# sourceMappingURL=merge.js.map