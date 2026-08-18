/**
 * Curated plugin catalog source: the awesome-dsh-plugin.com website
 * (https://awesome-dsh-plugin.com/zh/). Each plugin is an `<li class="card">`
 * carrying its owner/repo slug, GitHub star count, description, and the exact
 * `dsh plugin add <spec>` install command. The cards are already ordered by
 * stars, so the parsed order is the popularity order.
 */
/** Default catalog: the Chinese page of the awesome-dsh-plugin list. */
export const AWESOME_CATALOG_URL = 'https://awesome-dsh-plugin.com/zh/';
/** Per-request timeout so a stalled fetch degrades to an error instead of a long spinner. */
const CATALOG_TIMEOUT_MS = 25_000;
/** One plugin card in the rendered page. */
const CARD_PATTERN = /<li class="card"[^>]*>([\s\S]*?)<\/li>/g;
/** Owner login, e.g. the `vectorize-io/` inside the h3 link. */
const OWNER_PATTERN = /class="owner"[^>]*>([^<]+)<\/span>/;
/** Repo slug (with any `#subpath`) that follows the owner span. */
const REPO_PATTERN = /class="owner"[^>]*>[^<]+<\/span>([^<]+)<\/a>/;
/** GitHub star count. */
const STARS_PATTERN = /class="stars"[^>]*>([^<]+)</;
/** Short description (the first `<p>` in the card). */
const DESC_PATTERN = /<p>([^<]*)<\/p>/;
/** The exact CLI install command: `dsh plugin --profile web add <spec>`. */
const SPEC_PATTERN = /input[^>]*value="dsh plugin --profile web add ([^"]+)"/;
/**
 * Parse the awesome-dsh-plugin.com HTML into catalog entries in star order.
 * @param html - the rendered page HTML.
 * @returns frozen entries for every parsed plugin card.
 */
export function parseAwesomeHtml(html) {
    const raw = [];
    let match;
    while ((match = CARD_PATTERN.exec(html)) !== null) {
        const card = match[1] ?? '';
        const ownerMatch = OWNER_PATTERN.exec(card);
        const repoMatch = REPO_PATTERN.exec(card);
        const starsMatch = STARS_PATTERN.exec(card);
        const descMatch = DESC_PATTERN.exec(card);
        const specMatch = SPEC_PATTERN.exec(card);
        if (ownerMatch === null || repoMatch === null || specMatch === null)
            continue;
        const owner = (ownerMatch[1] ?? '').replace(/\/$/, '');
        const fullRepo = (repoMatch[1] ?? '').trim();
        const repo = fullRepo.split('#')[0] ?? '';
        const spec = (specMatch[1] ?? '').trim();
        if (owner === '' || repo === '' || spec === '')
            continue;
        const stars = starsMatch !== null ? Number.parseInt(starsMatch[1] ?? '', 10) : 0;
        const description = descMatch !== null ? (descMatch[1] ?? '').trim() : '';
        raw.push({
            id: `${owner}/${fullRepo}`,
            name: fullRepo,
            packageName: spec,
            description,
            icon: '🧩',
            author: owner,
            repository: `https://github.com/${owner}/${repo}`,
            stars: Number.isFinite(stars) ? stars : 0,
            version: '',
            changelog: '',
            requirements: Object.freeze([]),
            spec,
        });
    }
    // Two cards can share one repo slug while installing different subpackages
    // (the install spec carries the `#path:/packages/<name>` subpath, e.g. two
    // `dsh-vscode-review` rows). Give every colliding id a spec-derived suffix
    // so the React list and the remembered id→package map keep them distinct.
    const counts = new Map();
    for (const entry of raw)
        counts.set(entry.id, (counts.get(entry.id) ?? 0) + 1);
    return Object.freeze(raw.map((entry) => {
        if ((counts.get(entry.id) ?? 0) === 1)
            return Object.freeze(entry);
        const subpath = entry.spec.includes('#') ? entry.spec.slice(entry.spec.indexOf('#')) : '';
        return Object.freeze({ ...entry, id: `${entry.id}${subpath}` });
    }));
}
/**
 * Fetch and parse the curated catalog. A non-2xx response throws so the caller
 * can surface a load error rather than an empty list.
 * @param url - catalog page URL.
 * @param fetchFn - injectable fetch.
 * @returns frozen entries in star order.
 */
export async function awesomeCatalog(url, fetchFn) {
    const response = await fetchFn(url, { signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS) });
    if (!response.ok) {
        throw new Error(`awesome-dsh-plugin fetch failed with HTTP ${response.status}`);
    }
    return parseAwesomeHtml(await response.text());
}
//# sourceMappingURL=awesome.js.map