/**
 * canonicalArtifactBody and computeChecksum: formatting-only edits keep the
 * Artifact Checksum; content edits change it.
 */

import { describe, expect, it } from "vitest";
import { canonicalArtifactBody } from "../canonical-body.js";
import { computeChecksum } from "../frontmatter.js";

const BODY = [
  "# Requirements",
  "",
  "| Term | Meaning |",
  "| ---- | ------- |",
  "| Spec | A folder |",
  "",
  "```ts",
  "const table = '| a  |  b |';   ",
  "```",
  "",
].join("\n");

describe("canonicalArtifactBody", () => {
  it("excludes the Lifecycle Frontmatter", () => {
    const withFrontmatter = `---\nversion: 3\nstate: DRAFT\n---\n${BODY}`;
    expect(canonicalArtifactBody(withFrontmatter)).toBe(canonicalArtifactBody(BODY));
  });

  it("normalises CRLF and CR line endings to LF", () => {
    expect(canonicalArtifactBody(BODY.replace(/\n/g, "\r\n"))).toBe(canonicalArtifactBody(BODY));
    expect(canonicalArtifactBody(BODY.replace(/\n/g, "\r"))).toBe(canonicalArtifactBody(BODY));
  });

  it("drops trailing whitespace and trailing blank lines", () => {
    const messy = BODY.replace(/\n/g, "  \t\n") + "\n\n\n";
    expect(canonicalArtifactBody(messy)).toBe(canonicalArtifactBody(BODY));
  });

  it("collapses table padding outside code fences", () => {
    const realigned = BODY.replace(
      "| Term | Meaning |\n| ---- | ------- |\n| Spec | A folder |",
      "|Term|Meaning|\n|--|---|\n|Spec|A folder|",
    );
    expect(canonicalArtifactBody(realigned)).toBe(canonicalArtifactBody(BODY));
    expect(canonicalArtifactBody(BODY)).toContain("| Term | Meaning |\n| --- | --- |\n");
  });

  it("keeps table alignment colons, which change rendering", () => {
    const leftAligned = BODY.replace("| ---- | ------- |", "| :--- | ------- |");
    expect(canonicalArtifactBody(leftAligned)).not.toBe(canonicalArtifactBody(BODY));
  });

  it("leaves table-looking lines inside a code fence untouched", () => {
    expect(canonicalArtifactBody(BODY)).toContain("const table = '| a  |  b |';\n");
  });

  it("reads every Task Marker as not started, so recording progress keeps the checksum", () => {
    const plan = (a: string, b: string) =>
      `# Tasks\n\n- [${a}] 1 Build it <!-- criteria: 1.1 -->\n  - [${b}] 1.2. Test it\n`;
    const pristine = canonicalArtifactBody(plan(" ", " "));
    for (const [a, b] of [["x", " "], ["-", "~"], ["x", "x"]] as const) {
      expect(canonicalArtifactBody(plan(a, b))).toBe(pristine);
    }
  });

  it("reads a Kiro optional task's marker as not started too, star in either place", () => {
    const plan = (m: string) =>
      `# Tasks\n\n- [${m}]* 1.3 Test it _Requirements: 1.1_\n- [${m}] 1.4* Test more _Requirements: 1.1_\n`;
    expect(canonicalArtifactBody(plan("x"))).toBe(canonicalArtifactBody(plan(" ")));
    expect(canonicalArtifactBody(plan("-"))).toBe(canonicalArtifactBody(plan(" ")));
  });

  it("keeps task markers inside a code fence, and a changed task's text, significant", () => {
    const fenced = (m: string) => `\`\`\`\n- [${m}] 1 Example\n\`\`\`\n`;
    expect(canonicalArtifactBody(fenced("x"))).not.toBe(canonicalArtifactBody(fenced(" ")));
    expect(canonicalArtifactBody("- [x] 1 Build it\n")).not.toBe(
      canonicalArtifactBody("- [ ] 1 Build that\n"),
    );
    expect(canonicalArtifactBody("- [x] 1 Build it\n")).not.toBe(
      canonicalArtifactBody("- [ ] 2 Build it\n"),
    );
  });

  it("ignores Execution Log rows, so the executor's record keeps the plan's checksum", () => {
    const plan = [
      "# Tasks",
      "",
      "- [ ] 1.1 Build the thing",
      "",
      "## Execution Log",
      "",
      "| Task | Result |",
      "| --- | --- |",
      "",
      "## Notes",
      "",
      "Keep it small.",
      "",
    ].join("\n");
    const logged = plan.replace(
      "| --- | --- |\n",
      "| --- | --- |\n| 1.1 | passed |\n| 1.2 | failed twice |\n",
    );
    expect(computeChecksum(logged)).toBe(computeChecksum(plan));
    // The section ends at the next heading: plan text after the log still counts.
    expect(computeChecksum(plan.replace("Keep it small.", "Keep it large."))).not.toBe(
      computeChecksum(plan),
    );
    // So does the task list before it.
    expect(computeChecksum(plan.replace("Build the thing", "Build another thing"))).not.toBe(
      computeChecksum(plan),
    );
  });

  it("keeps an Execution Log heading inside a code fence significant", () => {
    const fenced = "```\n## Execution Log\n| 1.1 | passed |\n```\n";
    expect(canonicalArtifactBody(fenced)).toBe(fenced);
  });

  it("changes when a word changes, inside or outside a fence", () => {
    expect(canonicalArtifactBody(BODY.replace("A folder", "A file"))).not.toBe(
      canonicalArtifactBody(BODY),
    );
    expect(canonicalArtifactBody(BODY.replace("| a  |", "| c  |"))).not.toBe(
      canonicalArtifactBody(BODY),
    );
  });
});

describe("computeChecksum", () => {
  it("is the SHA-256 hex of the canonical form", () => {
    expect(computeChecksum(BODY)).toMatch(/^[0-9a-f]{64}$/);
    expect(computeChecksum(BODY.replace(/\n/g, "\r\n"))).toBe(computeChecksum(BODY));
    expect(computeChecksum(BODY.replace("Spec", "Plan"))).not.toBe(computeChecksum(BODY));
  });
});
