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
    /** Whether the Plugin Center is enabled (default false); toggled by the settings card. */
    enabled?: boolean;
    /** Curated catalog README URL (default the awesome-dsh-plugin list). */
    catalogUrl?: string;
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