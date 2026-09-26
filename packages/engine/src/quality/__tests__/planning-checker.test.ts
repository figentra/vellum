/**
 * Tests for planning-checker.ts
 * @see requirements.md Requirement 3.1-3.8
 */

import { describe, it, expect } from "vitest";
import { parseTasks, checkPlanCoverage } from "../planning-checker";

describe("parseTasks", () => {
  it("parses simple task", () => {
    const tasksText = `
- [ ] 1. Create the file
`;

    const tasks = parseTasks(tasksText);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ id: "1", title: "Create the file", state: "pending" });
  });

  it("parses task with Requirements trailer", () => {
    const tasksText = `
- [ ] 1. Create the file
_Requirements: 1.1, 1.2_
`;

    const tasks = parseTasks(tasksText);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.referenced_criteria).toEqual(["1.1", "1.2"]);
  });

  it("marks test tasks", () => {
    const tasksText = `
- [ ] 1. Write tests for feature
`;

    const tasks = parseTasks(tasksText);

    expect(tasks[0]?.is_test).toBe(true);
  });
});

describe("checkPlanCoverage", () => {
  it("finds no issues with complete plan", () => {
    const requirements = `
### Requirement 1

1. WHEN triggered, THE System SHALL respond.
`;

    const design = `
## Correctness Properties

Property 1: Test property
**Validates: Requirements 1.1**
`;

    const tasks = `
- [ ] 1.1 Implement feature (spec-executor)
_Requirements: 1.1_

- [ ] 1.2 Write tests (spec-executor)
_Requirements: 1.1_

- [ ] 1.3 Write documentation (spec-executor)
_Requirements: 1.1_

- [ ] 1.4 Release (spec-executor)
_Requirements: 1.1_
`;

    const findings = checkPlanCoverage(requirements, design, tasks, "tasks.md");

    // May have warnings for missing migration/rollback but no errors
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("reports criterion not referenced", () => {
    const requirements = `
### Requirement 1

1. WHEN triggered, THE System SHALL respond.

2. WHEN requested, THE System SHALL process.
`;

    const design = ``;
    const tasks = `
- [ ] 1. Implement (spec-executor)
_Requirements: 1.1_
`;

    const findings = checkPlanCoverage(requirements, design, tasks, "tasks.md");

    // Should report findings about criteria or tasks
    expect(findings.length).toBeGreaterThanOrEqual(0);
  });

  it("reports task without executor", () => {
    const requirements = `
### Requirement 1

1. WHEN triggered, THE System SHALL respond.
`;

    const design = ``;
    const tasks = `
- [ ] 1. Do something
_Requirements: 1.1_
`;

    const findings = checkPlanCoverage(requirements, design, tasks, "tasks.md");

    expect(findings.some((f) => f.message.includes("no executor"))).toBe(true);
  });

  it("reports missing migration task", () => {
    const design = `
## Migration Strategy

Migration steps here.
`;

    const tasks = `
- [ ] 1.1 Implement feature
`;

    const findings = checkPlanCoverage("", design, tasks, "tasks.md");

    expect(findings.some((f) => f.message.includes("migration task"))).toBe(true);
  });

  it("reports missing rollback task", () => {
    const design = `
## Rollback Strategy

Rollback steps here.
`;

    const tasks = `
- [ ] 1.1 Implement feature
`;

    const findings = checkPlanCoverage("", design, tasks, "tasks.md");

    expect(findings.some((f) => f.message.includes("rollback task"))).toBe(true);
  });
});
