/**
 * Plugin Center host half: a `/plugin-center` HTTP route tree.
 *
 * This is a third-party-installable plugin, so it cannot depend on the
 * harness's Typert Remote assembly (which is compiled in). Instead it registers
 * a `/plugin-center` prefix route on the web server — the same transport the
 * balance-check plugin uses. The feature on/off flag lives in a profile sidecar
 * (default on) and is flipped through `/plugin-center/status` + `/set-enabled`
 * (no settings namespace, so no harness change is required).
 *
 * The catalog is the curated awesome-dsh-plugin list; install/uninstall/update
 * forward to pnpm inside the managed profile (git specs resolve to a package
 * name discovered by dependency diff and remembered in the sidecar), and every
 * mutation is appended to a JSONL operation log.
 *
 * Security posture: every state-changing route rejects cross-site requests
 * (browsers always send `Origin`, so a malicious page cannot drive installs —
 * installing a plugin runs its code with the user's privileges), and every
 * pnpm argument is validated against a character allowlist before it reaches
 * the shell on Windows (see package-manager.ts).
 * @module @ticoguo/dsh-plugin-center
 */

import { unlink, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { resolveProfileDir } from '@deepseek-ai/dsh-app-boot'
import { AWESOME_CATALOG_URL } from './awesome.ts'
import { loadRegistry } from './registry.ts'
import { mergeCatalog } from './merge.ts'
import {
  ensureProfileDir, readInstalledVersion, readProfileState, withBundleDisabled,
  withBundleEnabled, writeProfileState, type LoadedProfileState,
} from './profile-state.ts'
import { createPnpmPackageManager, type PackageManager } from './package-manager.ts'
import { appendOperationLog, readOperationLog } from './operation-log.ts'
import { sha256Hex, sha256Matches } from './sha256.ts'
import type {
  PluginCenterSnapshot, PluginOperation, PluginOperationResult, PluginRegistryEntry,
} from './types.ts'

export type * from './types.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'plugin-center'

/** Required service: the HTTP route registry. */
export const inject = ['webServer']

/** Deployment policy for the Plugin Center. Every field is optional; defaults resolve in code. */
export interface Config {
  /** The profile whose directory is the install target (default `web`). */
  profile?: string
  /** Curated catalog README URL (default the awesome-dsh-plugin list). */
  catalogUrl?: string
}

/** Resolved install input: the pnpm spec plus whether a SHA256 check ran. */
interface ResolvedInstallSpec {
  readonly spec: string
  readonly sha256Verified: boolean
  readonly tempPath: string | null
}

/** Effective profile name with the default applied. */
function effectiveProfile(config: Config): string {
  return config.profile !== undefined && config.profile.length > 0 ? config.profile : 'web'
}

function effectiveCatalogUrl(config: Config): string {
  return config.catalogUrl !== undefined && config.catalogUrl.length > 0
    ? config.catalogUrl
    : AWESOME_CATALOG_URL
}

/** Copy a disabled-name set with one name added. */
function withDisabled(disabled: ReadonlySet<string>, name: string): ReadonlySet<string> {
  const next = new Set(disabled)
  next.add(name)
  return next
}

/** Copy a disabled-name set with one name removed. */
function withoutDisabled(disabled: ReadonlySet<string>, name: string): ReadonlySet<string> {
  const next = new Set(disabled)
  next.delete(name)
  return next
}

/** Copy the id→name mapping with one entry added. */
function withPackage(packages: ReadonlyMap<string, string>, id: string, name: string): ReadonlyMap<string, string> {
  const next = new Map(packages)
  next.set(id, name)
  return next
}

/** Copy the id→name mapping with one entry removed. */
function withoutPackage(packages: ReadonlyMap<string, string>, id: string): ReadonlyMap<string, string> {
  const next = new Map(packages)
  next.delete(id)
  return next
}

/** How long a successful catalog load is served before a newer fetch is attempted. */
const CATALOG_TTL_MS = 15 * 60_000

/** npm registry endpoint used to resolve the latest published version of installed packages. */
const NPM_LATEST_URL = 'https://registry.npmjs.org/'

/** Per-package latest-version lookup timeout. */
const VERSION_TIMEOUT_MS = 8_000

/** Freshness window for the resolved latest-version cache. */
const VERSION_TTL_MS = 30 * 60_000

/** Cap on a request body so a misbehaving client cannot buffer unbounded JSON. */
const MAX_BODY_BYTES = 64 * 1024

/** Loopback host literals accepted as same-machine origins. */
const TRUSTED_ORIGIN_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/** One request whose body or route was invalid; mapped to a 4xx response instead of a 500. */
class RequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

/**
 * Whether an `Origin`/`Referer` value points at this machine (loopback, or the
 * host the browser actually navigated to — the `Host` header). Browsers set
 * `Origin` themselves and a cross-site page cannot forge it, so an origin that
 * matches neither is a cross-site request.
 * @param value - the `Origin` or `Referer` header.
 * @param host - the request's `Host` header.
 * @returns whether the value is a same-machine origin.
 */
function isTrustedOrigin(value: string, host: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:') return false
    const hostname = url.hostname.toLowerCase()
    if (TRUSTED_ORIGIN_HOSTS.has(hostname)) return true
    return url.host === host || url.hostname === host
  } catch {
    return false
  }
}

/**
 * Reject browser-originated cross-site writes. The harness's web server does
 * no origin policy, so without this a malicious page could POST a JSON body to
 * the loopback route (a `no-cors` fetch still delivers it) and trigger
 * install/uninstall of arbitrary plugins. Browsers send `Origin` on every POST;
 * a missing Origin means a non-browser client (curl, scripts), which is
 * allowed. The Referer fallback covers clients that send only it.
 * @param req - the incoming request.
 * @returns null when the request is trusted, otherwise a rejection message.
 */
function crossOriginReason(req: IncomingMessage): string | null {
  const host = typeof req.headers.host === 'string' ? req.headers.host : ''
  const origin = req.headers.origin
  if (typeof origin === 'string' && origin !== '') {
    if (isTrustedOrigin(origin, host)) return null
    return `cross-origin request rejected (origin "${origin}")`
  }
  const referer = req.headers.referer
  if (typeof referer === 'string' && referer !== '') {
    if (isTrustedOrigin(referer, host)) return null
    return `cross-origin request rejected (referer "${referer}")`
  }
  return null
}

/**
 * Mount the `/plugin-center` route tree. The on/off toggle is persisted in the
 * profile sidecar (not a settings namespace), so no harness change is required.
 * @param ctx - plugin context carrying the web server.
 * @param config - deployment policy (profile + catalog URL).
 */
export function apply(ctx: Context, config: Config = {}): void {
  const current = (): Config => config

  const packageManager: PackageManager = createPnpmPackageManager()

  // ---- Catalog cache: TTL-fresh, failure-retrying, stale-while-revalidate. ----
  let registryCache: readonly PluginRegistryEntry[] | null = null
  let registryError: string | null = null
  let registryLoad: Promise<void> | null = null
  let registryLoading = false
  let registryLoadedAt = 0

  const beginRegistryLoad = (catalogUrl: string): Promise<void> => {
    registryLoading = true
    const load = loadRegistry(catalogUrl).then((result) => {
      registryError = result.error
      if (result.error === null) {
        registryCache = result.entries
        registryLoadedAt = Date.now()
      }
      // On failure the previous successful entries (if any) are kept as a
      // stale fallback and the error is surfaced to the browser.
    }).finally(() => {
      registryLoading = false
    })
    registryLoad = load
    return load
  }

  /**
   * Ensure a catalog is available. A fresh successful load is reused for the
   * TTL window; an expired or failed load starts a new fetch — a failure is
   * never cached, so the client's Retry button genuinely retries.
   */
  const ensureCatalog = (catalogUrl: string): Promise<void> => {
    if (registryLoading) return registryLoad ?? Promise.resolve()
    const fresh = registryLoadedAt !== 0 && Date.now() - registryLoadedAt < CATALOG_TTL_MS
    if (fresh) return Promise.resolve()
    return beginRegistryLoad(catalogUrl)
  }

  /** Drop the cache and fetch from scratch (the explicit refresh route). */
  const forceCatalogRefresh = (catalogUrl: string): Promise<void> => {
    registryCache = null
    registryError = null
    registryLoadedAt = 0
    if (registryLoading) return registryLoad ?? Promise.resolve()
    return beginRegistryLoad(catalogUrl)
  }

  // ---- Latest published versions for installed packages (npm registry). ----
  const latestVersions = new Map<string, string>()
  const versionCache = new Map<string, { version: string | null; at: number }>()
  const versionLoads = new Map<string, Promise<string | null>>()

  /**
   * Resolve one installed package's latest published version, coalescing
   * concurrent lookups and caching successes for the TTL window. Failures
   * return null and are retried on the next refresh.
   * @param packageName - the installed npm package name.
   * @returns the latest version, or null when unknown.
   */
  const resolveLatestVersion = async (packageName: string): Promise<string | null> => {
    const cached = versionCache.get(packageName)
    if (cached !== undefined && Date.now() - cached.at < VERSION_TTL_MS) return cached.version
    let pending = versionLoads.get(packageName)
    if (pending === undefined) {
      pending = (async () => {
        try {
          const response = await fetch(`${NPM_LATEST_URL}${encodeURIComponent(packageName)}/latest`, {
            signal: AbortSignal.timeout(VERSION_TIMEOUT_MS),
            headers: { Accept: 'application/json' },
          })
          if (!response.ok) return null
          const body = await response.json() as { version?: unknown }
          return typeof body.version === 'string' && body.version !== '' ? body.version : null
        } catch {
          return null
        }
      })().finally(() => {
        versionLoads.delete(packageName)
      })
      versionLoads.set(packageName, pending)
    }
    const version = await pending
    if (version !== null) versionCache.set(packageName, { version, at: Date.now() })
    return version
  }

  /** Refresh the latest-version map for the installed set (fire-and-forget or awaited). */
  const refreshLatestVersions = (installedNames: readonly string[]): Promise<void> => {
    const names = [...new Set(installedNames)].sort()
    if (names.length === 0) return Promise.resolve()
    return Promise.all(names.map(name => resolveLatestVersion(name))).then((versions) => {
      names.forEach((name, index) => {
        const version = versions[index] ?? null
        if (version !== null) latestVersions.set(name, version)
      })
    })
  }

  // ---- State-mutation serialization. ----
  // Read → pnpm → write must not interleave: two concurrent requests could
  // otherwise overwrite each other's manifest change (lost update).
  let mutationChain: Promise<unknown> = Promise.resolve()
  const exclusive = <T>(task: () => Promise<T>): Promise<T> => {
    const run = mutationChain.then(task, task)
    mutationChain = run.catch(() => undefined)
    return run
  }

  const findEntry = async (id: string): Promise<PluginRegistryEntry | null> => {
    await ensureCatalog(effectiveCatalogUrl(current()))
    return registryCache?.find(entry => entry.id === id) ?? null
  }

  /** Installed versions + package names for the current profile. */
  const installedFacts = (
    profileDir: string,
    loaded: LoadedProfileState,
  ): { versions: Map<string, string>; names: string[] } => {
    const versions = new Map<string, string>()
    const names: string[] = []
    for (const packageName of loaded.plugins.packages.values()) {
      names.push(packageName)
      const version = readInstalledVersion(profileDir, packageName)
      if (version !== null) versions.set(packageName, version)
    }
    return { versions, names }
  }

  const buildSnapshot = (
    profileDir: string,
    loaded: LoadedProfileState,
    registry: readonly PluginRegistryEntry[],
  ): PluginCenterSnapshot => {
    const { versions } = installedFacts(profileDir, loaded)
    return mergeCatalog(registry, loaded.plugins, versions, latestVersions)
  }

  const resolveInstallSpec = async (entry: PluginRegistryEntry): Promise<ResolvedInstallSpec> => {
    if (entry.download === undefined) {
      return { spec: entry.spec, sha256Verified: false, tempPath: null }
    }
    const response = await fetch(entry.download)
    if (!response.ok) throw new Error(`download failed with HTTP ${response.status}`)
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (entry.sha256 !== undefined && !sha256Matches(sha256Hex(bytes), entry.sha256)) {
      throw new Error(`SHA256 mismatch for ${entry.packageName}`)
    }
    const tempPath = join(tmpdir(), `dsh-plugin-${entry.id}-${Date.now()}.tgz`)
    await writeFile(tempPath, bytes)
    return { spec: tempPath, sha256Verified: entry.sha256 !== undefined, tempPath }
  }

  const success = (
    action: PluginOperation, packageName: string, version: string | null,
    sha256Verified: boolean, message: string,
  ): PluginOperationResult => (
    { ok: true, action, packageName, version, sha256Verified, code: null, message }
  )

  const failure = (
    action: PluginOperation, packageName: string | null, version: string | null,
    code: string, message: string,
  ): PluginOperationResult => (
    { ok: false, action, packageName, version, sha256Verified: false, code, message }
  )

  /** Resolve the durable npm name for a catalog id, preferring the remembered mapping. */
  const resolvedName = (loaded: LoadedProfileState, entry: PluginRegistryEntry): string =>
    loaded.plugins.packages.get(entry.id) ?? entry.packageName

  /**
   * Find the real installed package name for a catalog entry that is already
   * installed — by this center (remembered mapping), by its npm name directly,
   * or through the manifest dependency whose spec starts with the entry's
   * origin (`github:owner/repo`). Prevents a second install from writing the
   * raw git spec into the bundle layer list.
   */
  const knownInstalledName = (
    loaded: LoadedProfileState,
    entry: PluginRegistryEntry,
    profileDir: string,
  ): string | null => {
    const remembered = loaded.plugins.packages.get(entry.id)
    if (remembered !== undefined) return remembered
    if (readInstalledVersion(profileDir, entry.packageName) !== null) return entry.packageName
    const origin = (entry.spec.split('#', 1)[0] ?? entry.spec).trim()
    if (origin !== '') {
      for (const [name, spec] of Object.entries(loaded.manifest.dependencies ?? {})) {
        if (typeof spec === 'string' && spec.startsWith(origin)) return name
      }
    }
    return null
  }

  const installOne = async (id: string): Promise<PluginOperationResult> => {
    const action: PluginOperation = 'install'
    const entry = await findEntry(id)
    if (entry === null) return failure(action, null, null, 'unknown-plugin', `unknown plugin id "${id}"`)
    const profileName = effectiveProfile(current())
    const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName)
    let tempPath: string | null = null
    try {
      const loaded = readProfileState(profileDir)
      // Already installed (by this center or by `dsh plugin`): installing again
      // is just "make sure it is enabled", with the REAL package name.
      const existing = knownInstalledName(loaded, entry, profileDir)
      if (existing !== null) {
        writeProfileState(
          profileDir,
          withBundleEnabled(loaded.manifest, existing),
          loaded.enabled,
          withoutDisabled(loaded.plugins.disabledNames, existing),
          withPackage(loaded.plugins.packages, entry.id, existing),
        )
        const message = `enabled already-installed ${existing}`
        appendOperationLog(profileDir, action, existing, entry.version, true, message)
        return success(action, existing, entry.version, false, message)
      }
      const resolved = await resolveInstallSpec(entry)
      tempPath = resolved.tempPath
      const before = readProfileState(profileDir)
      const pmResult = await packageManager.install(profileDir, resolved.spec)
      const after = readProfileState(profileDir)
      // pnpm records the dependency under the package's real name; the git spec
      // is only the source. Diff against the pre-install set to find it.
      const added = [...after.plugins.installedNames].filter(name => !before.plugins.installedNames.has(name))
      // A non-zero exit from ignored build scripts still leaves the dependency
      // installed; only fail when pnpm errored AND nothing was actually added.
      if (added.length === 0 && !pmResult.ok) {
        appendOperationLog(profileDir, action, entry.packageName, entry.version, false, pmResult.output)
        return failure(action, entry.packageName, entry.version, 'install-failed', pmResult.output)
      }
      const packageName = added[0] ?? resolvedName(after, entry)
      writeProfileState(
        profileDir,
        withBundleEnabled(after.manifest, packageName),
        after.enabled,
        withoutDisabled(after.plugins.disabledNames, packageName),
        withPackage(after.plugins.packages, entry.id, packageName),
      )
      const message = `installed ${packageName}`
      appendOperationLog(profileDir, action, packageName, entry.version, true, message)
      return success(action, packageName, entry.version, resolved.sha256Verified, message)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      appendOperationLog(profileDir, action, entry.packageName, entry.version, false, message)
      return failure(action, entry.packageName, entry.version, 'failed', message)
    } finally {
      if (tempPath !== null) void unlink(tempPath).catch(() => {})
    }
  }

  const updateOne = async (id: string): Promise<PluginOperationResult> => {
    const action: PluginOperation = 'update'
    const entry = await findEntry(id)
    if (entry === null) return failure(action, null, null, 'unknown-plugin', `unknown plugin id "${id}"`)
    const profileName = effectiveProfile(current())
    const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName)
    try {
      const loaded = readProfileState(profileDir)
      const packageName = resolvedName(loaded, entry)
      const beforeVersion = readInstalledVersion(profileDir, packageName)
      const pmResult = await packageManager.update(profileDir, packageName)
      if (!pmResult.ok) {
        appendOperationLog(profileDir, action, packageName, entry.version, false, pmResult.output)
        return failure(action, packageName, entry.version, 'update-failed', pmResult.output)
      }
      const afterVersion = readInstalledVersion(profileDir, packageName)
      if (beforeVersion !== null && afterVersion !== null && beforeVersion === afterVersion) {
        const message = `up to date: ${packageName}`
        appendOperationLog(profileDir, action, packageName, afterVersion, true, message)
        return { ok: true, action, packageName, version: afterVersion, sha256Verified: false, code: 'up-to-date', message }
      }
      const message = `updated ${packageName}`
      appendOperationLog(profileDir, action, packageName, afterVersion, true, message)
      return success(action, packageName, afterVersion, false, message)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      appendOperationLog(profileDir, action, entry.packageName, entry.version, false, message)
      return failure(action, entry.packageName, entry.version, 'failed', message)
    }
  }

  const uninstallOne = async (id: string): Promise<PluginOperationResult> => {
    const action: PluginOperation = 'uninstall'
    const entry = await findEntry(id)
    if (entry === null) return failure(action, null, null, 'unknown-plugin', `unknown plugin id "${id}"`)
    const profileName = effectiveProfile(current())
    const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName)
    try {
      const loaded = readProfileState(profileDir)
      const packageName = resolvedName(loaded, entry)
      const pmResult = await packageManager.uninstall(profileDir, packageName)
      if (!pmResult.ok) {
        appendOperationLog(profileDir, action, packageName, entry.version, false, pmResult.output)
        return failure(action, packageName, entry.version, 'uninstall-failed', pmResult.output)
      }
      // Re-read after pnpm remove: pnpm already dropped the dependency from the
      // manifest, so writing the pre-remove snapshot would resurrect it.
      const after = readProfileState(profileDir)
      writeProfileState(
        profileDir,
        withBundleDisabled(after.manifest, packageName),
        after.enabled,
        withoutDisabled(after.plugins.disabledNames, packageName),
        withoutPackage(after.plugins.packages, entry.id),
      )
      const message = `uninstalled ${packageName}`
      appendOperationLog(profileDir, action, packageName, entry.version, true, message)
      return success(action, packageName, entry.version, false, message)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      appendOperationLog(profileDir, action, entry.packageName, entry.version, false, message)
      return failure(action, entry.packageName, entry.version, 'failed', message)
    }
  }

  const setEnabled = async (id: string, enabled: boolean): Promise<PluginOperationResult> => {
    const action: PluginOperation = enabled ? 'enable' : 'disable'
    const entry = await findEntry(id)
    if (entry === null) return failure(action, null, null, 'unknown-plugin', `unknown plugin id "${id}"`)
    const profileName = effectiveProfile(current())
    const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName)
    try {
      const loaded = readProfileState(profileDir)
      const packageName = resolvedName(loaded, entry)
      const manifest = enabled
        ? withBundleEnabled(loaded.manifest, packageName)
        : withBundleDisabled(loaded.manifest, packageName)
      const disabled = enabled
        ? withoutDisabled(loaded.plugins.disabledNames, packageName)
        : withDisabled(loaded.plugins.disabledNames, packageName)
      writeProfileState(profileDir, manifest, loaded.enabled, disabled, loaded.plugins.packages)
      const message = `${action} ${packageName}`
      appendOperationLog(profileDir, action, packageName, entry.version, true, message)
      return success(action, packageName, entry.version, false, message)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      appendOperationLog(profileDir, action, entry.packageName, entry.version, false, message)
      return failure(action, entry.packageName, entry.version, 'failed', message)
    }
  }

  ctx.effect(() => {
    const disposeRoute = ctx.webServer.register({
      kind: 'prefix',
      path: '/plugin-center',
      handler: (req, res) => { void dispatch(req, res) },
    })
    // Warm the catalog in the background so the first open of the panel does
    // not wait for a cold fetch.
    void ensureCatalog(effectiveCatalogUrl(current())).catch(() => {})
    return () => { disposeRoute() }
  }, 'plugin-center: /plugin-center routes')

  async function dispatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const profileName = effectiveProfile(current())
    const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName)
    const pathname = (req.url ?? '/').split('?', 1)[0] ?? '/'
    const sub = pathname === '/plugin-center' ? '' : pathname.slice('/plugin-center'.length)
    const catalogUrl = effectiveCatalogUrl(current())
    try {
      // Feature on/off (sidecar-owned, default on). These two routes stay
      // reachable even while disabled so the flag can be read + flipped.
      if (sub === '/status' && (req.method === 'GET' || req.method === 'HEAD')) {
        sendJson(res, 200, { ok: true, enabled: readProfileState(profileDir).enabled })
        return
      }
      if (sub === '/set-enabled' && req.method === 'POST') {
        const rejection = crossOriginReason(req)
        if (rejection !== null) {
          sendJson(res, 403, { ok: false, code: 'forbidden', message: rejection })
          return
        }
        const body = await readJsonBody(req) as Record<string, unknown>
        const enabled = body.enabled === true
        await exclusive(() => {
          const loaded = readProfileState(profileDir)
          writeProfileState(profileDir, loaded.manifest, enabled, loaded.plugins.disabledNames, loaded.plugins.packages)
          return Promise.resolve()
        })
        sendJson(res, 200, { ok: true, enabled })
        return
      }
      if (!readProfileState(profileDir).enabled) {
        sendJson(res, 403, { ok: false, code: 'disabled', message: 'Plugin Center is disabled' })
        return
      }
      if (sub === '/list' && (req.method === 'GET' || req.method === 'HEAD')) {
        await ensureCatalog(catalogUrl)
        const loaded = readProfileState(profileDir)
        const { names } = installedFacts(profileDir, loaded)
        void refreshLatestVersions(names).catch(() => {})
        sendJson(res, 200, {
          ok: true,
          ...buildSnapshot(profileDir, loaded, registryCache ?? []),
          error: registryError,
        })
        return
      }
      if (sub === '/refresh' && req.method === 'POST') {
        const rejection = crossOriginReason(req)
        if (rejection !== null) {
          sendJson(res, 403, { ok: false, code: 'forbidden', message: rejection })
          return
        }
        await forceCatalogRefresh(catalogUrl)
        const loaded = readProfileState(profileDir)
        const { names } = installedFacts(profileDir, loaded)
        await refreshLatestVersions(names)
        sendJson(res, 200, {
          ok: true,
          ...buildSnapshot(profileDir, loaded, registryCache ?? []),
          error: registryError,
        })
        return
      }
      if (sub === '/logs' && (req.method === 'GET' || req.method === 'HEAD')) {
        sendJson(res, 200, { ok: true, entries: readOperationLog(profileDir) })
        return
      }
      if (sub === '/install' || sub === '/update' || sub === '/uninstall' || sub === '/enable' || sub === '/disable') {
        if (req.method !== 'POST') {
          sendJson(res, 405, { ok: false, code: 'method-not-allowed', message: 'method not allowed' })
          return
        }
        const rejection = crossOriginReason(req)
        if (rejection !== null) {
          sendJson(res, 403, { ok: false, code: 'forbidden', message: rejection })
          return
        }
        const body = await readJsonBody(req) as Record<string, unknown>
        const id = typeof body.id === 'string' ? body.id : ''
        if (id === '') {
          sendJson(res, 400, { ok: false, code: 'bad-request', message: 'missing plugin id' })
          return
        }
        if (sub === '/install') sendJson(res, 200, await exclusive(() => installOne(id)))
        else if (sub === '/update') sendJson(res, 200, await exclusive(() => updateOne(id)))
        else if (sub === '/uninstall') sendJson(res, 200, await exclusive(() => uninstallOne(id)))
        else if (sub === '/enable') sendJson(res, 200, await exclusive(() => setEnabled(id, true)))
        else sendJson(res, 200, await exclusive(() => setEnabled(id, false)))
        return
      }
      sendJson(res, 404, { ok: false, code: 'not-found', message: 'unknown plugin-center route' })
    } catch (error) {
      if (error instanceof RequestError) {
        sendJson(res, error.status, { ok: false, code: error.code, message: error.message })
        return
      }
      sendJson(res, 500, {
        ok: false,
        code: 'internal',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

/** Write one JSON response. */
function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(JSON.stringify(body))
}

/**
 * Read a request body as parsed JSON (empty body reads as `{}`). Oversized
 * bodies are rejected before buffering, and malformed JSON maps to a 400
 * rather than a 500.
 */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const declared = Number(req.headers['content-length'] ?? 0)
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new RequestError(413, 'payload-too-large', 'request body too large')
  }
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    total += buffer.length
    if (total > MAX_BODY_BYTES) throw new RequestError(413, 'payload-too-large', 'request body too large')
    chunks.push(buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (raw.trim() === '') return {}
  try {
    return JSON.parse(raw)
  } catch {
    throw new RequestError(400, 'bad-json', 'request body is not valid JSON')
  }
}
