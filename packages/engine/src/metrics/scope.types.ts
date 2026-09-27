/**
 * The aggregation scope for a metrics report.
 *
 * Individual grouping is refused (criterion 1.5). A request that would group
 * by person, session, author, approver, or similar identity must be rejected
 * with exit status 2 before any Ledger read.
 */
export type MetricsScope =
  | { readonly kind: "repository" }
  | { readonly kind: "spec"; readonly specId: string }
  | { readonly kind: "time_period"; readonly from: string; readonly to: string };

/**
 * Individual grouping scope that must be refused.
 *
 * This type exists only to name the error. The Metrics Reporter refuses
 * any scope that groups by individual identity with exit status 2.
 */
export interface ForbiddenIndividualScope {
  readonly kind: "forbidden";
  readonly grouping:
    "individual" | "identity" | "session" | "author" | "approver" | "executor" | "email";
}

/**
 * Input to the Metrics Reporter.
 */
export interface ReportInput {
  /** The scope to aggregate over. */
  readonly scope: MetricsScope | ForbiddenIndividualScope;
  /** Optional spec identifier filter, for repository scope. */
  readonly spec?: string;
  /** Output format. */
  readonly output: "json" | "human";
}

/**
 * Result of the Metrics Reporter.
 */
export interface ReportResult {
  /** Computed metrics. */
  readonly metrics: Metrics;
  /** Scope used; null when the requested scope was refused. */
  readonly scope: MetricsScope | null;
  /** Rendered report; absent when the scope was refused. */
  readonly output?: string;
  /** Specs included in the report. */
  readonly specsIncluded: readonly string[];
  /** Time range covered. */
  readonly timeRange?: { readonly from: string; readonly to: string };
  /** Exit status: 0 on success, 1 on error, 2 on refusal. */
  readonly exitStatus: number;
  /** Error message, if exitStatus is non-zero. */
  readonly error?: string;
}

// Import Metrics from metrics.interface.ts
import type { Metrics } from "./metrics.interface.js";
