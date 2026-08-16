/**
 * Curated plugin catalog source: the awesome-dsh-plugin list
 * (https://awesome-dsh-plugin.com), sourced from its README markdown. Each
 * entry is a `- [owner/repo](github-url) - description` bullet; the git spec
 * `github:owner/repo` is the install target and the resolved npm name is
 * discovered after install.
 */

import type { PluginRegistryEntry } from './types.ts'

/** Default catalog: the Chinese README of the awesome-dsh-plugin list. */
export const AWESOME_CATALOG_URL =
  'https://raw.githubusercontent.com/awesome-dsh-plugin/awesome-dsh-plugin/main/README.zh.md'

/** Per-request timeout so a stalled fetch degrades to an error instead of a long spinner. */
const CATALOG_TIMEOUT_MS = 15_000

/** One bullet: `- [owner/repo](url) - description`. */
const BULLET_PATTERN = /^-\s+\[([^\]]+)\]\(([^)]+)\)\s*-\s*(.+)$/

/**
 * Parse the awesome-dsh-plugin README markdown into catalog entries in document
 * order (the curated order).
 * @param markdown - the README text.
 * @returns frozen entries for every bullet that names a GitHub repository.
 */
export function parseAwesomeReadme(markdown: string): readonly PluginRegistryEntry[] {
  const entries: PluginRegistryEntry[] = []
  for (const line of markdown.split('\n')) {
    const match = BULLET_PATTERN.exec(line)
    if (match === null) continue
    const fullName = (match[1] ?? '').trim()
    const url = (match[2] ?? '').trim()
    const description = (match[3] ?? '').trim()
    const [owner, repo] = fullName.split('/')
    if (owner === undefined || owner === '' || repo === undefined || repo === '') continue
    if (!url.startsWith('https://github.com/')) continue
    entries.push(Object.freeze({
      id: fullName,
      name: repo,
      packageName: repo,
      description,
      icon: '🧩',
      author: owner,
      repository: url,
      stars: 0,
      version: '',
      changelog: '',
      requirements: Object.freeze([]),
      spec: `github:${fullName}`,
    }))
  }
  return Object.freeze(entries)
}

/**
 * Fetch and parse the curated catalog. A non-2xx response throws so the caller
 * can surface a load error rather than an empty list.
 * @param url - catalog README URL.
 * @param fetchFn - injectable fetch.
 * @returns frozen entries in curated order.
 */
export async function awesomeCatalog(
  url: string,
  fetchFn: typeof fetch,
): Promise<readonly PluginRegistryEntry[]> {
  const response = await fetchFn(url, { signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS) })
  if (!response.ok) {
    throw new Error(`awesome-dsh-plugin fetch failed with HTTP ${response.status}`)
  }
  return parseAwesomeReadme(await response.text())
}
