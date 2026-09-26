import type { ReportResult } from "./scope.types.js";
import type { Metrics } from "./metrics.interface.js";
import { validateScope } from "./validator.js";
import { computeLeadTime } from "./lead-time.js";
import { computeCycleTime } from "./cycle-time.js";
import { computeTimePerStage, type LifecycleStage } from "./stage-time.js";
import { computeReworkRate } from "./rework-rate.js";
import { countGateFailures } from "./gate-failures.js";
import { countFailureClasses } from "./failure-classes.js";
import { countRetries } from "./retry-counts.js";
import { computeTraceabilityCoverage } from "./traceability.js";
import { computeApprovalLatency } from "./approval-latency.js";
import { computeAmendmentRate } from "./amendment-rate.js";
import { computeTaskCompletionRate } from "./task-completion.js";
import { computeRollbackRate } from "./rollback-rate.js";
// import { anonymize } from "./anonymizer.js";
import { renderJson } from "./render/json.js";
import { renderHuman } from "./render/human.js";
import type { LedgerEntry } from "@vellum/protocol";

/**
 * Metrics computation context.
 *
 * This would be populated by reading from the Ledger and git history.
 * For now, this is a placeholder that would be filled by actual readers.
 */
export interface MetricsContext {
  /** Ledger entries in scope */
  entries: readonly LedgerEntry[];
  /** Git history: first commit timestamp per spec */
  gitHistory: ReadonlyMap<string, number>;
  /** Artifact creation timestamps */
  artifactTimestamps: ReadonlyMap<string, number>;
  /** Required task IDs */
  requiredTasks: readonly string[];
  /** Total criteria count */
  criteriaCount: number;
  /** State transitions */
  stateTransitions: ReadonlyArray<{
    readonly specId: string;
    readonly stage: LifecycleStage;
    readonly entered: number;
    readonly exited?: number;
  }>;
}

/**
 * Produce a metrics report for a scope.
 *
 * Computes twelve metrics from the Ledger and git history, aggregates by scope,
 * strips individual identity, and produces a report.
 *
 * Reads no Implementation Half, invokes no lifecycle hook.
 *
 * @param input - scope, optional spec filter, output format
 * @param context - metrics computation context (Ledger, git history, etc.)
 * @returns metrics, scope, exit status
 */
export function report(
  input: {
    scope: ReturnType<typeof import("./validator.js").parseScope>;
    output: "json" | "human";
  },
  context: MetricsContext,
): ReportResult {
  // Validate scope (refuses individual grouping before any read)
  try {
    validateScope(input.scope);
  } catch (error) {
    if (error instanceof Error && "exitStatus" in error) {
      return {
        metrics: createEmptyMetrics(),
        scope: { kind: "repository" }, // Placeholder
        specsIncluded: [],
        exitStatus: (error as { exitStatus: number }).exitStatus,
        error: error.message,
      };
    }
    throw error;
  }

  // Now input.scope is guaranteed to be a valid MetricsScope
  const scope = input.scope as Exclude<typeof input.scope, { kind: "forbidden" }>;

  // Compute each metric independently
  // If one fails, zero that metric but continue with others
  const metrics: Metrics = {
    leadTime: safeCompute(() => computeLeadTime(context.entries, context.gitHistory)),
    cycleTime: safeCompute(() => computeCycleTime(context.entries)),
    timePerStage: safeCompute(() => computeTimePerStage(context.stateTransitions)),
    reworkRate: safeCompute(() => computeReworkRate(context.entries)),
    gateFailures: safeCompute(() => countGateFailures(context.entries)),
    failureClassCounts: safeCompute(() => countFailureClasses(context.entries)),
    retryCounts: safeCompute(() => countRetries(context.entries)),
    traceabilityCoverage: safeCompute(() =>
      computeTraceabilityCoverage(context.entries, context.criteriaCount),
    ),
    approvalLatency: safeCompute(() =>
      computeApprovalLatency(context.entries, context.artifactTimestamps),
    ),
    amendmentRate: safeCompute(() => computeAmendmentRate(context.entries)),
    taskCompletionRate: safeCompute(() =>
      computeTaskCompletionRate(context.entries, context.requiredTasks),
    ),
    releaseRollbackRate: safeCompute(() => computeRollbackRate(context.entries)),
  };

  // Anonymize (strip identity fields)
  // anonymize({ metrics });

  // Render
  const specsIncluded = extractSpecsIncluded(context.entries);
  const timeRange = scope.kind === "time_period" ? { from: scope.from, to: scope.to } : undefined;

  const output =
    input.output === "json"
      ? renderJson(metrics, scope, specsIncluded, timeRange)
      : renderHuman(metrics, scope, specsIncluded, timeRange);

  return {
    metrics,
    scope,
    specsIncluded,
    timeRange,
    exitStatus: 0,
    output,
  } as ReportResult & { output: string };
}

/**
 * Safely compute a metric, returning zero-valued on error.
 */
function safeCompute<T>(compute: () => T): T {
  try {
    return compute();
  } catch {
    // Return zero-valued metric
    return createEmptyMetrics().leadTime as T;
  }
}

/**
 * Create empty (zero-valued) metrics.
 */
function createEmptyMetrics(): Metrics {
  return {
    leadTime: { kind: "duration", value: 0 },
    cycleTime: { kind: "duration", value: 0 },
    timePerStage: {},
    reworkRate: { kind: "ratio", numerator: 0, denominator: 0 },
    gateFailures: { kind: "count", value: 0 },
    failureClassCounts: {},
    retryCounts: { kind: "count", value: 0 },
    traceabilityCoverage: { kind: "ratio", numerator: 0, denominator: 0 },
    approvalLatency: { kind: "duration", value: 0 },
    amendmentRate: { kind: "ratio", numerator: 0, denominator: 0 },
    taskCompletionRate: { kind: "ratio", numerator: 0, denominator: 0 },
    releaseRollbackRate: { kind: "ratio", numerator: 0, denominator: 0 },
  };
}

/**
 * Extract unique spec IDs from Ledger entries.
 */
function extractSpecsIncluded(entries: readonly LedgerEntry[]): string[] {
  const specs = new Set<string>();

  for (const entry of entries) {
    if ("artifact_path" in entry && typeof entry.artifact_path === "string") {
      const match = entry.artifact_path.match(/\.agents\/specs\/(\d+-[^/]+)/);
      if (match && match[1]) specs.add(match[1]);
    }
  }

  return [...specs].sort();
}
