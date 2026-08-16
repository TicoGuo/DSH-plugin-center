/**
 * Durable profile state for the Plugin Center: the profile manifest's
 * `dsh.profile.bundles` layer list (which bundles are enabled) plus a small
 * `plugin-center.json` sidecar holding the names of intentionally-disabled
 * bundles. Keeping the disabled list separate from `dependencies` lets an
 * installed plugin stay installed while its patch layer is switched off.
 */
import { type ProfileManifest } from '@deepseek-ai/dsh-app-boot';
/** Sidecar filename inside the profile directory. */
export declare const PLUGIN_CENTER_STATE_FILENAME = "plugin-center.json";
/** Live projection of the profile's plugin state. */
export interface ProfilePluginState {
    /** Bundle names currently composed as patch layers (enabled). */
    readonly enabledBundles: readonly string[];
    /** Bundle names deliberately switched off while still installed. */
    readonly disabledNames: ReadonlySet<string>;
    /** Package names present in the profile `dependencies`. */
    readonly installedNames: ReadonlySet<string>;
}
/** Read profile manifest plus the parsed plugin-center sidecar. */
export interface LoadedProfileState {
    readonly manifest: ProfileManifest;
    readonly plugins: ProfilePluginState;
}
/**
 * Ensure the profile directory exists and is initialized (a no-op when the
 * profile already has its manifest), mirroring the `dsh plugin` first-use
 * behavior.
 * @param profileDir - the absolute profile directory.
 * @param profileName - the profile name, used to pick the shipped template.
 * @returns the profile directory.
 */
export declare function ensureProfileDir(profileDir: string, profileName: string): string;
/**
 * Read the profile's current plugin state from disk.
 * @param profileDir - the absolute profile directory.
 * @returns the manifest and its projected plugin state.
 */
export declare function readProfileState(profileDir: string): LoadedProfileState;
/**
 * Persist the manifest's bundle list and the sidecar's disabled list. The two
 * files are written together so an enable/disable toggle cannot leave them
 * disagreeing about which bundles are composed.
 * @param profileDir - the absolute profile directory.
 * @param manifest - the manifest to write (its `dsh.profile.bundles` must already reflect the change).
 * @param disabledNames - the full disabled-name set to persist.
 */
export declare function writeProfileState(profileDir: string, manifest: ProfileManifest, disabledNames: ReadonlySet<string>): void;
/**
 * Copy a manifest with one bundle appended to the layer list (deduplicated).
 * @param manifest - the current manifest.
 * @param packageName - the bundle name to enable.
 * @returns a new manifest with the bundle enabled.
 */
export declare function withBundleEnabled(manifest: ProfileManifest, packageName: string): ProfileManifest;
/**
 * Read one installed package's resolved version from the profile's hoisted
 * `node_modules` (pnpm's `nodeLinker: hoisted` layout). Scoped names nest under
 * their scope directory. A missing or unreadable manifest is absent, not fatal:
 * the version only feeds the update-available label.
 * @param profileDir - the absolute profile directory.
 * @param packageName - the npm package name.
 * @returns the resolved version, or null when it cannot be read.
 */
export declare function readInstalledVersion(profileDir: string, packageName: string): string | null;
/**
 * Copy a manifest with one bundle removed from the layer list.
 * @param manifest - the current manifest.
 * @param packageName - the bundle name to disable or remove.
 * @returns a new manifest without the bundle in the layer list.
 */
export declare function withBundleDisabled(manifest: ProfileManifest, packageName: string): ProfileManifest;
//# sourceMappingURL=profile-state.d.ts.map