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
/** The production pnpm-backed package manager. */
export declare function createPnpmPackageManager(): PackageManager;
//# sourceMappingURL=package-manager.d.ts.map