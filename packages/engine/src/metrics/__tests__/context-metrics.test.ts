/**
 * Tests for Context Metrics
 * @see requirements.md Requirement 11.1-11.7
 */

import { describe, it, expect } from "vitest";
import {
  computeTaskMetrics,
  aggregateContextMetrics,
  anonymizeContextMetrics,
} from "../context-metrics";

describe("computeTaskMetrics", () => {
  it("computes metrics for task", () => {
    const bundle = "Condensed context with key information";
    const original = "Full requirements document with all details and criteria";

    const metrics = computeTaskMetrics("1.1", "test-spec", bundle, original);

    expect(metrics.task_id).toBe("1.1");
    expect(metrics.spec_slug).toBe("test-spec");
    expect(metrics.computed).toBe(true);
    expect(metrics.bundle_size_bytes).toBeLessThan(metrics.original_size_bytes);
    expect(metrics.size_ratio).toBeLessThan(1);
  });

  it("handles missing bundle", () => {
    const original = "Full document";

    const metrics = computeTaskMetrics("1.1", "test-spec", null, original);

    expect(metrics.computed).toBe(false);
    expect(metrics.bundle_size_bytes).toBe(0);
    expect(metrics.size_ratio).toBe(0);
    expect(metrics.reason).toBeDefined();
  });

  it("calculates size ratio correctly", () => {
    const bundle = "abc"; // 3 bytes
    const original = "abcdefghij"; // 10 bytes

    const metrics = computeTaskMetrics("1.1", "test-spec", bundle, original);

    expect(metrics.size_ratio).toBeCloseTo(0.3);
  });
});

describe("aggregateContextMetrics", () => {
  it("aggregates metrics across tasks", () => {
    const taskMetrics = [
      computeTaskMetrics("1.1", "spec-1", "small", "large content here"),
      computeTaskMetrics("1.2", "spec-1", "tiny", "very large content here indeed"),
      computeTaskMetrics("1.3", "spec-1", null, "uncomputed content"),
    ];

    const aggregated = aggregateContextMetrics(taskMetrics, "test-scope", 0);

    expect(aggregated.scope).toBe("test-scope");
    expect(aggregated.total_tasks).toBe(3);
    expect(aggregated.tasks_with_bundles).toBe(2);
    expect(aggregated.average_bundle_size_bytes).toBeGreaterThan(0);
    expect(aggregated.size_ratio).toBeLessThan(1);
  });

  it("counts full artifact fallbacks", () => {
    const taskMetrics = [computeTaskMetrics("1.1", "spec-1", "bundle", "original")];

    const aggregated = aggregateContextMetrics(taskMetrics, "scope", 5);

    expect(aggregated.full_artifact_fallbacks).toBe(5);
  });

  it("handles no computed tasks", () => {
    const taskMetrics = [
      computeTaskMetrics("1.1", "spec-1", null, "original"),
      computeTaskMetrics("1.2", "spec-1", null, "original"),
    ];

    const aggregated = aggregateContextMetrics(taskMetrics, "scope", 2);

    expect(aggregated.tasks_with_bundles).toBe(0);
    expect(aggregated.size_ratio).toBe(0);
  });
});

describe("anonymizeContextMetrics", () => {
  it("removes no identity (already anonymous)", () => {
    const metrics = {
      scope: "test-scope",
      total_tasks: 10,
      tasks_with_bundles: 8,
      average_bundle_size_bytes: 1024,
      average_original_size_bytes: 5120,
      size_ratio: 0.2,
      full_artifact_fallbacks: 2,
      timestamp: new Date().toISOString(),
    };

    const anonymized = anonymizeContextMetrics(metrics);

    // Context metrics by design contain no PII
    expect(anonymized.scope).toBe("test-scope");
    expect(anonymized.total_tasks).toBe(10);
    expect(anonymized.timestamp).toBeDefined();
  });
});
