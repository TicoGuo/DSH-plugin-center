/** Pure Plugin Center projections: the toolbar filter, unit-tested without React. */
import type { PluginCenterEntry } from '@ticoguo/dsh-plugin-center/types';
/** Toolbar filter selection. */
export type PluginCenterFilter = 'all' | 'installed' | 'updatable' | 'disabled';
/** The filter options in toolbar order. */
export declare const PLUGIN_CENTER_FILTERS: readonly PluginCenterFilter[];
/**
 * Filter entries by the active toolbar filter and a name/description query.
 * @param entries - the merged catalog rows.
 * @param query - raw search text.
 * @param filter - the active filter id.
 * @returns matching rows in catalog order.
 */
export declare function filterPluginEntries(entries: readonly PluginCenterEntry[], query: string, filter: PluginCenterFilter): readonly PluginCenterEntry[];
//# sourceMappingURL=plugin-center-store.d.ts.map