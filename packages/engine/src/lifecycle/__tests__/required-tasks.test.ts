/**
 * Required Tasks: optional tasks and parent tasks need no evidence of their
 * own; a checkpoint does.
 */

import { describe, expect, it } from "vitest";
import { parseTaskLine } from "@vellum/protocol";
import { parentTaskIds, parentsCompletedBy, requiredTasks } from "../required-tasks.js";

const PLAN = `- [ ] 1. Greeting core
  - [ ] 1.1 Implement _Requirements: 1.1_
  - [ ] 1.2* Tests _Requirements: 1.1_
- [ ] 2. Checkpoint: ensure all tests pass
- [ ] 3. Single change _Requirements: 1.2_
- [ ] 4. Only optional work beneath
  - [ ] 4.1* Tests _Requirements: 1.2_`;

const lines = PLAN.split("\n").flatMap((line) => parseTaskLine(line) ?? []);

describe("requiredTasks", () => {
  it("keeps leaves and checkpoints; drops optional tasks and parents", () => {
    expect(requiredTasks(lines).map((t) => t.identifier)).toEqual(["1.1", "2", "3"]);
  });

  it("names every task that has a sub-task line as a parent", () => {
    expect([...parentTaskIds(lines)].sort()).toEqual(["1", "4"]);
  });

  it("keeps extra fields of the lines it is given", () => {
    const numbered = lines.map((line, index) => ({ ...line, lineNumber: index + 1 }));
    expect(requiredTasks(numbered)[1]).toMatchObject({ identifier: "2", lineNumber: 4 });
  });
});

describe("parentsCompletedBy", () => {
  const NESTED = `- [ ] 1. Top
  - [ ] 1.1 Leaf
  - [ ] 1.2 Group
    - [ ] 1.2.1 Leaf
    - [ ] 1.2.2* Optional
- [ ] 2. Checkpoint: all green`;
  const nested = NESTED.split("\n").flatMap((line) => parseTaskLine(line) ?? []);

  it("names the parent once its last required sub-task is verified, not before", () => {
    expect(parentsCompletedBy(lines, new Set(["1.1"]), "1.1")).toEqual(["1"]);
    expect(parentsCompletedBy(nested, new Set(["1.2.1"]), "1.2.1")).toEqual(["1.2"]);
  });

  it("names every ancestor whose required descendants are all verified, nearest first", () => {
    expect(parentsCompletedBy(nested, new Set(["1.1", "1.2.1"]), "1.2.1")).toEqual(["1.2", "1"]);
    expect(parentsCompletedBy(nested, new Set(["1.2.1", "1.1"]), "1.1")).toEqual(["1"]);
  });

  it("names nothing for an optional task, a parent, a top-level task or an unverified one", () => {
    expect(parentsCompletedBy(nested, new Set(["1.1", "1.2.1", "1.2.2"]), "1.2.2")).toEqual([]);
    expect(parentsCompletedBy(nested, new Set(["1.1", "1.2.1", "1.2"]), "1.2")).toEqual([]);
    expect(parentsCompletedBy(nested, new Set(["2"]), "2")).toEqual([]);
    expect(parentsCompletedBy(nested, new Set(["1.1"]), "1.2.1")).toEqual([]);
  });

  it("never completes a parent whose required sub-tasks are all optional", () => {
    expect(parentsCompletedBy(lines, new Set(["4.1"]), "4.1")).toEqual([]);
  });
});
