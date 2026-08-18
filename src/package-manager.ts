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

/** Cap on one pnpm command so a stalled network degrades to a failure instead of a hung request. */
export const PNPM_TIMEOUT_MS = 10 * 60_000

/**
 * pnpm arguments reach the shell on Windows (`shell: true`), so every argument
 * is validated against a strict character allowlist before anything is
 * spawned. npm specs (`pkg@1.2.3`), git specs (`github:owner/repo#path:/x`),
 * scoped names (`@scope/name`) and temp tarball paths (with `\`) are all
 * covered; shell metacharacters (`& | < > ^ % ! ( ) " ' \`` and whitespace) are
 * rejected — a hostile catalog row can never escalate to a second command.
 */
export const SAFE_PNPM_ARG = /^[A-Za-z0-9@._:/#+\-\\]+$/

/** Upper bound on one pnpm argument (also bounds the spawned command line). */
const MAX_ARG_LENGTH = 1024

/**
 * Reject an argument that could inject shell syntax.
 * @param argument - the argument about to reach pnpm.
 */
export function assertSafePnpmArg(argument: string): void {
  if (argument.length === 0 || argument.length > MAX_ARG_LENGTH || !SAFE_PNPM_ARG.test(argument)) {
    throw new Error(`unsafe pnpm argument: "${argument.length > 40 ? `${argument.slice(0, 40)}…` : argument}"`)
  }
}

/**
 * Run one pnpm command inside the profile directory, capturing combined output
 * for error reporting. Windows resolves pnpm through its `.cmd` shim, which
 * requires a shell; the shell-syntax risk is closed by {@link assertSafePnpmArg}
 * validating every argument first. A command that exceeds the timeout is killed
 * and reported as a failure instead of leaving the request pending forever.
 * @param profileDir - the profile directory pnpm runs in.
 * @param args - pnpm arguments, verbatim after `pnpm`.
 * @returns the exit status and captured output.
 */
function runPnpm(profileDir: string, args: readonly string[]): Promise<PackageManagerResult> {
  for (const argument of args) assertSafePnpmArg(argument)
  return new Promise((resolve) => {
    const child = spawn('pnpm', [...args], {
      cwd: profileDir,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    let settled = false
    let timer: NodeJS.Timeout | undefined
    const finish = (result: PackageManagerResult): void => {
      if (settled) return
      settled = true
      if (timer !== undefined) clearTimeout(timer)
      resolve(result)
    }
    timer = setTimeout(() => {
      child.kill()
      finish({ ok: false, output: `${output}pnpm timed out after ${PNPM_TIMEOUT_MS}ms`.trim() })
    }, PNPM_TIMEOUT_MS)
    timer.unref?.()
    child.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString('utf8') })
    child.stderr?.on('data', (chunk: Buffer) => { output += chunk.toString('utf8') })
    child.on('error', (error: Error) => {
      finish({ ok: false, output: error.message })
    })
    child.on('close', (code) => {
      finish({ ok: code === 0, output })
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
