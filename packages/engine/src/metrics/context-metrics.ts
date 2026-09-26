/**
 * Context Metrics - computes and reports Context Bundle metrics.
 * @see requirements.md Requirement 11.1-11.7
 */

import type { MetricsScope } from "./scope.types";

/**
 * Context Bundle metrics for a single task.
 */
export interface TaskContextMetrics {
  /** Task ID */
  task_id: string;
  /** Spec slug */
  spec_slug: string;
  /** Bundle size in bytes */
  bundle_size_bytes: number;
  /** Original document size in bytes */
  original_size_bytes: number;
  /** Size ratio (bundle / original) */
  size_ratio: number;
  /** Whether bundle was computed */
  computed: boolean;
  /** Reason if not computed */
  reason?: string;
}

/**
 * Aggregated context metrics.
 */
export interface AggregatedContextMetrics {
  /** Metrics scope */
  scope: MetricsScope;
  /** Total tasks */
  total_tasks: number;
  /** Tasks with bundles */
  tasks_with_bundles: number;
  /** Average bundle size */
  average_bundle_size_bytes: number;
  /** Average original size */
  average_original_size_bytes: number;
  /** Overall size ratio */
  size_ratio: number;
  /** Tasks that fell back to full artifacts */
  full_artifact_fallbacks: number;
  /** Timestamp */
  timestamp: string;
}

/**
 * Compute context metrics for a task.
 *
 * @param taskId - Task ID
 * @param specSlug - Spec slug
 * @param bundleContent - Bundle content
 * @param originalContent - Original document content
 * @returns Task context metrics
 */
export function computeTaskMetrics(
  taskId: string,
  specSlug: string,
  bundleContent: string | null,
  originalContent: string,
): TaskContextMetrics {
  if (!bundleContent) {
    return {
      task_id: taskId,
      spec_slug: specSlug,
      bundle_size_bytes: 0,
      original_size_bytes: utf8ByteLength(originalContent),
      size_ratio: 0,
      computed: false,
      reason: "Bundle not available",
    };
  }

  const bundleSize = utf8ByteLength(bundleContent);
  const originalSize = utf8ByteLength(originalContent);

  return {
    task_id: taskId,
    spec_slug: specSlug,
    bundle_size_bytes: bundleSize,
    original_size_bytes: originalSize,
    size_ratio: bundleSize / originalSize,
    computed: true,
  };
}

/**
 * Aggregate context metrics across multiple tasks.
 *
 * @param taskMetrics - Array of task metrics
 * @param scope - Metrics scope
 * @param fallbackCount - Number of tasks that fell back to full artifacts
 * @param now - The aggregation instant as an ISO 8601 UTC timestamp, supplied
 *   by the caller (the engine reads no clock)
 * @returns Aggregated metrics
 */
export function aggregateContextMetrics(
  taskMetrics: TaskContextMetrics[],
  scope: MetricsScope,
  fallbackCount: number,
  now: string,
): AggregatedContextMetrics {
  const computed = taskMetrics.filter((m) => m.computed);
  const totalTasks = taskMetrics.length;
  const tasksWithBundles = computed.length;

  if (tasksWithBundles === 0) {
    return {
      scope,
      total_tasks: totalTasks,
      tasks_with_bundles: 0,
      average_bundle_size_bytes: 0,
      average_original_size_bytes: 0,
      size_ratio: 0,
      full_artifact_fallbacks: fallbackCount,
      timestamp: now,
    };
  }

  const totalBundleSize = computed.reduce((sum, m) => sum + m.bundle_size_bytes, 0);
  const totalOriginalSize = computed.reduce((sum, m) => sum + m.original_size_bytes, 0);

  return {
    scope,
    total_tasks: totalTasks,
    tasks_with_bundles: tasksWithBundles,
    average_bundle_size_bytes: Math.round(totalBundleSize / tasksWithBundles),
    average_original_size_bytes: Math.round(totalOriginalSize / tasksWithBundles),
    size_ratio: totalBundleSize / totalOriginalSize,
    full_artifact_fallbacks: fallbackCount,
    timestamp: now,
  };
}

/**
 * Ensure metrics contain no person or session identity.
 *
 * @param metrics - Metrics to anonymize
 * @returns Anonymized metrics
 */
export function anonymizeContextMetrics(
  metrics: AggregatedContextMetrics,
): AggregatedContextMetrics {
  // Context metrics by design don't contain identity
  // This function ensures that remains true
  return {
    scope: metrics.scope,
    total_tasks: metrics.total_tasks,
    tasks_with_bundles: metrics.tasks_with_bundles,
    average_bundle_size_bytes: metrics.average_bundle_size_bytes,
    average_original_size_bytes: metrics.average_original_size_bytes,
    size_ratio: metrics.size_ratio,
    full_artifact_fallbacks: metrics.full_artifact_fallbacks,
    timestamp: metrics.timestamp,
  };
}

/**
 * Report on tasks that couldn't be computed.
 *
 * @param taskMetrics - Task metrics array
 * @returns Array of task IDs and reasons
 */
export function reportUncomputedTasks(
  taskMetrics: TaskContextMetrics[],
): Array<{ task_id: string; reason: string }> {
  return taskMetrics
    .filter((m) => !m.computed)
    .map((m) => ({
      task_id: m.task_id,
      reason: m.reason || "Unknown reason",
    }));
}

/**
 * Byte length of a string encoded as UTF-8, computed without a host API
 * (the engine may not use Node's Buffer). A lone surrogate counts as the
 * 3-byte replacement character, as an encoder would write it.
 */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}
