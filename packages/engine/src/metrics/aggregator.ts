import type { MetricValue, Metrics } from "./metrics.interface.js";

/**
 * Aggregation method for each metric type.
 *
 * Durations average across specs.
 * Counts sum.
 * Ratios are ratio-of-sums (sum numerators, sum denominators, then divide).
 */
export type AggregationMethod = "average" | "sum" | "ratio_of_sums";

/**
 * Aggregation method for each metric.
 *
 * Per design section "Aggregation Methods per Metric":
 * - Lead time: average
 * - Cycle time: average
 * - Time per stage: average per key
 * - Rework rate: ratio_of_sums
 * - Gate failures: sum
 * - Failure class counts: sum per key
 * - Retry counts: sum
 * - Traceability coverage: ratio_of_sums
 * - Approval latency: average
 * - Amendment rate: ratio_of_sums
 * - Task completion rate: ratio_of_sums
 * - Release rollback rate: ratio_of_sums
 */
const AGGREGATION_METHODS: Record<keyof Metrics, AggregationMethod> = {
  leadTime: "average",
  cycleTime: "average",
  timePerStage: "average", // Special: per-key
  reworkRate: "ratio_of_sums",
  gateFailures: "sum",
  failureClassCounts: "sum", // Special: per-key
  retryCounts: "sum",
  traceabilityCoverage: "ratio_of_sums",
  approvalLatency: "average",
  amendmentRate: "ratio_of_sums",
  taskCompletionRate: "ratio_of_sums",
  releaseRollbackRate: "ratio_of_sums",
};

/**
 * Aggregate an array of MetricValues using the specified method.
 *
 * @param values - array of MetricValues to aggregate
 * @param method - aggregation method
 * @returns aggregated MetricValue
 */
export function aggregateMetricValues(
  values: readonly MetricValue[],
  method: AggregationMethod,
): MetricValue {
  if (values.length === 0) {
    // Return zero-valued metric based on method
    if (method === "average" || method === "sum") {
      const first = values[0];
      if (first && first.kind === "duration") {
        return { kind: "duration", value: 0 };
      }
      return { kind: "count", value: 0 };
    }
    return { kind: "ratio", numerator: 0, denominator: 0 };
  }

  // Filter by kind
  const durations = values.filter(
    (v): v is { kind: "duration"; value: number } => v.kind === "duration",
  );
  const counts = values.filter((v): v is { kind: "count"; value: number } => v.kind === "count");
  const ratios = values.filter(
    (v): v is { kind: "ratio"; numerator: number; denominator: number } => v.kind === "ratio",
  );

  if (method === "average") {
    if (durations.length > 0) {
      const avg = durations.reduce((sum, v) => sum + v.value, 0) / durations.length;
      return { kind: "duration", value: avg };
    }
    if (counts.length > 0) {
      const avg = counts.reduce((sum, v) => sum + v.value, 0) / counts.length;
      return { kind: "count", value: avg };
    }
  }

  if (method === "sum") {
    if (counts.length > 0) {
      const sum = counts.reduce((total, v) => total + v.value, 0);
      return { kind: "count", value: sum };
    }
  }

  if (method === "ratio_of_sums") {
    if (ratios.length > 0) {
      const numeratorSum = ratios.reduce((sum, v) => sum + v.numerator, 0);
      const denominatorSum = ratios.reduce((sum, v) => sum + v.denominator, 0);
      return { kind: "ratio", numerator: numeratorSum, denominator: denominatorSum };
    }
  }

  // Fallback
  return values[0] ?? { kind: "count", value: 0 };
}

/**
 * Aggregate a record of MetricValues by key.
 *
 * Each key is aggregated independently using the specified method.
 *
 * @param records - array of Records from string to MetricValue
 * @param method - aggregation method per key
 * @returns aggregated Record
 */
export function aggregateRecordMetricValues(
  records: readonly Record<string, MetricValue>[],
  method: AggregationMethod,
): Record<string, MetricValue> {
  // Collect all keys
  const allKeys = new Set<string>();
  for (const record of records) {
    for (const key of Object.keys(record)) {
      allKeys.add(key);
    }
  }

  const result: Record<string, MetricValue> = {};

  for (const key of allKeys) {
    // Collect values for this key
    const values: MetricValue[] = [];
    for (const record of records) {
      if (key in record) {
        const val = record[key];
        if (val) values.push(val);
      }
    }

    result[key] = aggregateMetricValues(values, method);
  }

  return result;
}

/**
 * Get the aggregation method for a metric.
 */
export function getAggregationMethod(metric: keyof Metrics): AggregationMethod {
  return AGGREGATION_METHODS[metric];
}
