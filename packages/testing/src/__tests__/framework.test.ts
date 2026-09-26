/**
 * The fixture helpers build artifacts the protocol accepts: their checksum
 * is the protocol's Artifact Checksum of the body the protocol parses.
 */

import { describe, expect, it } from "vitest";
import { computeChecksum, parseFrontmatter } from "@vellum/protocol";
import { createArtifact, testChecksum } from "../framework.js";

describe("testChecksum", () => {
  it("is the protocol's Artifact Checksum", () => {
    for (const body of [
      "# A\n",
      "# A",
      "- [x] 1 Task\n",
      "| a |  b |\n",
      "line  \r\nnext\n\n\n",
    ]) {
      expect(testChecksum(body)).toBe(computeChecksum(body));
    }
  });
});

describe("createArtifact", () => {
  it("writes frontmatter whose checksum matches the body the protocol parses", () => {
    for (const body of [
      undefined,
      "# Requirements\n\n1.1 WHEN x, THE System SHALL y.\n",
    ]) {
      const text = createArtifact("requirements", "DRAFT", 1, body);
      const parsed = parseFrontmatter(text);
      expect(parsed).not.toBeNull();
      expect(parsed!.frontmatter.checksum).toBe(computeChecksum(parsed!.body));
    }
  });
});
