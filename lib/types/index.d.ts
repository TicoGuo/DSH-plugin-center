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
import type { Context } from '@deepseek-ai/cordis';
export type * from './types.ts';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "plugin-center";
/** Required service: the HTTP route registry. */
export declare const inject: string[];
/** Deployment policy for the Plugin Center. Every field is optional; defaults resolve in code. */
export interface Config {
    /** The profile whose directory is the install target (default `web`). */
    profile?: string;
    /** Curated catalog README URL (default the awesome-dsh-plugin list). */
    catalogUrl?: string;
}
/**
 * Mount the `/plugin-center` route tree. The on/off toggle is persisted in the
 * profile sidecar (not a settings namespace), so no harness change is required.
 * @param ctx - plugin context carrying the web server.
 * @param config - deployment policy (profile + catalog URL).
 */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map