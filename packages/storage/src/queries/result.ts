/**
 * What a query returns: a value, or why it is INCONCLUSIVE (exit status 2)
 * before it examined anything.
 */

import { EXIT_STATUS, type ExitStatus } from "@vellum/protocol";

export type QueryResult<T> =
  | { readonly kind: "ok"; readonly value: T }
  | { readonly kind: "inconclusive"; readonly message: string };

/** A PASS / FAIL / INCONCLUSIVE outcome as an exit status (criterion 3.x). */
export type Outcome = "PASS" | "FAIL" | "INCONCLUSIVE";

export function outcomeExitStatus(outcome: Outcome): ExitStatus {
  return outcome === "PASS"
    ? EXIT_STATUS.SUCCESS
    : outcome === "FAIL"
      ? EXIT_STATUS.FAILURE
      : EXIT_STATUS.INCONCLUSIVE;
}
