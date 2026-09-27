// MetricValue used in IntermediateMetricValue

/**
 * Metadata for a metrics report.
 *
 * Describes what was included in the computation, when it ran,
 * and what content it was derived from.
 */
export interface ReportMetadata {
  /** Spec identifiers included in the aggregation. */
  readonly specsIncluded: readonly string[];
  /** Time range covered by the report, if time-bounded. */
  readonly timeRange?: { readonly from: string; readonly to: string };
  /** UTC ISO 8601 timestamp when the report was generated. */
  readonly generatedAt: string;
  /** Git commit SHA the report was generated from. */
  readonly generatedFrom: string;
}

/**
 * An intermediate metric value that may carry identity fields.
 *
 * The anonymizer strips these before aggregation. Each metric computation
 * function must name every identity field it reads.
 */
export interface IntermediateMetricValue {
  readonly value: number;
  /** Identity fields that contributed to this value, to be stripped. */
  readonly identities?: readonly string[];
}

/**
 * Intermediate result from metric computation, before anonymization.
 *
 * The anonymizer receives this shape from per-metric computation and returns
 * the same shape with identity fields removed.
 */
export interface IntermediateResult {
  /** Lead time per spec, keyed by spec identifier. */
  readonly leadTimePerSpec?: ReadonlyMap<string, IntermediateMetricValue>;
  /** Cycle time per spec. */
  readonly cycleTimePerSpec?: ReadonlyMap<string, IntermediateMetricValue>;
  /** Time per stage per spec. */
  readonly timePerStagePerSpec?: ReadonlyMap<string, Record<string, IntermediateMetricValue>>;
  /** Rework details, including artifact paths and amender identities. */
  readonly reworkDetails?: IntermediateReworkDetails;
  /** Gate failure details, including gate identifiers. */
  readonly gateFailureDetails?: IntermediateGateFailureDetails;
  /** Failure class breakdown. */
  readonly failureClassDetails?: IntermediateFailureClassDetails;
  /** Retry counts per task, including session identifiers. */
  readonly retryDetails?: IntermediateRetryDetails;
  /** Traceability details per criterion. */
  readonly traceabilityDetails?: IntermediateTraceabilityDetails;
  /** Approval latency per artifact, including approver identity. */
  readonly approvalLatencyDetails?: IntermediateApprovalDetails;
  /** Amendment details. */
  readonly amendmentDetails?: IntermediateAmendmentDetails;
  /** Task completion details per task, including executor identity. */
  readonly taskCompletionDetails?: IntermediateTaskCompletionDetails;
  /** Release and rollback details. */
  readonly releaseDetails?: IntermediateReleaseDetails;
}

/** Rework details intermediate structure. */
export interface IntermediateReworkDetails {
  readonly amendedArtifacts: readonly string[];
  readonly totalArtifacts: number;
}

/** Gate failure details intermediate structure. */
export interface IntermediateGateFailureDetails {
  readonly failures: readonly { readonly gateId: string; readonly timestamp: string }[];
}

/** Failure class details intermediate structure. */
export interface IntermediateFailureClassDetails {
  readonly counts: Record<string, number>;
}

/** Retry details intermediate structure. */
export interface IntermediateRetryDetails {
  readonly retries: readonly { readonly taskId: string; readonly outcome: string }[];
}

/** Traceability details intermediate structure. */
export interface IntermediateTraceabilityDetails {
  readonly criteriaTotal: number;
  readonly criteriaWithEvidence: number;
}

/** Approval latency details intermediate structure. */
export interface IntermediateApprovalDetails {
  readonly approvals: readonly {
    readonly artifactPath: string;
    readonly latency: number;
  }[];
}

/** Amendment details intermediate structure. */
export interface IntermediateAmendmentDetails {
  readonly amendmentCount: number;
  readonly approvedArtifactCount: number;
}

/** Task completion details intermediate structure. */
export interface IntermediateTaskCompletionDetails {
  readonly tasksWithEvidence: readonly string[];
  readonly requiredTasks: readonly string[];
}

/** Release and rollback details intermediate structure. */
export interface IntermediateReleaseDetails {
  readonly releases: readonly { readonly version: string; readonly timestamp: string }[];
  readonly rollbacks: readonly { readonly version: string; readonly timestamp: string }[];
}
