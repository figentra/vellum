/**
 * decidePlanApproval: coverage gates plan approval (criteria 20.1, 20.2, 20.4, 20.7).
 */

import { describe, expect, it } from "vitest";
import { decidePlanApproval } from "../plan-approval.js";
import { allArtifacts, artifact, DESIGN, TASKS } from "../../verify/__tests__/fixtures.js";

describe("decidePlanApproval", () => {
  it("approves a plan that covers every criterion and cites every property", () => {
    const decision = decidePlanApproval(allArtifacts());
    expect(decision.approvable).toBe(true);
    expect(decision.coverage?.examined).toEqual({ criteria: 2, properties: 2, tasks: 2 });
  });

  it("refuses a plan leaving a criterion uncovered and a property uncited, naming each", () => {
    const tasks = TASKS.replace("<!-- criteria: 1.2 --> <!-- properties: P2 -->", "");
    const decision = decidePlanApproval(allArtifacts({ tasks }));
    expect(decision).toMatchObject({
      approvable: false,
      problems: [
        "Criterion 1.2 is referenced by no task's requirements trailer",
        "Property P2 is cited by no task",
      ],
    });
  });

  it("refuses when requirements.md yields zero criteria (INCONCLUSIVE)", () => {
    const decision = decidePlanApproval(allArtifacts({ requirements: "# Requirements\n\nNone yet.\n" }));
    expect(decision).toMatchObject({
      approvable: false,
      problems: ["requirements.md yields zero criteria; coverage is INCONCLUSIVE"],
    });
  });

  it("refuses when an artifact the coverage needs is missing, naming it", () => {
    const decision = decidePlanApproval([artifact("design", DESIGN), artifact("tasks", TASKS)]);
    expect(decision).toEqual({
      approvable: false,
      problems: ["requirements.md is missing, so the plan's coverage cannot be evaluated"],
      coverage: null,
    });
  });
});
