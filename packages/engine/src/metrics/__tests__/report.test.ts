/**
 * Tests for the metrics report: it reports what it computed and says what it
 * could not, never a fabricated zero or scope.
 */

import { describe, expect, it } from "vitest";
import type { LedgerEntry } from "@vellum/protocol";
import { report, type MetricsContext } from "../report.js";
import { computeTraceabilityCoverage, countCriteria } from "../traceability.js";
import { containsIdentity } from "../anonymizer.js";
import { computeTaskCompletionRate } from "../task-completion.js";
import { aggregateMetricValues } from "../aggregator.js";

function evidence(taskId: string, exitStatus: number): LedgerEntry {
  return {
    kind: "evidence",
    id: 1,
    predecessor_digest: null,
    timestamp: "2026-09-26T11:00:00Z",
    task_id: taskId,
    exit_status: exitStatus,
  } as unknown as LedgerEntry;
}

const context: MetricsContext = {
  entries: [],
  gitHistory: new Map(),
  artifactTimestamps: new Map(),
  requiredTasks: [],
  criteria: ["1.1", "1.2"],
  taskCriteria: new Map(),
  stateTransitions: [],
};

describe("computeTraceabilityCoverage", () => {
  it("counts criteria whose tasks have passing evidence, not task identifiers", () => {
    const taskCriteria = new Map([
      ["1", ["1.1"]],
      ["2", ["1.2"]],
      ["3", ["1.2"]],
    ]);
    const entries = [evidence("1", 0), evidence("2", 1), evidence("3", 0), evidence("4", 0)];
    expect(computeTraceabilityCoverage(entries, ["1.1", "1.2"], taskCriteria)).toEqual({
      kind: "ratio",
      numerator: 2,
      denominator: 2,
    });
  });

  it("does not count a criterion whose only evidence failed", () => {
    const taskCriteria = new Map([["2", ["1.2"]]]);
    expect(computeTraceabilityCoverage([evidence("2", 1)], ["1.1", "1.2"], taskCriteria)).toEqual({
      kind: "ratio",
      numerator: 0,
      denominator: 2,
    });
  });
});

describe("countCriteria", () => {
  it("counts acceptance criteria, not every N.M in the text", () => {
    const requirements = `Version 1.0 of the platform, see sections 2.3 and 4.5.

### Requirement 1: One

#### Acceptance Criteria

1. WHEN a thing happens, THE System SHALL do one thing.
2. WHEN another happens, THE System SHALL do another.
`;
    expect(countCriteria(requirements)).toBe(2);
  });
});

describe("report", () => {
  it("reports no scope, not a placeholder one, when it refuses the scope", () => {
    const result = report(
      { scope: { kind: "forbidden", grouping: "author" }, output: "json" },
      context,
    );
    expect(result.exitStatus).not.toBe(0);
    expect(result.scope).toBeNull();
  });

  it("marks a metric it failed to compute as unavailable, not zero", () => {
    const broken = { ...context, requiredTasks: null } as unknown as MetricsContext;
    const result = report({ scope: { kind: "repository" }, output: "json" }, broken);
    expect(result.metrics.taskCompletionRate.kind).toBe("unavailable");
  });

  it("carries no identity in its output", () => {
    const result = report({ scope: { kind: "repository" }, output: "json" }, context);
    expect(containsIdentity(result.metrics)).toBe(false);
  });
});

describe("computeTaskCompletionRate", () => {
  it("counts only required tasks with passing evidence", () => {
    expect(computeTaskCompletionRate([evidence("1", 0), evidence("9", 0)], ["1", "2"])).toEqual({
      kind: "ratio",
      numerator: 1,
      denominator: 2,
    });
  });
});

describe("aggregateMetricValues", () => {
  it("does not aggregate over a value that could not be computed", () => {
    expect(
      aggregateMetricValues(
        [
          { kind: "count", value: 3 },
          { kind: "unavailable", reason: "ledger unreadable" },
        ],
        "sum",
      ),
    ).toEqual({ kind: "unavailable", reason: "ledger unreadable" });
  });

  it("does not pass off one value as the aggregate of values the method cannot combine", () => {
    expect(
      aggregateMetricValues(
        [
          { kind: "duration", value: 5 },
          { kind: "duration", value: 7 },
        ],
        "sum",
      ).kind,
    ).toBe("unavailable");
  });
});
