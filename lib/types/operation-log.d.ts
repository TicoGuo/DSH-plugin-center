/**
 * JSONL operation log for plugin install/uninstall/update/enable/disable. One
 * line per committed attempt (success or failure), newest first on read. The
 * pure format/parse pair is exported for unit tests; the file helpers own the
 * durable boundary.
 */
import type { PluginOperation, PluginOperationLogEntry } from './types.ts';
/** Log filename inside the profile directory. */
export declare const OPERATION_LOG_FILENAME = "plugin-center.log";
/**
 * Size cap on the active log. When appending would exceed it, the current
 * file rotates to `plugin-center.log.1` (previous backup is dropped) so the
 * file stays bounded forever.
 */
export declare const OPERATION_LOG_MAX_BYTES = 1000000;
/**
 * Serialize one log entry to its JSONL line.
 * @param entry - the entry to serialize.
 * @returns one line without a trailing newline.
 */
export declare function formatLogLine(entry: PluginOperationLogEntry): string;
/**
 * Parse one log line, returning undefined for a line that is not a valid
 * entry (truncated writes and hand edits are skipped, not fatal).
 * @param line - one raw line.
 * @returns the parsed entry, or undefined.
 */
export declare function parseLogLine(line: string): PluginOperationLogEntry | undefined;
/**
 * Append one committed operation to the log file.
 * @param profileDir - the absolute profile directory.
 * @param action - the operation verb.
 * @param packageName - the npm package name targeted.
 * @param version - the version installed or targeted, or null.
 * @param ok - whether the operation succeeded.
 * @param message - human-readable result.
 */
export declare function appendOperationLog(profileDir: string, action: PluginOperation, packageName: string, version: string | null, ok: boolean, message: string): void;
/**
 * Read the operation log, newest first.
 * @param profileDir - the absolute profile directory.
 * @returns parsed entries in reverse-chronological order.
 */
export declare function readOperationLog(profileDir: string): readonly PluginOperationLogEntry[];
//# sourceMappingURL=operation-log.d.ts.map