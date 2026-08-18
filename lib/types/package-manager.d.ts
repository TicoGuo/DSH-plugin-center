/**
 * The pnpm seam behind plugin install/uninstall/update. It is an interface so
 * unit tests substitute a fake and never spawn a process; the production
 * implementation forwards to pnpm inside the profile directory, exactly like
 * `dsh plugin`.
 */
/** One completed package-manager command. */
export interface PackageManagerResult {
    /** Whether the command exited 0. */
    readonly ok: boolean;
    /** Combined stdout/stderr, for error messages and the operation log. */
    readonly output: string;
}
/** The mutation surface the Plugin Center needs from a package manager. */
export interface PackageManager {
    /** Install `spec` (a tarball path or git spec) into the profile. */
    install(profileDir: string, spec: string): Promise<PackageManagerResult>;
    /** Remove an installed package from the profile. */
    uninstall(profileDir: string, packageName: string): Promise<PackageManagerResult>;
    /** Update an installed package to its latest resolvable version. */
    update(profileDir: string, packageName: string): Promise<PackageManagerResult>;
}
/** Cap on one pnpm command so a stalled network degrades to a failure instead of a hung request. */
export declare const PNPM_TIMEOUT_MS: number;
/**
 * pnpm arguments reach the shell on Windows (`shell: true`), so every argument
 * is validated against a strict character allowlist before anything is
 * spawned. npm specs (`pkg@1.2.3`), git specs (`github:owner/repo#path:/x`),
 * scoped names (`@scope/name`) and temp tarball paths (with `\`) are all
 * covered; shell metacharacters (`& | < > ^ % ! ( ) " ' \`` and whitespace) are
 * rejected — a hostile catalog row can never escalate to a second command.
 */
export declare const SAFE_PNPM_ARG: RegExp;
/**
 * Reject an argument that could inject shell syntax.
 * @param argument - the argument about to reach pnpm.
 */
export declare function assertSafePnpmArg(argument: string): void;
/** The production pnpm-backed package manager. */
export declare function createPnpmPackageManager(): PackageManager;
//# sourceMappingURL=package-manager.d.ts.map