/**
 * Real-time GitHub catalog source: search public repositories for DeepSeek
 * Harness plugins, then read each candidate's package.json to confirm it
 * declares a `dsh` manifest and project it into a registry entry. Repositories
 * arrive GitHub-star-sorted and stay in that order.
 */

import type { PluginRegistryEntry } from './types.ts'

/** GitHub REST API base. */
export const GITHUB_API_BASE = 'https://api.github.com'
/** Raw file base for fetching repository package.json. */
export const RAW_GITHUB_BASE = 'https://raw.githubusercontent.com'

const GITHUB_ACCEPT = 'application/vnd.github+json'
const USER_AGENT = 'deepseek-harness'

/** Per-request timeout so a stalled GitHub call degrades to an error instead of a long spinner. */
const GITHUB_TIMEOUT_MS = 10_000

/** The default search query: plugin repos by the `dsh-plugin` topic or name, plus anything mentioning deepseek-harness. */
export const DEFAULT_GITHUB_QUERY =
  'topic:dsh-plugin OR dsh-plugin in:name,description OR deepseek-harness in:name,description,readme'

/** One repository row projected from a GitHub search response. */
export interface GithubRepoSummary {
  /** `owner/repo` full name. */
  readonly fullName: string
  readonly description: string | null
  readonly stars: number
  readonly htmlUrl: string
  readonly defaultBranch: string
}

/** Required headers GitHub's REST API expects. */
const GITHUB_HEADERS = {
  Accept: GITHUB_ACCEPT,
  'User-Agent': USER_AGENT,
} as const

/**
 * Project and validate a GitHub search response into repository summaries.
 * @param json - parsed JSON from `GET /search/repositories`.
 * @returns validated repository rows in the API's (star-sorted) order.
 */
export function parseGithubSearchResponse(json: unknown): readonly GithubRepoSummary[] {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw new TypeError('plugin-center: GitHub search response must be a JSON object')
  }
  const items = (json as Record<string, unknown>).items
  if (!Array.isArray(items)) {
    throw new TypeError('plugin-center: GitHub search response field "items" must be an array')
  }
  const summaries: GithubRepoSummary[] = []
  for (const item of items) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue
    const record = item as Record<string, unknown>
    const fullName = record.full_name
    const stars = record.stargazers_count
    const htmlUrl = record.html_url
    const defaultBranch = record.default_branch
    if (typeof fullName !== 'string' || fullName === '') continue
    if (typeof stars !== 'number' || typeof htmlUrl !== 'string') continue
    summaries.push({
      fullName,
      description: typeof record.description === 'string' ? record.description : null,
      stars,
      htmlUrl,
      defaultBranch: typeof defaultBranch === 'string' && defaultBranch !== '' ? defaultBranch : 'main',
    })
  }
  return Object.freeze(summaries)
}

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
export function parseGithubPluginManifest(
  owner: string, repo: string, stars: number, json: unknown,
): PluginRegistryEntry | null {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) return null
  const record = json as Record<string, unknown>
  const dsh = record.dsh
  if (dsh === null || typeof dsh !== 'object' || Array.isArray(dsh)) return null
  const name = typeof record.name === 'string' && record.name !== '' ? record.name : repo
  const description = typeof record.description === 'string' && record.description !== ''
    ? record.description
    : `DSH plugin ${repo}`
  const version = typeof record.version === 'string' && record.version !== '' ? record.version : '0.0.0'
  const peerDependencies = record.peerDependencies
  const requirements: readonly string[] = peerDependencies !== null
    && typeof peerDependencies === 'object' && !Array.isArray(peerDependencies)
    ? Object.keys(peerDependencies as Record<string, unknown>)
    : []
  return Object.freeze({
    id: name,
    name: repo,
    packageName: name,
    description,
    icon: '📦',
    author: owner,
    repository: `https://github.com/${owner}/${repo}`,
    stars,
    version,
    changelog: '',
    requirements,
    spec: `github:${owner}/${repo}`,
  })
}

/**
 * Search GitHub for DSH plugins and read each candidate's manifest, returning
 * only confirmed plugins in GitHub star order. A failed or unreadable
 * repository manifest skips that repository; only a failed search request
 * throws (so a rate limit or outage degrades to the bundled catalog).
 * @param query - GitHub search query.
 * @param fetchFn - injectable fetch.
 * @returns confirmed plugin entries in star order.
 */
export async function githubCatalog(
  query: string,
  fetchFn: typeof fetch,
): Promise<readonly PluginRegistryEntry[]> {
  const searchUrl = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=50`
  const searchResponse = await fetchFn(searchUrl, {
    headers: GITHUB_HEADERS,
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  })
  if (!searchResponse.ok) {
    throw new Error(`GitHub search failed with HTTP ${searchResponse.status}`)
  }
  const repos = parseGithubSearchResponse(await searchResponse.json())
  // Fetch candidate manifests in parallel so the list stays well under the
  // 2-second budget for the bounded search page (≤ 50 repositories).
  const resolved = await Promise.all(repos.map(async (repo) => {
    const [owner, name] = repo.fullName.split('/')
    if (owner === undefined || name === undefined) return null
    const rawUrl = `${RAW_GITHUB_BASE}/${owner}/${name}/${repo.defaultBranch}/package.json`
    try {
      const manifestResponse = await fetchFn(rawUrl, {
        headers: GITHUB_HEADERS,
        signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
      })
      if (!manifestResponse.ok) return null
      return parseGithubPluginManifest(owner, name, repo.stars, await manifestResponse.json())
    } catch {
      // One unreadable repository must not abort the whole catalog.
      return null
    }
  }))
  const entries = resolved.filter((entry): entry is PluginRegistryEntry => entry !== null)
  return Object.freeze(entries)
}
