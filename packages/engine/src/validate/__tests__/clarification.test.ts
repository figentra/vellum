import { describe, expect, it } from "vitest";
import { findClarificationMarkers } from "../clarification.js";

describe("findClarificationMarkers", () => {
  it("reports each marker at its file line, with the question", () => {
    const text = [
      "---",
      "version: 1",
      "---",
      "#### Acceptance Criteria",
      "",
      "1. WHEN an export completes, THE Service SHALL keep it for [NEEDS CLARIFICATION: how long?]",
      "2. THE Service SHALL log [NEEDS CLARIFICATION: which level?] and [NEEDS CLARIFICATION: where?]",
    ].join("\n");
    expect(findClarificationMarkers(text, "requirements.md")).toEqual([
      {
        file: "requirements.md",
        line: 6,
        rule: "NEEDS_CLARIFICATION",
        message:
          "Unresolved clarification marker: how long? — resolve it (spec-clarify) before this artifact is approved",
      },
      expect.objectContaining({ line: 7, message: expect.stringContaining("which level?") }),
      expect.objectContaining({ line: 7, message: expect.stringContaining("where?") }),
    ]);
  });

  it("says nothing about a document with no marker", () => {
    expect(findClarificationMarkers("1. THE Service SHALL keep it for 30 days.\n", "r.md")).toEqual([]);
  });

  it("ignores a marker inside a code fence or an inline code span", () => {
    const text = [
      "The form is `[NEEDS CLARIFICATION: <question>]`.",
      "```",
      "[NEEDS CLARIFICATION: example?]",
      "```",
      "Real: [NEEDS CLARIFICATION: real?]",
    ].join("\n");
    const findings = findClarificationMarkers(text, "design.md");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ line: 5 });
  });

  it("reads CRLF files", () => {
    expect(findClarificationMarkers("a\r\nb [NEEDS CLARIFICATION: c?]\r\n", "r.md")[0]?.line).toBe(2);
  });
});
