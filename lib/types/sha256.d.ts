/**
 * SHA256 integrity helper for downloaded plugin tarballs. Pure over an input
 * byte sequence so the verification contract is unit-testable without network
 * or filesystem access.
 */
/**
 * Compute the lowercase-hex SHA256 digest of a byte sequence.
 * @param bytes - the complete downloaded payload.
 * @returns the 64-character lowercase-hex digest.
 */
export declare function sha256Hex(bytes: Uint8Array): string;
/**
 * Compare a computed digest against a registry-published expectation in
 * constant time.
 * @param actual - computed lowercase-hex digest.
 * @param expected - registry-published lowercase-hex digest.
 * @returns whether the two digests match exactly.
 */
export declare function sha256Matches(actual: string, expected: string): boolean;
//# sourceMappingURL=sha256.d.ts.map