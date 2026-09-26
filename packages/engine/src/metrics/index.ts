/**
 * Metrics Reporter - Slice 4 of the Vellum Platform
 *
 * Computes twelve metrics from the Ledger and git history, aggregates by scope,
 * and produces reports holding no individual identity.
 *
 * @packageDocumentation
 */

// Main entry point
export { report, type MetricsContext } from "./report.js";

// Types
export type { Metrics, MetricValue } from "./metrics.interface.js";
export type {
  MetricsScope,
  ForbiddenIndividualScope,
  ReportInput,
  ReportResult,
} from "./scope.types.js";
export type { ReportMetadata } from "./report-input.interface.js";

// Errors
export {
  MetricsError,
  MetricsValidationError,
  MetricsRefusalError,
  MetricsReadError,
  IndividualGroupingRefusalError,
  InvalidScopeError,
  ScopeEmptyError,
  LedgerReadError,
  GitReadError,
} from "./errors.js";

// Validator
export { parseScope, validateScope } from "./validator.js";

// Metric computation functions
export { computeLeadTime } from "./lead-time.js";
export { computeCycleTime } from "./cycle-time.js";
export { computeTimePerStage, type LifecycleStage } from "./stage-time.js";
export { computeReworkRate } from "./rework-rate.js";
export { countGateFailures } from "./gate-failures.js";
export { countFailureClasses, type FailureClass } from "./failure-classes.js";
export { countRetries } from "./retry-counts.js";
export { computeTraceabilityCoverage, countCriteria } from "./traceability.js";
export { computeApprovalLatency } from "./approval-latency.js";
export { computeAmendmentRate } from "./amendment-rate.js";
export { computeTaskCompletionRate } from "./task-completion.js";
export { computeRollbackRate } from "./rollback-rate.js";

// Aggregator
export {
  aggregateMetricValues,
  aggregateRecordMetricValues,
  getAggregationMethod,
  type AggregationMethod,
} from "./aggregator.js";

// Anonymizer
export { anonymize, stripIdentity, containsIdentity } from "./anonymizer.js";

// Renderers
export { renderJson } from "./render/json.js";
export { renderHuman } from "./render/human.js";
export { formatDuration, formatDurationISO } from "./render/format-duration.js";
export { formatPercentage, formatRatio, formatRatioHuman } from "./render/format-ratio.js";
