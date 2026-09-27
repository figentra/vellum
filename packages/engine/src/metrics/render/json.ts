import type { Metrics, MetricValue } from "../metrics.interface.js";
import type { MetricsScope } from "../scope.types.js";

/**
 * Render metrics as JSON with fixed key order.
 *
 * Keys are ordered: scope first, metrics keys alphabetical,
 * time_per_stage in lifecycle order, failure_class_counts alphabetical,
 * specs_included sorted.
 *
 * Output is byte-stable across two runs with identical inputs.
 *
 * @param metrics - the metrics to render
 * @param scope - the scope used
 * @param specsIncluded - specs included in the report
 * @param timeRange - optional time range
 * @returns JSON string
 */
export function renderJson(
  metrics: Metrics,
  scope: MetricsScope,
  specsIncluded: readonly string[],
  timeRange?: { readonly from: string; readonly to: string },
): string {
  const output: Record<string, unknown> = {
    scope: serializeScope(scope),
    metrics: serializeMetrics(metrics),
    specsIncluded: [...specsIncluded].sort(),
  };

  if (timeRange) {
    output.timeRange = {
      from: timeRange.from,
      to: timeRange.to,
    };
  }

  return JSON.stringify(output, null, 2);
}

function serializeScope(scope: MetricsScope): Record<string, unknown> {
  switch (scope.kind) {
    case "repository":
      return { kind: "repository" };
    case "spec":
      return { kind: "spec", specId: scope.specId };
    case "time_period":
      return { kind: "time_period", from: scope.from, to: scope.to };
  }
}

function serializeMetrics(metrics: Metrics): Record<string, unknown> {
  // Alphabetical order for metric keys
  const keys: (keyof Metrics)[] = [
    "amendmentRate",
    "approvalLatency",
    "cycleTime",
    "failureClassCounts",
    "gateFailures",
    "leadTime",
    "releaseRollbackRate",
    "reworkRate",
    "retryCounts",
    "taskCompletionRate",
    "timePerStage",
    "traceabilityCoverage",
  ];

  const result: Record<string, unknown> = {};

  for (const key of keys) {
    const value = metrics[key];

    if (key === "timePerStage" || key === "failureClassCounts") {
      // Serialize record in specific order
      result[key] = serializeRecordMetric(value as Record<string, MetricValue>, key);
    } else {
      result[key] = serializeMetricValue(value as MetricValue);
    }
  }

  return result;
}

function serializeMetricValue(value: MetricValue): Record<string, unknown> {
  switch (value.kind) {
    case "duration":
      return { kind: "duration", value: value.value };
    case "count":
      return { kind: "count", value: value.value };
    case "ratio":
      return { kind: "ratio", numerator: value.numerator, denominator: value.denominator };
    case "unavailable":
      return { kind: "unavailable", reason: value.reason };
  }
}

function serializeRecordMetric(
  record: Record<string, MetricValue>,
  key: keyof Metrics,
): Record<string, unknown> {
  // Define order based on key
  let order: string[];

  if (key === "timePerStage") {
    // Lifecycle order
    order = ["draft", "in_progress", "in_review", "approved", "merged", "released", "unavailable"];
  } else {
    // Alphabetical order
    order = Object.keys(record).sort();
  }

  const result: Record<string, unknown> = {};

  for (const k of order) {
    if (k in record) {
      const val = record[k];
      if (val) {
        result[k] = serializeMetricValue(val);
      }
    }
  }

  return result;
}
