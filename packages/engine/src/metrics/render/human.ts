import type { Metrics } from "../metrics.interface.js";
import type { MetricsScope } from "../scope.types.js";
import { formatDuration } from "./format-duration.js";
import { formatRatioHuman } from "./format-ratio.js";

/**
 * Render metrics as human-readable text.
 *
 * Metrics grouped by category (timing, quality, execution, release),
 * using @stackra/console themed output, no identity strings.
 *
 * @param metrics - the metrics to render
 * @param scope - the scope used
 * @param specsIncluded - specs included in the report
 * @param timeRange - optional time range
 * @returns human-readable string
 */
export function renderHuman(
  metrics: Metrics,
  scope: MetricsScope,
  specsIncluded: readonly string[],
  timeRange?: { readonly from: string; readonly to: string },
): string {
  const lines: string[] = [];

  // Header
  lines.push("=== Metrics Report ===");
  lines.push("");
  lines.push(`Scope: ${formatScope(scope)}`);
  lines.push(`Specs included: ${specsIncluded.length}`);

  if (timeRange) {
    lines.push(`Time range: ${timeRange.from} to ${timeRange.to}`);
  }

  lines.push("");

  // Timing metrics
  lines.push("--- Timing ---");
  if (metrics.leadTime.kind === "duration") {
    lines.push(`Lead Time: ${formatDuration(metrics.leadTime.value)}`);
  } else if (metrics.leadTime.kind === "unavailable") {
    lines.push(`Lead Time: unavailable (${metrics.leadTime.reason})`);
  }
  if (metrics.cycleTime.kind === "duration") {
    lines.push(`Cycle Time: ${formatDuration(metrics.cycleTime.value)}`);
  } else if (metrics.cycleTime.kind === "unavailable") {
    lines.push(`Cycle Time: unavailable (${metrics.cycleTime.reason})`);
  }
  if (metrics.approvalLatency.kind === "duration") {
    lines.push(`Approval Latency: ${formatDuration(metrics.approvalLatency.value)}`);
  } else if (metrics.approvalLatency.kind === "unavailable") {
    lines.push(`Approval Latency: unavailable (${metrics.approvalLatency.reason})`);
  }

  // Time per stage
  lines.push("");
  lines.push("Time per Stage:");
  for (const [stage, value] of Object.entries(metrics.timePerStage)) {
    if (value.kind === "duration") {
      lines.push(`  ${stage}: ${formatDuration(value.value)}`);
    } else if (value.kind === "unavailable") {
      lines.push(`  ${stage}: unavailable (${value.reason})`);
    }
  }

  // Quality metrics
  lines.push("");
  lines.push("--- Quality ---");
  if (metrics.reworkRate.kind === "ratio") {
    lines.push(
      `Rework Rate: ${formatRatioHuman(metrics.reworkRate.numerator, metrics.reworkRate.denominator)}`,
    );
  } else if (metrics.reworkRate.kind === "unavailable") {
    lines.push(`Rework Rate: unavailable (${metrics.reworkRate.reason})`);
  }
  if (metrics.gateFailures.kind === "count") {
    lines.push(`Gate Failures: ${metrics.gateFailures.value}`);
  } else if (metrics.gateFailures.kind === "unavailable") {
    lines.push(`Gate Failures: unavailable (${metrics.gateFailures.reason})`);
  }
  if (metrics.traceabilityCoverage.kind === "ratio") {
    lines.push(
      `Traceability Coverage: ${formatRatioHuman(metrics.traceabilityCoverage.numerator, metrics.traceabilityCoverage.denominator)}`,
    );
  } else if (metrics.traceabilityCoverage.kind === "unavailable") {
    lines.push(`Traceability Coverage: unavailable (${metrics.traceabilityCoverage.reason})`);
  }

  // Failure classes
  lines.push("");
  lines.push("Failure Classes:");
  for (const [fc, value] of Object.entries(metrics.failureClassCounts)) {
    if (value.kind === "count") {
      lines.push(`  ${fc}: ${value.value}`);
    } else if (value.kind === "unavailable") {
      lines.push(`  ${fc}: unavailable (${value.reason})`);
    }
  }

  // Execution metrics
  lines.push("");
  lines.push("--- Execution ---");
  if (metrics.retryCounts.kind === "count") {
    lines.push(`Retry Counts: ${metrics.retryCounts.value}`);
  } else if (metrics.retryCounts.kind === "unavailable") {
    lines.push(`Retry Counts: unavailable (${metrics.retryCounts.reason})`);
  }
  if (metrics.taskCompletionRate.kind === "ratio") {
    lines.push(
      `Task Completion Rate: ${formatRatioHuman(metrics.taskCompletionRate.numerator, metrics.taskCompletionRate.denominator)}`,
    );
  } else if (metrics.taskCompletionRate.kind === "unavailable") {
    lines.push(`Task Completion Rate: unavailable (${metrics.taskCompletionRate.reason})`);
  }

  // Release metrics
  lines.push("");
  lines.push("--- Release ---");
  if (metrics.amendmentRate.kind === "ratio") {
    lines.push(
      `Amendment Rate: ${formatRatioHuman(metrics.amendmentRate.numerator, metrics.amendmentRate.denominator)}`,
    );
  } else if (metrics.amendmentRate.kind === "unavailable") {
    lines.push(`Amendment Rate: unavailable (${metrics.amendmentRate.reason})`);
  }
  if (metrics.releaseRollbackRate.kind === "ratio") {
    lines.push(
      `Rollback Rate: ${formatRatioHuman(metrics.releaseRollbackRate.numerator, metrics.releaseRollbackRate.denominator)}`,
    );
  } else if (metrics.releaseRollbackRate.kind === "unavailable") {
    lines.push(`Rollback Rate: unavailable (${metrics.releaseRollbackRate.reason})`);
  }

  return lines.join("\n");
}

function formatScope(scope: MetricsScope): string {
  switch (scope.kind) {
    case "repository":
      return "repository (all specs)";
    case "spec":
      return `spec: ${scope.specId}`;
    case "time_period":
      return `time period: ${scope.from} to ${scope.to}`;
  }
}
