/**
 * Real-time GitHub catalog source: search public repositories for DeepSeek
 * Harness plugins, then read each candidate's package.json to confirm it
 * declares a `dsh` manifest and project it into a registry entry. Repositories
 * arrive GitHub-star-sorted and stay in that order.
 */
import type { PluginRegistryEntry } from './types.ts';
/** GitHub REST API base. */
export declare const GITHUB_API_BASE = "https://api.github.com";
/** Raw file base for fetching repository package.json. */
export declare const RAW_GITHUB_BASE = "https://raw.githubusercontent.com";
/** The default search query: plugin repos by the `dsh-plugin` topic or name, plus anything mentioning deepseek-harness. */
export declare const DEFAULT_GITHUB_QUERY = "topic:dsh-plugin OR dsh-plugin in:name,description OR deepseek-harness in:name,description,readme";
/** One repository row projected from a GitHub search response. */
export interface GithubRepoSummary {
    /** `owner/repo` full name. */
    readonly fullName: string;
    readonly description: string | null;
    readonly stars: number;
    readonly htmlUrl: string;
    readonly defaultBranch: string;
}
/**
 * Project and validate a GitHub search response into repository summaries.
 * @param json - parsed JSON from `GET /search/repositories`.
 * @returns validated repository rows in the API's (star-sorted) order.
 */
export declare function parseGithubSearchResponse(json: unknown): readonly GithubRepoSummary[];
/**
 * Project one repository's package.json into a registry entry. Returns null
 * when the package is not a DSH plugin (no `dsh` manifest section), so a
 * search match that is not actually a plugin is silently skipped.
 * @param owner - repository owner login.
 * @param repo - repository name.
 * @param stars - GitHub star count (popularity).
 * @param json - parsed package.json.
 * @returns a frozen registry entry, or null.
 */
export declare function parseGithubPluginManifest(owner: string, repo: string, stars: number, json: unknown): PluginRegistryEntry | null;
/**
 * Search GitHub for DSH plugins and read each candidate's manifest, returning
 * only confirmed plugins in GitHub star order. A failed or unreadable
 * repository manifest skips that repository; only a failed search request
 * throws (so a rate limit or outage degrades to the bundled catalog).
 * @param query - GitHub search query.
 * @param fetchFn - injectable fetch.
 * @returns confirmed plugin entries in star order.
 */
export declare function githubCatalog(query: string, fetchFn: typeof fetch): Promise<readonly PluginRegistryEntry[]>;
//# sourceMappingURL=github.d.ts.map