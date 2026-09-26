/**
 * Value Comparator - compares presented vs executed values.
 *
 * @see requirements.md Requirement 7.3
 */

import type { ReleaseConfirmation } from "./release-presenter";

/**
 * Value comparison result.
 */
export interface ValueComparisonResult {
  /** Whether values match */
  match: boolean;
  /** Mismatched fields */
  mismatches: {
    field: keyof ReleaseConfirmation;
    presented: unknown;
    executed: unknown;
  }[];
}

/**
 * Compare presented values to executed values.
 *
 * @param presented - Values shown to human
 * @param executed - Values about to be executed
 * @returns Comparison result
 */
export function compareReleaseValues(
  presented: ReleaseConfirmation,
  executed: ReleaseConfirmation,
): ValueComparisonResult {
  const mismatches: ValueComparisonResult["mismatches"] = [];

  const fields: (keyof ReleaseConfirmation)[] = [
    "package_name",
    "version",
    "commit",
    "tag",
    "environment",
    "migrations",
  ];

  for (const field of fields) {
    const presentedValue = presented[field];
    const executedValue = executed[field];

    // Compare arrays element-by-element
    if (Array.isArray(presentedValue) && Array.isArray(executedValue)) {
      if (JSON.stringify(presentedValue) !== JSON.stringify(executedValue)) {
        mismatches.push({
          field,
          presented: presentedValue,
          executed: executedValue,
        });
      }
    } else if (presentedValue !== executedValue) {
      mismatches.push({
        field,
        presented: presentedValue,
        executed: executedValue,
      });
    }
  }

  return {
    match: mismatches.length === 0,
    mismatches,
  };
}

/**
 * Format value mismatch for display.
 *
 * @param mismatch - Mismatch information
 * @returns Formatted string
 */
export function formatMismatch(mismatch: {
  field: string;
  presented: unknown;
  executed: unknown;
}): string {
  return `  ${mismatch.field}:
    Presented: ${JSON.stringify(mismatch.presented)}
    Executed:  ${JSON.stringify(mismatch.executed)}`;
}

/**
 * Format all mismatches for display.
 *
 * @param result - Comparison result
 * @returns Formatted string
 */
export function formatMismatches(result: ValueComparisonResult): string {
  if (result.match) {
    return "All values match";
  }

  const lines = ["Value mismatch detected:", ""];
  for (const mismatch of result.mismatches) {
    lines.push(formatMismatch(mismatch));
  }
  lines.push("", "Release aborted");

  return lines.join("\n");
}
