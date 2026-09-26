/**
 * @vellum/engine — Determinism Verification
 *
 * Ensures output is deterministic and reproducible.
 * Pure functions - no I/O.
 *
 * @see design.md Criterion 15
 */

import type { Finding } from "@vellum/protocol";
import { sha256Hex } from "@vellum/protocol";

/**
 * Verify that output is byte-identical for same input.
 * Criterion 15.1: Byte-identical output for same commit
 */
export function verifyDeterminism(
  output1: string,
  output2: string,
): { deterministic: boolean; reason?: string } {
  if (output1 === output2) {
    return { deterministic: true };
  }

  // Find first difference
  for (let i = 0; i < Math.max(output1.length, output2.length); i++) {
    if (output1[i] !== output2[i]) {
      return {
        deterministic: false,
        reason: `Output differs at position ${i}: '${output1[i] ?? "EOF"}' vs '${output2[i] ?? "EOF"}'`,
      };
    }
  }

  return { deterministic: false, reason: "Lengths differ" };
}

/**
 * Sort findings by (file, line, rule).
 * Criterion 15.2: Findings ordered by file, line, rule identifier
 */
export function sortFindings(findings: readonly Finding[]): readonly Finding[] {
  return [...findings].sort((a, b) => {
    // Sort by file
    if (a.file < b.file) return -1;
    if (a.file > b.file) return 1;

    // Then by line
    if (a.line < b.line) return -1;
    if (a.line > b.line) return 1;

    // Then by rule
    if (a.rule < b.rule) return -1;
    if (a.rule > b.rule) return 1;

    return 0;
  });
}

/**
 * Verify that findings are sorted deterministically.
 */
export function verifyFindingsSorted(findings: readonly Finding[]): boolean {
  for (let i = 1; i < findings.length; i++) {
    const prev = findings[i - 1];
    const curr = findings[i];

    if (!prev || !curr) continue;

    // Check ordering
    if (prev.file > curr.file) return false;
    if (prev.file === curr.file && prev.line > curr.line) return false;
    if (prev.file === curr.file && prev.line === curr.line && prev.rule > curr.rule) {
      return false;
    }
  }

  return true;
}

/**
 * Compute a deterministic hash of output: its SHA-256, hex-encoded.
 *
 * The engine may not import `node:crypto`, so it uses the protocol's
 * sha256Hex — the same function behind ledger digests.
 */
export function computeOutputHash(output: string): string {
  return sha256Hex(output);
}

/**
 * Check that consecutive runs produce identical output.
 */
export function verifyReproducibility(runs: readonly string[]): {
  reproducible: boolean;
  hashes: readonly string[];
} {
  const hashes = runs.map(computeOutputHash);
  const uniqueHashes = new Set(hashes);

  return {
    reproducible: uniqueHashes.size === 1,
    hashes: Object.freeze(hashes),
  };
}

/**
 * Ensure stable ordering across different platforms.
 * Forces deterministic iteration order.
 */
export function stabilizeOrder<T>(items: readonly T[], keyFn: (item: T) => string): readonly T[] {
  return [...items].sort((a, b) => {
    const keyA = keyFn(a);
    const keyB = keyFn(b);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  });
}
