/**
 * Error hierarchy for the Metrics Reporter.
 *
 * Each error class has a stable code (SDLC_METRICS_*) and a message naming
 * the identifiers its criterion requires. Exit status 2 signals refusal,
 * distinct from exit status 1 (error: invalid input, read failure).
 */

/** Base class for all Metrics Reporter errors. */
export abstract class MetricsError extends Error {
  abstract readonly code: string;
  abstract readonly exitStatus: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** Validation errors: scope is invalid or malformed. */
export abstract class MetricsValidationError extends MetricsError {
  readonly exitStatus = 1;
}

/** Refusal errors: request refused for policy reasons. */
export abstract class MetricsRefusalError extends MetricsError {
  readonly exitStatus = 2;
}

/** Read errors: I/O failures reading Ledger or git history. */
export abstract class MetricsReadError extends MetricsError {
  readonly exitStatus = 1;
}

/**
 * Individual grouping is refused (criterion 1.5).
 *
 * A request to group metrics by person, session, author, approver, or similar
 * identity is refused with exit status 2. The error message states that metrics
 * measure the system, not individuals.
 */
export class IndividualGroupingRefusalError extends MetricsRefusalError {
  readonly code = "SDLC_METRICS_INDIVIDUAL_GROUPING_REFUSED";
  readonly grouping: string;

  constructor(grouping: string) {
    super(`Metrics measure the system, not individuals. Grouping by "${grouping}" is refused.`);
    this.grouping = grouping;
  }
}

/**
 * The requested scope is invalid.
 *
 * Examples: malformed spec identifier, invalid time range, unrecognized scope kind.
 */
export class InvalidScopeError extends MetricsValidationError {
  readonly code = "SDLC_METRICS_INVALID_SCOPE";

  constructor(message: string) {
    super(message);
  }
}

/**
 * The requested scope contains no specs.
 *
 * Examples: a spec filter that names no spec in the repository, a time period
 * covering no entries.
 */
export class ScopeEmptyError extends MetricsValidationError {
  readonly code = "SDLC_METRICS_SCOPE_EMPTY";

  constructor(message: string) {
    super(message);
  }
}

/**
 * The Ledger file cannot be read.
 *
 * Propagated from Slice 1's Ledger Reader with no transformation.
 */
export class LedgerReadError extends MetricsReadError {
  readonly code = "SDLC_METRICS_LEDGER_READ_ERROR";

  constructor(
    message: string,
    public override readonly cause?: Error,
  ) {
    super(message);
  }
}

/**
 * Git history cannot be read.
 *
 * Propagated from Slice 1's Git Reader with no transformation.
 */
export class GitReadError extends MetricsReadError {
  readonly code = "SDLC_METRICS_GIT_READ_ERROR";

  constructor(
    message: string,
    public override readonly cause?: Error,
  ) {
    super(message);
  }
}
