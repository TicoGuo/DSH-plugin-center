/** Pure Plugin Center projections: the toolbar filter, unit-tested without React. */
/** The filter options in toolbar order. */
export const PLUGIN_CENTER_FILTERS = [
    'all', 'installed', 'updatable', 'disabled',
];
/**
 * Filter entries by the active toolbar filter and a name/description query.
 * @param entries - the merged catalog rows.
 * @param query - raw search text.
 * @param filter - the active filter id.
 * @returns matching rows in catalog order.
 */
export function filterPluginEntries(entries, query, filter) {
    const normalized = query.trim().toLocaleLowerCase();
    return entries.filter((entry) => {
        if (filter === 'installed' && entry.state === 'not-installed')
            return false;
        if (filter === 'updatable' && entry.state !== 'update-available')
            return false;
        if (filter === 'disabled' && entry.state !== 'disabled')
            return false;
        if (normalized === '')
            return true;
        return entry.name.toLocaleLowerCase().includes(normalized)
            || entry.description.toLocaleLowerCase().includes(normalized)
            || entry.packageName.toLocaleLowerCase().includes(normalized);
    });
}
//# sourceMappingURL=plugin-center-store.js.map