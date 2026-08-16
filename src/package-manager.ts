/**
 * The pnpm seam behind plugin install/uninstall/update. It is an interface so
 * unit tests substitute a fake and never spawn a process; the production
 * implementation forwards to pnpm inside the profile directory, exactly like
 * `dsh plugin`.
 */

import { spawn } from 'node:child_process'

/** One completed package-manager command. */
export interface PackageManagerResult {
  /** Whether the command exited 0. */
  readonly ok: boolean
  /** Combined stdout/stderr, for error messages and the operation log. */
  readonly output: string
}

/** The mutation surface the Plugin Center needs from a package manager. */
export interface PackageManager {
  /** Install `spec` (a tarball path or git spec) into the profile. */
  install(profileDir: string, spec: string): Promise<PackageManagerResult>
  /** Remove an installed package from the profile. */
  uninstall(profileDir: string, packageName: string): Promise<PackageManagerResult>
  /** Update an installed package to its latest resolvable version. */
  update(profileDir: string, packageName: string): Promise<PackageManagerResult>
}

/**
 * Run one pnpm command inside the profile directory, capturing combined output
 * for error reporting. Windows resolves pnpm through its `.cmd` shim, which
 * requires a shell.
 * @param profileDir - the profile directory pnpm runs in.
 * @param args - pnpm arguments, verbatim after `pnpm`.
 * @returns the exit status and captured output.
 */
function runPnpm(profileDir: string, args: readonly string[]): Promise<PackageManagerResult> {
  return new Promise((resolve) => {
    const child = spawn('pnpm', [...args], {
      cwd: profileDir,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString('utf8') })
    child.stderr?.on('data', (chunk: Buffer) => { output += chunk.toString('utf8') })
    child.on('error', (error: Error) => {
      resolve({ ok: false, output: error.message })
    })
    child.on('close', (code) => {
      resolve({ ok: code === 0, output })
    })
  })
}

/** The production pnpm-backed package manager. */
export function createPnpmPackageManager(): PackageManager {
  return {
    install: (profileDir, spec) => runPnpm(profileDir, ['add', spec]),
    uninstall: (profileDir, packageName) => runPnpm(profileDir, ['remove', packageName]),
    update: (profileDir, packageName) => runPnpm(profileDir, ['update', packageName]),
  }
}
