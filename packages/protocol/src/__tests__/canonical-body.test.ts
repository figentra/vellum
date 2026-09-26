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
