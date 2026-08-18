/**
 * Durable profile state for the Plugin Center: the profile manifest's
 * `dsh.profile.bundles` layer list (which bundles are enabled) plus a small
 * `plugin-center.json` sidecar holding the names of intentionally-disabled
 * bundles and the catalog-id → installed-package-name mapping (a git spec
 * `github:owner/repo` resolves to a package whose npm name differs from the
 * repo slug, so the resolved name is remembered here).
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_PROFILE_BUNDLES, initProfile, PROFILE_TEMPLATES, readProfileManifest, writeProfileManifest, } from '@deepseek-ai/dsh-app-boot';
/** Sidecar filename inside the profile directory. */
export const PLUGIN_CENTER_STATE_FILENAME = 'plugin-center.json';
/**
 * Ensure the profile directory exists and is initialized (a no-op when the
 * profile already has its manifest), mirroring the `dsh plugin` first-use
 * behavior.
 * @param profileDir - the absolute profile directory.
 * @param profileName - the profile name, used to pick the shipped template.
 * @returns the profile directory.
 */
export function ensureProfileDir(profileDir, profileName) {
    if (!existsSync(join(profileDir, 'package.json'))) {
        initProfile(profileDir, PROFILE_TEMPLATES[profileName] ?? DEFAULT_PROFILE_BUNDLES);
    }
    return profileDir;
}
/**
 * Parse the plugin-center sidecar, treating any missing or malformed field as
 * empty (the sidecar is best-effort durability, not the source of truth — the
 * manifest's bundles list remains authoritative). `enabled` defaults to true,
 * so the sidebar entry is present out of the box; only an explicit `false`
 * disables the feature.
 * @param profileDir - the absolute profile directory.
 * @returns the parsed sidecar with safe defaults.
 */
function readSidecar(profileDir) {
    const path = join(profileDir, PLUGIN_CENTER_STATE_FILENAME);
    if (!existsSync(path))
        return { enabled: true, disabled: [], packages: {} };
    try {
        const parsed = JSON.parse(readFileSync(path, 'utf8'));
        if (parsed === null || typeof parsed !== 'object')
            return { enabled: true, disabled: [], packages: {} };
        const enabled = parsed.enabled !== false;
        const disabled = Array.isArray(parsed.disabled) && parsed.disabled.every(name => typeof name === 'string')
            ? parsed.disabled
            : [];
        const packages = parsed.packages !== null && typeof parsed.packages === 'object' && !Array.isArray(parsed.packages)
            ? parsed.packages
            : {};
        return { enabled, disabled, packages };
    }
    catch {
        return { enabled: true, disabled: [], packages: {} };
    }
}
/**
 * Read the profile's current plugin state from disk.
 * @param profileDir - the absolute profile directory.
 * @returns the manifest and its projected plugin state.
 */
export function readProfileState(profileDir) {
    const manifest = readProfileManifest('dsh', profileDir);
    const sidecar = readSidecar(profileDir);
    const packages = new Map();
    for (const [id, name] of Object.entries(sidecar.packages)) {
        if (typeof name === 'string' && name !== '')
            packages.set(id, name);
    }
    return {
        manifest,
        enabled: sidecar.enabled,
        plugins: {
            enabledBundles: manifest.dsh?.profile?.bundles ?? [],
            disabledNames: new Set(sidecar.disabled),
            installedNames: new Set(Object.keys(manifest.dependencies ?? {})),
            packages,
        },
    };
}
/**
 * Persist the manifest's bundle list and the sidecar (enabled flag + disabled
 * list + id→name mapping) together so a mutation cannot leave them disagreeing.
 * @param profileDir - the absolute profile directory.
 * @param manifest - the manifest to write (its `dsh.profile.bundles` must already reflect the change).
 * @param enabled - whether the Plugin Center feature is enabled.
 * @param disabledNames - the full disabled-name set to persist.
 * @param packages - the full catalog-id → package-name mapping to persist.
 */
export function writeProfileState(profileDir, manifest, enabled, disabledNames, packages) {
    writeProfileManifest(profileDir, manifest);
    const sidecar = {
        enabled,
        disabled: [...disabledNames].sort(),
        packages: Object.fromEntries([...packages.entries()].sort(([left], [right]) => left.localeCompare(right))),
    };
    // Write the sidecar atomically (temp file + rename) so a crash mid-write
    // leaves the previous sidecar intact instead of a truncated JSON document.
    const target = join(profileDir, PLUGIN_CENTER_STATE_FILENAME);
    const temporary = `${target}.tmp`;
    writeFileSync(temporary, JSON.stringify(sidecar, undefined, 2) + '\n');
    renameSync(temporary, target);
}
/**
 * Copy a manifest with one bundle appended to the layer list (deduplicated).
 * @param manifest - the current manifest.
 * @param packageName - the bundle name to enable.
 * @returns a new manifest with the bundle enabled.
 */
export function withBundleEnabled(manifest, packageName) {
    const current = manifest.dsh?.profile?.bundles ?? [];
    if (current.includes(packageName))
        return manifest;
    return {
        ...manifest,
        dsh: {
            ...manifest.dsh,
            profile: {
                ...manifest.dsh?.profile,
                bundles: [...current, packageName],
            },
        },
    };
}
/**
 * Copy a manifest with one bundle removed from the layer list.
 * @param manifest - the current manifest.
 * @param packageName - the bundle name to disable or remove.
 * @returns a new manifest without the bundle in the layer list.
 */
export function withBundleDisabled(manifest, packageName) {
    const current = manifest.dsh?.profile?.bundles ?? [];
    if (!current.includes(packageName))
        return manifest;
    return {
        ...manifest,
        dsh: {
            ...manifest.dsh,
            profile: {
                ...manifest.dsh?.profile,
                bundles: current.filter(name => name !== packageName),
            },
        },
    };
}
/**
 * Read one installed package's resolved version from the profile's hoisted
 * `node_modules` (pnpm's `nodeLinker: hoisted` layout). Scoped names nest under
 * their scope directory. A missing or unreadable manifest is absent, not fatal:
 * the version only feeds the update-available label.
 * @param profileDir - the absolute profile directory.
 * @param packageName - the npm package name.
 * @returns the resolved version, or null when it cannot be read.
 */
export function readInstalledVersion(profileDir, packageName) {
    const path = join(profileDir, 'node_modules', ...packageName.split('/'), 'package.json');
    try {
        if (!existsSync(path))
            return null;
        const manifest = JSON.parse(readFileSync(path, 'utf8'));
        return manifest !== null && typeof manifest.version === 'string' ? manifest.version : null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=profile-state.js.map