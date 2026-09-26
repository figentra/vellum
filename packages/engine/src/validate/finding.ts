/**
 * Protocol Validator Finding
 *
 * Represents a single validation finding reported by the Protocol Validator.
 *
 * @module vellum/protocol-validator/finding
 */

import { RuleIdentifier } from "./rules";

/**
 * A finding from protocol validation.
 *
 * Each finding represents a specific rule violation found during validation.
 * Findings are ordered by file path, then line, then rule identifier.
 */
export interface Finding {
  /** The file path relative to the repository root */
  readonly file: string;

  /** The line number where the finding occurs (1-based) */
  readonly line: number;

  /** The stable rule identifier for this finding */
  readonly rule: RuleIdentifier;

  /** Human-readable message describing the finding */
  readonly message: string;

  /** Optional column number for more precise location */
  readonly column?: number;

  /** Optional context showing the relevant portion of the line */
  readonly context?: string;
}

/**
 * Compare two findings for ordering.
 *
 * Order: file path (ascending), then line (ascending), then rule identifier (ascending).
 */
export function compareFindings(a: Finding, b: Finding): number {
  // First by file path
  if (a.file < b.file) return -1;
  if (a.file > b.file) return 1;

  // Then by line number
  if (a.line < b.line) return -1;
  if (a.line > b.line) return 1;

  // Finally by rule identifier (string comparison)
  if (a.rule < b.rule) return -1;
  if (a.rule > b.rule) return 1;

  return 0;
}

/**
 * Sort an array of findings in place.
 *
 * Findings are ordered by file path, then line, then rule identifier.
 */
export function sortFindings(findings: Finding[]): void {
  findings.sort(compareFindings);
}
