/**
 * JSONL operation log for plugin install/uninstall/update/enable/disable. One
 * line per committed attempt (success or failure), newest first on read. The
 * pure format/parse pair is exported for unit tests; the file helpers own the
 * durable boundary.
 */

import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PluginOperation, PluginOperationLogEntry } from './types.ts'

/** Log filename inside the profile directory. */
export const OPERATION_LOG_FILENAME = 'plugin-center.log'

/**
 * Serialize one log entry to its JSONL line.
 * @param entry - the entry to serialize.
 * @returns one line without a trailing newline.
 */
export function formatLogLine(entry: PluginOperationLogEntry): string {
  return JSON.stringify(entry)
}

/**
 * Parse one log line, returning undefined for a line that is not a valid
 * entry (truncated writes and hand edits are skipped, not fatal).
 * @param line - one raw line.
 * @returns the parsed entry, or undefined.
 */
export function parseLogLine(line: string): PluginOperationLogEntry | undefined {
  if (line.trim() === '') return undefined
  try {
    const value = JSON.parse(line) as Partial<PluginOperationLogEntry>
    if (typeof value.timestamp !== 'number'
      || typeof value.action !== 'string'
      || typeof value.packageName !== 'string'
      || typeof value.ok !== 'boolean'
      || typeof value.message !== 'string') return undefined
    return {
      timestamp: value.timestamp,
      action: value.action as PluginOperation,
      packageName: value.packageName,
      version: typeof value.version === 'string' ? value.version : null,
      ok: value.ok,
      message: value.message,
    }
  } catch {
    return undefined
  }
}

/**
 * Append one committed operation to the log file.
 * @param profileDir - the absolute profile directory.
 * @param action - the operation verb.
 * @param packageName - the npm package name targeted.
 * @param version - the version installed or targeted, or null.
 * @param ok - whether the operation succeeded.
 * @param message - human-readable result.
 */
export function appendOperationLog(
  profileDir: string,
  action: PluginOperation,
  packageName: string,
  version: string | null,
  ok: boolean,
  message: string,
): void {
  const entry: PluginOperationLogEntry = {
    timestamp: Date.now(),
    action,
    packageName,
    version,
    ok,
    message,
  }
  appendFileSync(join(profileDir, OPERATION_LOG_FILENAME), formatLogLine(entry) + '\n', 'utf8')
}

/**
 * Read the operation log, newest first.
 * @param profileDir - the absolute profile directory.
 * @returns parsed entries in reverse-chronological order.
 */
export function readOperationLog(profileDir: string): readonly PluginOperationLogEntry[] {
  const path = join(profileDir, OPERATION_LOG_FILENAME)
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8')
    .split('\n')
    .flatMap(line => {
      const entry = parseLogLine(line)
      return entry === undefined ? [] : [entry]
    })
    .reverse()
}
