/**
 * One metric value.
 *
 * Durations are in milliseconds. Counts are integers. Ratios have numerator
 * and denominator fields to preserve precision and allow ratio-of-sums aggregation.
 */
export type MetricValue =
  | { readonly kind: "duration"; readonly value: number }
  | { readonly kind: "count"; readonly value: number }
  | { readonly kind: "ratio"; readonly numerator: number; readonly denominator: number };

/**
 * The twelve metrics computed from the Ledger and git history.
 *
 * Each metric is computed on demand from repository content, aggregated by scope,
 * and holds no individual identity (criterion 1.4).
 */
export interface Metrics {
  /**
   * Duration from first artifact creation to release, in milliseconds.
   * Measures total lifecycle time from first commit on the spec to deployed release.
   */
  readonly leadTime: MetricValue;

  /**
   * Duration from plan approval to merge, in milliseconds.
   * Measures development throughput after planning is complete.
   */
  readonly cycleTime: MetricValue;

  /**
   * Duration per lifecycle stage, keyed by state name, in milliseconds.
   * Stages: draft, in_progress, in_review, approved, merged, released.
   * Skipped stages are absent from the output.
   */
  readonly timePerStage: Record<string, MetricValue>;

  /**
   * Ratio of amended artifacts to total artifacts.
   * An artifact is amended if the Ledger holds an amendment entry for it.
   */
  readonly reworkRate: MetricValue;

  /**
   * Count of gate_result entries with status fail.
   * Measures quality gate rejections.
   */
  readonly gateFailures: MetricValue;

  /**
   * Count of failures by failure_class.
   * Keys: environment, dependency, test_failure, protocol_violation,
   * spec_ambiguous, external_service, timeout, unknown.
   */
  readonly failureClassCounts: Record<string, MetricValue>;

  /**
   * Count of attempt entries with outcome retry or escalated.
   * Per Assumption 1, includes retry and Escalated Attempts from spec 037.
   */
  readonly retryCounts: MetricValue;

  /**
   * Ratio of criteria with evidence to total criteria.
   * Computed from requirements.md criterion count and Ledger evidence entries.
   */
  readonly traceabilityCoverage: MetricValue;

  /**
   * Duration from artifact creation to approval, in milliseconds.
   * Measures how long approvals wait in review.
   */
  readonly approvalLatency: MetricValue;

  /**
   * Ratio of amendments to approved artifacts.
   * An amendment is a Ledger entry of kind amendment.
   * An approved artifact has at least one Valid Approval.
   */
  readonly amendmentRate: MetricValue;

  /**
   * Ratio of tasks with evidence (exit_status 0) to required tasks.
   * A task with evidence exit 1 then evidence exit 0 counts as completed.
   */
  readonly taskCompletionRate: MetricValue;

  /**
   * Ratio of rolled-back releases to total releases.
   * A rollback is a release of type rollback or release followed by rollback within 24h.
   */
  readonly releaseRollbackRate: MetricValue;
}
