/**
 * The outcome of one gate check.
 *
 * `not_checked` is what a check reports when the input it needs was not
 * supplied or the check is not implemented: never `pass`. A gate with a
 * `not_checked` check and no failure is inconclusive, not passing.
 */
export type CheckOutcome =
  | { readonly status: "pass" }
  | { readonly status: "fail"; readonly errors: readonly string[] }
  | { readonly status: "not_checked"; readonly reason: string };
