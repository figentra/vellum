/**
 * parseTaskLine reads both trailer forms: the design's HTML-comment trailer
 * and the Kiro `_Requirements: …_` trailer the method's tasks template writes,
 * and both Kiro optional-task positions of `*`.
 */

import { describe, expect, it } from "vitest";
import { parseTaskLine } from "../markers.js";

describe("parseTaskLine", () => {
  it("reads the HTML-comment trailers", () => {
    expect(parseTaskLine("- [ ] 1 Build it <!-- criteria: 1.1, 1.2 --> <!-- properties: P1 -->")).toEqual({
      marker: " ",
      identifier: "1",
      text: "Build it",
      requirementsTrailer: ["1.1", "1.2"],
      propertiesTrailer: ["P1"],
      isOptional: false,
    });
  });

  it("reads the Kiro requirements trailer and removes it from the text", () => {
    expect(parseTaskLine("  - [x] 1.1 Add the parser in src/parse.ts _Requirements: 1.1, 2.3_")).toEqual({
      marker: "x",
      identifier: "1.1",
      text: "Add the parser in src/parse.ts",
      requirementsTrailer: ["1.1", "2.3"],
      isOptional: false,
    });
  });

  it("merges a Kiro trailer with a comment trailer without duplicates", () => {
    const task = parseTaskLine("- [ ] 2 Do _Requirements: 1.1_ <!-- criteria: 1.1, 1.2 -->");
    expect(task?.requirementsTrailer).toEqual(["1.1", "1.2"]);
    expect(task?.text).toBe("Do");
  });

  it("treats a star after the identifier or after the checkbox as optional", () => {
    const afterId = parseTaskLine("  - [ ] 1.3* Write unit tests _Requirements: 1.1_");
    const afterBox = parseTaskLine("  - [ ]* 1.3 Write unit tests _Requirements: 1.1_");
    for (const task of [afterId, afterBox]) {
      expect(task).toMatchObject({ identifier: "1.3", text: "Write unit tests", isOptional: true });
      expect(task?.requirementsTrailer).toEqual(["1.1"]);
    }
  });

  it("parses a parent task with a trailing dot and a checkpoint, neither with a trailer", () => {
    expect(parseTaskLine("- [ ] 1. Parse the input")).toMatchObject({ identifier: "1", text: "Parse the input" });
    const checkpoint = parseTaskLine("- [-] 3. Checkpoint: ensure all tests pass");
    expect(checkpoint).toMatchObject({ marker: "-", identifier: "3", isOptional: false });
    expect(checkpoint?.requirementsTrailer).toBeUndefined();
  });

  it("does not read underscores inside the text as a trailer", () => {
    const task = parseTaskLine("- [ ] 4 Rename _Requirements_ helper");
    expect(task?.requirementsTrailer).toBeUndefined();
    expect(task?.text).toBe("Rename _Requirements_ helper");
  });

  it("rejects a line that is not a task", () => {
    expect(parseTaskLine("- [?] 1 Bad marker")).toBeNull();
    expect(parseTaskLine("Some prose _Requirements: 1.1_")).toBeNull();
  });
});
