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
