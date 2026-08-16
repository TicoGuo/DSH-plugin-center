/**
 * Plugin Center host half: an HTTP route tree plus a settings namespace.
 *
 * This is a third-party-installable plugin, so it cannot depend on the
 * harness's Typert Remote assembly (which is compiled in). Instead it registers
 * a `/plugin-center` prefix route on the web server — the same transport the
 * balance-check plugin uses — and a `plugin-center` settings namespace whose
 * `enabled` boolean is the on/off toggle rendered by the browser card.
 *
 * The catalog is read live from GitHub (ranked by stars) with a curated
 * registry URL override; install/uninstall/update forward to pnpm inside the
 * managed profile; tarball downloads are SHA256-verified when the registry
 * publishes a digest; and every mutation is appended to a JSONL operation log.
 * @module @ticoguo/dsh-plugin-center
 */
import { unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import z from '@deepseek-ai/schemastery';
import { resolveProfileDir } from '@deepseek-ai/dsh-app-boot';
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings';
import { DEFAULT_GITHUB_QUERY } from "./github.js";
import { loadRegistry } from "./registry.js";
import { mergeCatalog } from "./merge.js";
import { ensureProfileDir, readInstalledVersion, readProfileState, withBundleDisabled, withBundleEnabled, writeProfileState, } from "./profile-state.js";
import { createPnpmPackageManager } from "./package-manager.js";
import { appendOperationLog, readOperationLog } from "./operation-log.js";
import { sha256Hex, sha256Matches } from "./sha256.js";
/** Cordis plugin name used by loader diagnostics. */
export const name = 'plugin-center';
/** Required service: the HTTP route registry. */
export const inject = ['webServer'];
/** Schemastery schema resolving this plugin's configuration (fields optional, like the balance-check plugin). */
export const Config = z.object({
    profile: z.string(),
    enabled: z.boolean(),
    githubQuery: z.string(),
});
/** Settings namespace carrying this plugin's user-facing fields. */
export const PLUGIN_CENTER_SETTINGS_NAMESPACE = settingsNamespace('plugin-center');
/** Effective profile name with the default applied. */
function effectiveProfile(config) {
    return config.profile !== undefined && config.profile.length > 0 ? config.profile : 'web';
}
function effectiveEnabled(config) {
    return config.enabled ?? true;
}
function effectiveQuery(config) {
    return config.githubQuery !== undefined && config.githubQuery.length > 0
        ? config.githubQuery
        : DEFAULT_GITHUB_QUERY;
}
/** Copy a disabled-name set with one name added. */
function withDisabled(disabled, name) {
    const next = new Set(disabled);
    next.add(name);
    return next;
}
/** Copy a disabled-name set with one name removed. */
function withoutDisabled(disabled, name) {
    const next = new Set(disabled);
    next.delete(name);
    return next;
}
/**
 * Register the settings namespace and mount the `/plugin-center` route tree.
 * @param ctx - plugin context carrying the web server (and, when composed, the settings service).
 * @param config - resolved plugin configuration.
 */
export function apply(ctx, config = {}) {
    // The settings scope feeds the web plugin-configuration card; when no settings
    // service is mounted the plugin keeps working from the composition entry alone.
    let current = () => config;
    installSettingsSection(ctx, PLUGIN_CENTER_SETTINGS_NAMESPACE, Config, config, {
        setSource: (source) => {
            current = source;
        },
        onChange: () => { },
    });
    const packageManager = createPnpmPackageManager();
    let registryCache = null;
    let registryError = null;
    let registryLoad = null;
    const loadCatalog = (query) => {
        registryLoad ??= loadRegistry(query).then((result) => {
            registryCache = result.entries;
            registryError = result.error;
        });
        return registryLoad;
    };
    const findEntry = async (id) => {
        await loadCatalog(effectiveQuery(current()));
        return registryCache?.find(entry => entry.id === id) ?? null;
    };
    const buildSnapshot = (registry) => {
        const profileName = effectiveProfile(current());
        const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName);
        const loaded = readProfileState(profileDir);
        const versions = new Map();
        for (const packageName of loaded.plugins.installedNames) {
            const version = readInstalledVersion(profileDir, packageName);
            if (version !== null)
                versions.set(packageName, version);
        }
        return mergeCatalog(registry, loaded.plugins, versions);
    };
    const resolveInstallSpec = async (entry) => {
        if (entry.download === undefined) {
            return { spec: entry.spec, sha256Verified: false, tempPath: null };
        }
        const response = await fetch(entry.download);
        if (!response.ok)
            throw new Error(`download failed with HTTP ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (entry.sha256 !== undefined && !sha256Matches(sha256Hex(bytes), entry.sha256)) {
            throw new Error(`SHA256 mismatch for ${entry.packageName}`);
        }
        const tempPath = join(tmpdir(), `dsh-plugin-${entry.id}-${Date.now()}.tgz`);
        await writeFile(tempPath, bytes);
        return { spec: tempPath, sha256Verified: entry.sha256 !== undefined, tempPath };
    };
    const success = (action, packageName, version, sha256Verified, message) => ({ ok: true, action, packageName, version, sha256Verified, code: null, message });
    const failure = (action, packageName, version, code, message) => ({ ok: false, action, packageName, version, sha256Verified: false, code, message });
    const installOrUpdate = async (action, id) => {
        const entry = await findEntry(id);
        if (entry === null)
            return failure(action, null, null, 'unknown-plugin', `unknown plugin id "${id}"`);
        const profileName = effectiveProfile(current());
        const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName);
        let tempPath = null;
        try {
            const resolved = await resolveInstallSpec(entry);
            tempPath = resolved.tempPath;
            const pmResult = await packageManager.install(profileDir, resolved.spec);
            if (!pmResult.ok) {
                appendOperationLog(profileDir, action, entry.packageName, entry.version, false, pmResult.output);
                return failure(action, entry.packageName, entry.version, 'install-failed', pmResult.output);
            }
            const loaded = readProfileState(profileDir);
            writeProfileState(profileDir, withBundleEnabled(loaded.manifest, entry.packageName), withoutDisabled(loaded.plugins.disabledNames, entry.packageName));
            const message = `${action}ed ${entry.packageName}`;
            appendOperationLog(profileDir, action, entry.packageName, entry.version, true, message);
            return success(action, entry.packageName, entry.version, resolved.sha256Verified, message);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            appendOperationLog(profileDir, action, entry.packageName, entry.version, false, message);
            return failure(action, entry.packageName, entry.version, 'failed', message);
        }
        finally {
            if (tempPath !== null)
                void unlink(tempPath).catch(() => { });
        }
    };
    const uninstallOne = async (id) => {
        const action = 'uninstall';
        const entry = await findEntry(id);
        if (entry === null)
            return failure(action, null, null, 'unknown-plugin', `unknown plugin id "${id}"`);
        const profileName = effectiveProfile(current());
        const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName);
        try {
            const pmResult = await packageManager.uninstall(profileDir, entry.packageName);
            if (!pmResult.ok) {
                appendOperationLog(profileDir, action, entry.packageName, entry.version, false, pmResult.output);
                return failure(action, entry.packageName, entry.version, 'uninstall-failed', pmResult.output);
            }
            const loaded = readProfileState(profileDir);
            writeProfileState(profileDir, withBundleDisabled(loaded.manifest, entry.packageName), withoutDisabled(loaded.plugins.disabledNames, entry.packageName));
            const message = `uninstalled ${entry.packageName}`;
            appendOperationLog(profileDir, action, entry.packageName, entry.version, true, message);
            return success(action, entry.packageName, entry.version, false, message);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            appendOperationLog(profileDir, action, entry.packageName, entry.version, false, message);
            return failure(action, entry.packageName, entry.version, 'failed', message);
        }
    };
    const setEnabled = async (id, enabled) => {
        const action = enabled ? 'enable' : 'disable';
        const entry = await findEntry(id);
        if (entry === null)
            return failure(action, null, null, 'unknown-plugin', `unknown plugin id "${id}"`);
        const profileName = effectiveProfile(current());
        const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName);
        try {
            const loaded = readProfileState(profileDir);
            const manifest = enabled
                ? withBundleEnabled(loaded.manifest, entry.packageName)
                : withBundleDisabled(loaded.manifest, entry.packageName);
            const disabled = enabled
                ? withoutDisabled(loaded.plugins.disabledNames, entry.packageName)
                : withDisabled(loaded.plugins.disabledNames, entry.packageName);
            writeProfileState(profileDir, manifest, disabled);
            const message = `${action} ${entry.packageName}`;
            appendOperationLog(profileDir, action, entry.packageName, entry.version, true, message);
            return success(action, entry.packageName, entry.version, false, message);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            appendOperationLog(profileDir, action, entry.packageName, entry.version, false, message);
            return failure(action, entry.packageName, entry.version, 'failed', message);
        }
    };
    ctx.effect(() => {
        const disposeRoute = ctx.webServer.register({
            kind: 'prefix',
            path: '/plugin-center',
            handler: (req, res) => { void dispatch(req, res); },
        });
        return () => { disposeRoute(); };
    }, 'plugin-center: /plugin-center routes');
    async function dispatch(req, res) {
        if (!effectiveEnabled(current())) {
            sendJson(res, 403, { ok: false, code: 'disabled', message: 'Plugin Center is disabled' });
            return;
        }
        const pathname = (req.url ?? '/').split('?', 1)[0] ?? '/';
        const sub = pathname === '/plugin-center' ? '' : pathname.slice('/plugin-center'.length);
        try {
            if (sub === '/list' && (req.method === 'GET' || req.method === 'HEAD')) {
                await loadCatalog(effectiveQuery(current()));
                sendJson(res, 200, { ok: true, ...buildSnapshot(registryCache ?? []), error: registryError });
                return;
            }
            if (sub === '/refresh' && req.method === 'POST') {
                registryCache = null;
                registryError = null;
                registryLoad = null;
                await loadCatalog(effectiveQuery(current()));
                sendJson(res, 200, { ok: true, ...buildSnapshot(registryCache ?? []), error: registryError });
                return;
            }
            if (sub === '/logs' && (req.method === 'GET' || req.method === 'HEAD')) {
                const profileName = effectiveProfile(current());
                const profileDir = ensureProfileDir(resolveProfileDir(profileName), profileName);
                sendJson(res, 200, { ok: true, entries: readOperationLog(profileDir) });
                return;
            }
            if (sub === '/install' || sub === '/update' || sub === '/uninstall' || sub === '/enable' || sub === '/disable') {
                if (req.method !== 'POST') {
                    sendJson(res, 405, { ok: false, code: 'method-not-allowed', message: 'method not allowed' });
                    return;
                }
                const body = await readJsonBody(req);
                const id = typeof body.id === 'string' ? body.id : '';
                if (id === '') {
                    sendJson(res, 400, { ok: false, code: 'bad-request', message: 'missing plugin id' });
                    return;
                }
                if (sub === '/install')
                    sendJson(res, 200, await installOrUpdate('install', id));
                else if (sub === '/update')
                    sendJson(res, 200, await installOrUpdate('update', id));
                else if (sub === '/uninstall')
                    sendJson(res, 200, await uninstallOne(id));
                else if (sub === '/enable')
                    sendJson(res, 200, await setEnabled(id, true));
                else
                    sendJson(res, 200, await setEnabled(id, false));
                return;
            }
            sendJson(res, 404, { ok: false, code: 'not-found', message: 'unknown plugin-center route' });
        }
        catch (error) {
            sendJson(res, 500, {
                ok: false,
                code: 'internal',
                message: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
/** Write one JSON response. */
function sendJson(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
}
/** Read a request body as parsed JSON (empty body reads as `{}`). */
async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req)
        chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    if (raw.trim() === '')
        return {};
    return JSON.parse(raw);
}
//# sourceMappingURL=index.js.map