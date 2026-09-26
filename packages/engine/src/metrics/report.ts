import type { ReportResult } from "./scope.types.js";
import type { Metrics, MetricValue } from "./metrics.interface.js";
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
import { renderJson } from "./render/json.js";
import { renderHuman } from "./render/human.js";
import type { LedgerEntry } from "@vellum/protocol";

/**
 * Metrics computation context: what the caller read from the Ledger, git
 * history and the specs' artifacts. The engine reads none of it itself.
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
  /** Criterion references requirements.md defines (e.g. "1.2") */
  criteria: readonly string[];
  /** Task identifier to the criteria it references (tasks.md trailers) */
  taskCriteria: ReadonlyMap<string, readonly string[]>;
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
 * Computes twelve metrics from the Ledger and git history and renders them.
 * Every metric is an aggregate (a duration, count or ratio), so the report
 * carries no individual identity; a scope that groups by individual is
 * refused before anything is computed. A metric whose computation fails is
 * reported as `unavailable` with the reason, never as zero.
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
        metrics: createUnavailableMetrics(error.message),
        scope: null,
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
    timePerStage: safeComputeRecord(() => computeTimePerStage(context.stateTransitions)),
    reworkRate: safeCompute(() => computeReworkRate(context.entries)),
    gateFailures: safeCompute(() => countGateFailures(context.entries)),
    failureClassCounts: safeComputeRecord(() => countFailureClasses(context.entries)),
    retryCounts: safeCompute(() => countRetries(context.entries)),
    traceabilityCoverage: safeCompute(() =>
      computeTraceabilityCoverage(context.entries, context.criteria, context.taskCriteria),
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
    ...(timeRange ? { timeRange } : {}),
    exitStatus: 0,
    output,
  };
}

/**
 * Compute a metric; a failure is reported as `unavailable` with its reason.
 */
function safeCompute(compute: () => MetricValue): MetricValue {
  try {
    return compute();
  } catch (error) {
    return { kind: "unavailable", reason: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Compute a keyed metric; a failure is reported under the key "unavailable".
 */
function safeComputeRecord(
  compute: () => Record<string, MetricValue>,
): Record<string, MetricValue> {
  try {
    return compute();
  } catch (error) {
    return {
      unavailable: {
        kind: "unavailable",
        reason: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Every metric unavailable, for a refused report.
 */
function createUnavailableMetrics(reason: string): Metrics {
  const none: MetricValue = { kind: "unavailable", reason };
  return {
    leadTime: none,
    cycleTime: none,
    timePerStage: {},
    reworkRate: none,
    gateFailures: none,
    failureClassCounts: {},
    retryCounts: none,
    traceabilityCoverage: none,
    approvalLatency: none,
    amendmentRate: none,
    taskCompletionRate: none,
    releaseRollbackRate: none,
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
