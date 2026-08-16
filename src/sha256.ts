/**
 * SHA256 integrity helper for downloaded plugin tarballs. Pure over an input
 * byte sequence so the verification contract is unit-testable without network
 * or filesystem access.
 */

import { createHash } from 'node:crypto'

/**
 * Compute the lowercase-hex SHA256 digest of a byte sequence.
 * @param bytes - the complete downloaded payload.
 * @returns the 64-character lowercase-hex digest.
 */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/**
 * Compare a computed digest against a registry-published expectation in
 * constant time.
 * @param actual - computed lowercase-hex digest.
 * @param expected - registry-published lowercase-hex digest.
 * @returns whether the two digests match exactly.
 */
export function sha256Matches(actual: string, expected: string): boolean {
  if (actual.length !== 64 || expected.length !== 64) return false
  let difference = 0
  for (let index = 0; index < 64; index++) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index)
  }
  return difference === 0
}
