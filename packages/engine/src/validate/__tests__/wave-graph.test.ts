import { describe, expect, it } from "vitest";
import { validateWaveGraph } from "../wave-graph.js";

const PLAN = (graph: string, extra = "") => `# Implementation Plan

## Tasks

- [ ] 1. Parse
  - [ ] 1.1 Write the parser _Requirements: 1.1_
  - [x] 1.2 Write the printer _Requirements: 1.2_
  - [ ] 1.3* Test both _Requirements: 1.1, 1.2_

- [ ] 2. Checkpoint: ensure all tests pass

- [ ] 3. Wire it up _Requirements: 1.1_
${extra}
## Task Dependency Graph

\`\`\`json
${graph}
\`\`\`

## Notes
`;

const rules = (text: string) => validateWaveGraph(text, "tasks.md").map((f) => f.rule);
const messages = (text: string) => validateWaveGraph(text, "tasks.md").map((f) => f.message);

describe("validateWaveGraph", () => {
  it("accepts a graph placing every incomplete leaf once, completed leaves optional", () => {
    const graph = `{ "waves": [ { "id": 0, "tasks": ["1.1"] }, { "id": 1, "tasks": ["1.3", "3"] } ] }`;
    expect(validateWaveGraph(PLAN(graph), "tasks.md")).toEqual([]);
    const withDone = `{ "waves": [ { "id": 0, "tasks": ["1.1", "1.2"] }, { "id": 1, "tasks": ["1.3", "3"] } ] }`;
    expect(validateWaveGraph(PLAN(withDone), "tasks.md")).toEqual([]);
  });

  it("says nothing about a plan with no Task Dependency Graph section", () => {
    expect(validateWaveGraph("# Tasks\n\n- [ ] 1 Do it <!-- criteria: 1.1 -->\n", "tasks.md")).toEqual([]);
  });

  it("names the wave and the task when a wave names an undefined task (criterion 11.6)", () => {
    const graph = `{ "waves": [ { "id": 0, "tasks": ["1.1", "9.9"] }, { "id": 1, "tasks": ["1.3", "3"] } ] }`;
    const findings = validateWaveGraph(PLAN(graph), "tasks.md");
    expect(findings).toEqual([
      {
        file: "tasks.md",
        line: 16,
        rule: "WAVE_TASK_UNDEFINED",
        message: "Wave 0 names task 9.9, which tasks.md does not define",
      },
    ]);
  });

  it("reports an incomplete leaf in no wave, at the task's own line", () => {
    const graph = `{ "waves": [ { "id": 0, "tasks": ["1.1", "1.3"] } ] }`;
    const findings = validateWaveGraph(PLAN(graph), "tasks.md");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ line: 12, rule: "WAVE_GRAPH_INVALID" });
    expect(findings[0]!.message).toContain("Incomplete leaf task 3 appears in no wave");
  });

  it("reports a task placed twice", () => {
    const graph = `{ "waves": [ { "id": 0, "tasks": ["1.1", "3"] }, { "id": 1, "tasks": ["1.3", "3"] } ] }`;
    expect(messages(PLAN(graph))).toEqual([
      "Task 3 appears in wave 0 and again in wave 1; a task belongs to exactly one wave",
    ]);
  });

  it("reports a parent or a checkpoint in a wave", () => {
    const graph = `{ "waves": [ { "id": 0, "tasks": ["1", "1.1", "2"] }, { "id": 1, "tasks": ["1.3", "3"] } ] }`;
    const found = messages(PLAN(graph));
    expect(found).toContain("Wave 0 names parent task 1; only leaf tasks belong to a wave");
    expect(found).toContain("Wave 0 names checkpoint task 2; checkpoints belong to no wave");
    expect(found).toHaveLength(2);
  });

  it("reports wave ids that are not contiguous from 0", () => {
    const graph = `{ "waves": [ { "id": 1, "tasks": ["1.1"] }, { "id": 2, "tasks": ["1.3", "3"] } ] }`;
    expect(messages(PLAN(graph))).toEqual([
      "Wave ids must be contiguous from 0: position 0 has id 1",
      "Wave ids must be contiguous from 0: position 1 has id 2",
    ]);
  });

  it("reports JSON that does not parse, a wrong shape, and a section with no json block", () => {
    expect(rules(PLAN(`{ "waves": [ `))).toEqual(["WAVE_GRAPH_INVALID"]);
    expect(messages(PLAN(`{ "stages": [] }`))).toEqual(['The wave graph must be an object with a "waves" array']);
    expect(messages(PLAN(`{ "waves": [ { "id": "a", "tasks": [] } ] }`))).toEqual([
      'Wave at position 0 has no integer "id"',
    ]);
    expect(messages(PLAN(`{ "waves": [ { "id": 0, "tasks": [1] } ] }`))).toEqual([
      'Wave 0 has no "tasks" array of task ids',
    ]);
    const noBlock = "# Tasks\n\n- [ ] 1 Do it\n\n## Task Dependency Graph\n\nnone yet\n\n## Notes\n";
    expect(validateWaveGraph(noBlock, "tasks.md")).toEqual([
      {
        file: "tasks.md",
        line: 5,
        rule: "WAVE_GRAPH_INVALID",
        message: "The Task Dependency Graph section has no complete ```json block",
      },
    ]);
  });

  it("ignores task-looking lines inside a code fence", () => {
    const graph = `{ "waves": [ { "id": 0, "tasks": ["1.1"] }, { "id": 1, "tasks": ["1.3", "3"] } ] }`;
    const fenced = "\n```md\n- [ ] 7.1 Example only _Requirements: 1.1_\n```\n";
    expect(validateWaveGraph(PLAN(graph, fenced), "tasks.md")).toEqual([]);
  });
});
