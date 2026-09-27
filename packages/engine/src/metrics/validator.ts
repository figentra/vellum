import { IndividualGroupingRefusalError, InvalidScopeError } from "./errors.js";
import type { MetricsScope, ForbiddenIndividualScope } from "./scope.types.js";

/**
 * Forbidden grouping kinds.
 *
 * Any scope that would group by one of these dimensions is refused before
 * any Ledger read (criterion 1.5).
 */
const FORBIDDEN_GROUPINGS = [
  "individual",
  "identity",
  "session",
  "author",
  "approver",
  "executor",
  "email",
] as const;

/**
 * Parse a scope string into a MetricsScope.
 *
 * Formats:
 * - "repository" → { kind: "repository" }
 * - "spec:NNN-slug" → { kind: "spec", specId: "NNN-slug" }
 * - "time_period:FROM/TO" → { kind: "time_period", from: FROM, to: TO }
 *
 * If the string contains a forbidden grouping kind, returns ForbiddenIndividualScope.
 *
 * @param scopeString - the scope argument from CLI
 * @returns MetricsScope or ForbiddenIndividualScope
 * @throws InvalidScopeError if the scope string is malformed
 */
export function parseScope(scopeString: string): MetricsScope | ForbiddenIndividualScope {
  // Check for forbidden grouping in the string
  for (const forbidden of FORBIDDEN_GROUPINGS) {
    if (scopeString.startsWith(`${forbidden}:`) || scopeString === forbidden) {
      return { kind: "forbidden", grouping: forbidden };
    }
  }

  if (scopeString === "repository") {
    return { kind: "repository" };
  }

  if (scopeString.startsWith("spec:")) {
    const specId = scopeString.slice(5);
    if (!specId) {
      throw new InvalidScopeError("Spec identifier is required after 'spec:'");
    }
    return { kind: "spec", specId };
  }

  if (scopeString.startsWith("time_period:")) {
    const timeRange = scopeString.slice(12);
    const parts = timeRange.split("/");
    if (parts.length !== 2) {
      throw new InvalidScopeError(
        `Time period must be in format "time_period:FROM/TO", got "${scopeString}"`,
      );
    }
    const [from, to] = parts;
    if (!from || !to) {
      throw new InvalidScopeError(
        `Time period must specify both FROM and TO, got "${scopeString}"`,
      );
    }
    return { kind: "time_period", from, to };
  }

  throw new InvalidScopeError(
    `Unrecognized scope: "${scopeString}". Expected "repository", "spec:NNN-slug", or "time_period:FROM/TO"`,
  );
}

/**
 * Validate a scope for forbidden individual grouping.
 *
 * If the scope groups by individual identity (criterion 1.5), raises
 * IndividualGroupingRefusalError with exit status 2. This check runs
 * before any Ledger read.
 *
 * @param scope - the scope to validate
 * @throws IndividualGroupingRefusalError if scope groups by individual
 */
export function validateScope(scope: MetricsScope | ForbiddenIndividualScope): void {
  if (scope.kind === "forbidden") {
    throw new IndividualGroupingRefusalError(scope.grouping);
  }
  // Valid scopes pass through without error
}
