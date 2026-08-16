/**
 * The pnpm seam behind plugin install/uninstall/update. It is an interface so
 * unit tests substitute a fake and never spawn a process; the production
 * implementation forwards to pnpm inside the profile directory, exactly like
 * `dsh plugin`.
 */
import { spawn } from 'node:child_process';
/**
 * Run one pnpm command inside the profile directory, capturing combined output
 * for error reporting. Windows resolves pnpm through its `.cmd` shim, which
 * requires a shell.
 * @param profileDir - the profile directory pnpm runs in.
 * @param args - pnpm arguments, verbatim after `pnpm`.
 * @returns the exit status and captured output.
 */
function runPnpm(profileDir, args) {
    return new Promise((resolve) => {
        const child = spawn('pnpm', [...args], {
            cwd: profileDir,
            shell: process.platform === 'win32',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let output = '';
        child.stdout?.on('data', (chunk) => { output += chunk.toString('utf8'); });
        child.stderr?.on('data', (chunk) => { output += chunk.toString('utf8'); });
        child.on('error', (error) => {
            resolve({ ok: false, output: error.message });
        });
        child.on('close', (code) => {
            resolve({ ok: code === 0, output });
        });
    });
}
/** The production pnpm-backed package manager. */
export function createPnpmPackageManager() {
    return {
        install: (profileDir, spec) => runPnpm(profileDir, ['add', spec]),
        uninstall: (profileDir, packageName) => runPnpm(profileDir, ['remove', packageName]),
        update: (profileDir, packageName) => runPnpm(profileDir, ['update', packageName]),
    };
}
//# sourceMappingURL=package-manager.js.map