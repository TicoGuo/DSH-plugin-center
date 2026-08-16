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
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export type * from './types.ts';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "plugin-center";
/** Required service: the HTTP route registry. */
export declare const inject: string[];
/** Deployment policy for the Plugin Center. Every field is optional; defaults resolve in code. */
export interface Config {
    /** The profile whose directory is the install target (default `web`). */
    profile?: string;
    /** Whether the Plugin Center is enabled (default true); toggled by the settings card. */
    enabled?: boolean;
    /** GitHub search query used when no curated registry is configured. */
    githubQuery?: string;
}
/** Schemastery schema resolving this plugin's configuration (fields optional, like the balance-check plugin). */
export declare const Config: z<Config>;
/** Settings namespace carrying this plugin's user-facing fields. */
export declare const PLUGIN_CENTER_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/**
 * Register the settings namespace and mount the `/plugin-center` route tree.
 * @param ctx - plugin context carrying the web server (and, when composed, the settings service).
 * @param config - resolved plugin configuration.
 */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map