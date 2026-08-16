/**
 * Curated plugin catalog source: the awesome-dsh-plugin.com website
 * (https://awesome-dsh-plugin.com/zh/). Each plugin is an `<li class="card">`
 * carrying its owner/repo slug, GitHub star count, description, and the exact
 * `dsh plugin add <spec>` install command. The cards are already ordered by
 * stars, so the parsed order is the popularity order.
 */
import type { PluginRegistryEntry } from './types.ts';
/** Default catalog: the Chinese page of the awesome-dsh-plugin list. */
export declare const AWESOME_CATALOG_URL = "https://awesome-dsh-plugin.com/zh/";
/**
 * Parse the awesome-dsh-plugin.com HTML into catalog entries in star order.
 * @param html - the rendered page HTML.
 * @returns frozen entries for every parsed plugin card.
 */
export declare function parseAwesomeHtml(html: string): readonly PluginRegistryEntry[];
/**
 * Fetch and parse the curated catalog. A non-2xx response throws so the caller
 * can surface a load error rather than an empty list.
 * @param url - catalog page URL.
 * @param fetchFn - injectable fetch.
 * @returns frozen entries in star order.
 */
export declare function awesomeCatalog(url: string, fetchFn: typeof fetch): Promise<readonly PluginRegistryEntry[]>;
//# sourceMappingURL=awesome.d.ts.map