/**
 * @vellum/storage — setTaskMarkers changes only the named tasks' marker
 * characters, in one write, and writes nothing when a task is missing.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTaskMarker, setTaskMarkers } from "../workspace.ts";

const PLAN = `---
version: 1
---
# Tasks

- [ ] 1. Parent
  - [x] 1.1 Leaf _Requirements: 1.1_
  - [-] 1.2 Leaf _Requirements: 1.2_
- [ ] 2. Checkpoint: all green
`;

describe("setTaskMarkers", () => {
  let dir: string;
  let path: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "vellum-markers-"));
    path = join(dir, "tasks.md");
    writeFileSync(path, PLAN);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("sets each named task's marker and nothing else, returning the previous markers", () => {
    const previous = setTaskMarkers(path, new Map([["1.2", "x"], ["1", "x"]] as const));
    expect([...previous]).toEqual([["1.2", "-"], ["1", " "]]);
    expect(readFileSync(path, "utf8")).toBe(
      PLAN.replace("- [-] 1.2", "- [x] 1.2").replace("- [ ] 1. Parent", "- [x] 1. Parent"),
    );
    expect(readdirSync(dir)).toEqual(["tasks.md"]);
  });

  it("writes nothing when a named task is not in the plan", () => {
    expect(() => setTaskMarkers(path, new Map([["1.2", "x"], ["9", "x"]] as const))).toThrow(
      /Task 9 not found/,
    );
    expect(readFileSync(path, "utf8")).toBe(PLAN);
  });

  it("setTaskMarker sets one", () => {
    expect(setTaskMarker(path, "2", "~")).toBe(" ");
    expect(readFileSync(path, "utf8")).toBe(PLAN.replace("- [ ] 2.", "- [~] 2."));
  });
});
