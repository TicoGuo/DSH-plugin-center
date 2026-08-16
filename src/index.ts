/**
 * Plugin Center host half: an HTTP route tree plus a settings namespace.
 *
 * This is a third-party-installable plugin, so it cannot depend on the
 * harness's Typert Remote assembly (which is compiled in). Instead it registers
 * a `/plugin-center` prefix route on the web server — the same transport the
 * balance-check plugin uses — and a `plugin-center` settings namespace whose
 * `enabled` boolean (default off) is the on/off toggle rendered by the browser
 * card.
 *
 * The catalog is the curated awesome-dsh-plugin list; install/uninstall/update
 * forward to pnpm inside the managed profile (git specs resolve to a package
 * name discovered by dependency diff and remembered in the sidecar), and every
 * mutation is appended to a JSONL operation log.
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
  withBundleEnabled, writeProfileState,
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

/**
 * Mount the `/plugin-center` route tree. The on/off toggle is persisted in the
 * profile sidecar (not a settings namespace), so no harness change is required.
 * @param ctx - plugin context carrying the web server.
 * @param config - deployment policy (profile + catalog URL).
 */
export function apply(ctx: Context, config: Config = {}): void {
  const current = (): Config => config

  const packageManager: PackageManager = createPnpmPackageManager()
  let registryCache: readonly PluginRegistryEntry[] | null = null
  let registryError: string | null = null
  let registryLoad: Promise<void> | null = null

  const loadCatalog = (catalogUrl: string): Promise<void> => {
    registryLoad ??= loadRegistry(catalogUrl).then((result) => {
      registryCache = result.entries
      registryError = result.error
    })
    return registryLoad
  }

  const findEntry = async (id: string): Promise<PluginRegistryEntry | null> => {
    await loadCatalog(effectiveCatalogUrl(current()))
    return registryCache?.find(entry => entry.id === id) ?? null
  }

  const buildSnapshot = (registry: readonly PluginRegistryEntry[]): PluginCenterSnapshot => {
    const profileName = effectiveProfile(current())
    const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName)
    const loaded = readProfileState(profileDir)
    const versions = new Map<string, string>()
    for (const packageName of loaded.plugins.packages.values()) {
      const version = readInstalledVersion(profileDir, packageName)
      if (version !== null) versions.set(packageName, version)
    }
    return mergeCatalog(registry, loaded.plugins, versions)
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
  const resolvedName = (loaded: ReturnType<typeof readProfileState>, entry: PluginRegistryEntry): string =>
    loaded.plugins.packages.get(entry.id) ?? entry.packageName

  const installOne = async (id: string): Promise<PluginOperationResult> => {
    const action: PluginOperation = 'install'
    const entry = await findEntry(id)
    if (entry === null) return failure(action, null, null, 'unknown-plugin', `unknown plugin id "${id}"`)
    const profileName = effectiveProfile(current())
    const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName)
    let tempPath: string | null = null
    try {
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
    return () => { disposeRoute() }
  }, 'plugin-center: /plugin-center routes')

  async function dispatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const profileName = effectiveProfile(current())
    const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName)
    const pathname = (req.url ?? '/').split('?', 1)[0] ?? '/'
    const sub = pathname === '/plugin-center' ? '' : pathname.slice('/plugin-center'.length)
    try {
      // Feature on/off (sidecar-owned). These two routes stay reachable even
      // while disabled, so the settings card can read + flip the toggle.
      if (sub === '/status' && (req.method === 'GET' || req.method === 'HEAD')) {
        sendJson(res, 200, { ok: true, enabled: readProfileState(profileDir).enabled })
        return
      }
      if (sub === '/set-enabled' && req.method === 'POST') {
        const body = await readJsonBody(req) as Record<string, unknown>
        const enabled = body.enabled === true
        const loaded = readProfileState(profileDir)
        writeProfileState(profileDir, loaded.manifest, enabled, loaded.plugins.disabledNames, loaded.plugins.packages)
        sendJson(res, 200, { ok: true, enabled })
        return
      }
      if (!readProfileState(profileDir).enabled) {
        sendJson(res, 403, { ok: false, code: 'disabled', message: 'Plugin Center is disabled' })
        return
      }
      if (sub === '/list' && (req.method === 'GET' || req.method === 'HEAD')) {
        await loadCatalog(effectiveCatalogUrl(current()))
        sendJson(res, 200, { ok: true, ...buildSnapshot(registryCache ?? []), error: registryError })
        return
      }
      if (sub === '/refresh' && req.method === 'POST') {
        registryCache = null
        registryError = null
        registryLoad = null
        await loadCatalog(effectiveCatalogUrl(current()))
        sendJson(res, 200, { ok: true, ...buildSnapshot(registryCache ?? []), error: registryError })
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
        const body = await readJsonBody(req) as Record<string, unknown>
        const id = typeof body.id === 'string' ? body.id : ''
        if (id === '') {
          sendJson(res, 400, { ok: false, code: 'bad-request', message: 'missing plugin id' })
          return
        }
        if (sub === '/install') sendJson(res, 200, await installOne(id))
        else if (sub === '/update') sendJson(res, 200, await updateOne(id))
        else if (sub === '/uninstall') sendJson(res, 200, await uninstallOne(id))
        else if (sub === '/enable') sendJson(res, 200, await setEnabled(id, true))
        else sendJson(res, 200, await setEnabled(id, false))
        return
      }
      sendJson(res, 404, { ok: false, code: 'not-found', message: 'unknown plugin-center route' })
    } catch (error) {
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
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

/** Read a request body as parsed JSON (empty body reads as `{}`). */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (raw.trim() === '') return {}
  return JSON.parse(raw)
}
