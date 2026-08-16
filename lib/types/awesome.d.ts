/**
 * Curated plugin catalog source: the awesome-dsh-plugin list
 * (https://awesome-dsh-plugin.com), sourced from its README markdown. Each
 * entry is a `- [owner/repo](github-url) - description` bullet; the git spec
 * `github:owner/repo` is the install target and the resolved npm name is
 * discovered after install.
 */
import type { PluginRegistryEntry } from './types.ts';
/** Default catalog: the Chinese README of the awesome-dsh-plugin list. */
export declare const AWESOME_CATALOG_URL = "https://raw.githubusercontent.com/awesome-dsh-plugin/awesome-dsh-plugin/main/README.zh.md";
/**
 * Parse the awesome-dsh-plugin README markdown into catalog entries in document
 * order (the curated order).
 * @param markdown - the README text.
 * @returns frozen entries for every bullet that names a GitHub repository.
 */
export declare function parseAwesomeReadme(markdown: string): readonly PluginRegistryEntry[];
/**
 * Fetch and parse the curated catalog. A non-2xx response throws so the caller
 * can surface a load error rather than an empty list.
 * @param url - catalog README URL.
 * @param fetchFn - injectable fetch.
 * @returns frozen entries in curated order.
 */
export declare function awesomeCatalog(url: string, fetchFn: typeof fetch): Promise<readonly PluginRegistryEntry[]>;
//# sourceMappingURL=awesome.d.ts.map