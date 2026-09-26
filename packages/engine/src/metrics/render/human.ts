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
  }
  if (metrics.cycleTime.kind === "duration") {
    lines.push(`Cycle Time: ${formatDuration(metrics.cycleTime.value)}`);
  }
  if (metrics.approvalLatency.kind === "duration") {
    lines.push(`Approval Latency: ${formatDuration(metrics.approvalLatency.value)}`);
  }

  // Time per stage
  lines.push("");
  lines.push("Time per Stage:");
  for (const [stage, value] of Object.entries(metrics.timePerStage)) {
    if (value.kind === "duration") {
      lines.push(`  ${stage}: ${formatDuration(value.value)}`);
    }
  }

  // Quality metrics
  lines.push("");
  lines.push("--- Quality ---");
  if (metrics.reworkRate.kind === "ratio") {
    lines.push(
      `Rework Rate: ${formatRatioHuman(metrics.reworkRate.numerator, metrics.reworkRate.denominator)}`,
    );
  }
  if (metrics.gateFailures.kind === "count") {
    lines.push(`Gate Failures: ${metrics.gateFailures.value}`);
  }
  if (metrics.traceabilityCoverage.kind === "ratio") {
    lines.push(
      `Traceability Coverage: ${formatRatioHuman(metrics.traceabilityCoverage.numerator, metrics.traceabilityCoverage.denominator)}`,
    );
  }

  // Failure classes
  lines.push("");
  lines.push("Failure Classes:");
  for (const [fc, value] of Object.entries(metrics.failureClassCounts)) {
    if (value.kind === "count") {
      lines.push(`  ${fc}: ${value.value}`);
    }
  }

  // Execution metrics
  lines.push("");
  lines.push("--- Execution ---");
  if (metrics.retryCounts.kind === "count") {
    lines.push(`Retry Counts: ${metrics.retryCounts.value}`);
  }
  if (metrics.taskCompletionRate.kind === "ratio") {
    lines.push(
      `Task Completion Rate: ${formatRatioHuman(metrics.taskCompletionRate.numerator, metrics.taskCompletionRate.denominator)}`,
    );
  }

  // Release metrics
  lines.push("");
  lines.push("--- Release ---");
  if (metrics.amendmentRate.kind === "ratio") {
    lines.push(
      `Amendment Rate: ${formatRatioHuman(metrics.amendmentRate.numerator, metrics.amendmentRate.denominator)}`,
    );
  }
  if (metrics.releaseRollbackRate.kind === "ratio") {
    lines.push(
      `Rollback Rate: ${formatRatioHuman(metrics.releaseRollbackRate.numerator, metrics.releaseRollbackRate.denominator)}`,
    );
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
