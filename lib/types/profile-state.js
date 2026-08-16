/**
 * Durable profile state for the Plugin Center: the profile manifest's
 * `dsh.profile.bundles` layer list (which bundles are enabled) plus a small
 * `plugin-center.json` sidecar holding the names of intentionally-disabled
 * bundles. Keeping the disabled list separate from `dependencies` lets an
 * installed plugin stay installed while its patch layer is switched off.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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
 * Parse the plugin-center sidecar, treating any missing or malformed file as
 * the empty state (the sidecar is best-effort durability, not the source of
 * truth — the manifest's bundles list remains authoritative).
 * @param profileDir - the absolute profile directory.
 * @returns the disabled-name set.
 */
function readDisabledNames(profileDir) {
    const path = join(profileDir, PLUGIN_CENTER_STATE_FILENAME);
    if (!existsSync(path))
        return new Set();
    try {
        const parsed = JSON.parse(readFileSync(path, 'utf8'));
        const disabled = parsed?.disabled;
        if (Array.isArray(disabled) && disabled.every(name => typeof name === 'string')) {
            return new Set(disabled);
        }
        return new Set();
    }
    catch {
        return new Set();
    }
}
/**
 * Read the profile's current plugin state from disk.
 * @param profileDir - the absolute profile directory.
 * @returns the manifest and its projected plugin state.
 */
export function readProfileState(profileDir) {
    const manifest = readProfileManifest('dsh', profileDir);
    const enabledBundles = manifest.dsh?.profile?.bundles ?? [];
    const disabledNames = readDisabledNames(profileDir);
    return {
        manifest,
        plugins: {
            enabledBundles,
            disabledNames,
            installedNames: new Set(Object.keys(manifest.dependencies ?? {})),
        },
    };
}
/**
 * Persist the manifest's bundle list and the sidecar's disabled list. The two
 * files are written together so an enable/disable toggle cannot leave them
 * disagreeing about which bundles are composed.
 * @param profileDir - the absolute profile directory.
 * @param manifest - the manifest to write (its `dsh.profile.bundles` must already reflect the change).
 * @param disabledNames - the full disabled-name set to persist.
 */
export function writeProfileState(profileDir, manifest, disabledNames) {
    writeProfileManifest(profileDir, manifest);
    const sidecar = { disabled: [...disabledNames].sort() };
    writeFileSync(join(profileDir, PLUGIN_CENTER_STATE_FILENAME), JSON.stringify(sidecar, undefined, 2) + '\n');
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
//# sourceMappingURL=profile-state.js.map