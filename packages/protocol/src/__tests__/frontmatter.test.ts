/**
 * parseFrontmatter keeps every string-typed field a string. The parser once
 * guessed a type from the value's shape, so an all-digit checksum, or one
 * shaped like `123e45`, became a number and the artifact was rejected as
 * having no valid Lifecycle Frontmatter.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseFrontmatter, serializeFrontmatter } from "../frontmatter.js";
import type { Checksum, LifecycleFrontmatter } from "../types.js";

const HEX = [..."0123456789abcdef"];
const DIGITS = [..."0123456789"];

const chars = (alphabet: readonly string[], length: number) =>
  fc.array(fc.constantFrom(...alphabet), { minLength: length, maxLength: length }).map((c) => c.join(""));

/** 64-character lowercase hex, biased towards the shapes a number parser misreads. */
const checksum = fc.oneof(
  chars(HEX, 64),
  chars(DIGITS, 64),
  fc.integer({ min: 1, max: 62 }).chain((at) =>
    fc.tuple(chars(DIGITS, at), chars(DIGITS, 63 - at)).map(([a, b]) => `${a}e${b}`),
  ),
);

const document = (fields: string) => `---\n${fields}\n---\n# Body\n`;
const fields = (sum: string) =>
  [
    "version: 3",
    `checksum: ${sum}`,
    "state: DRAFT",
    "createdAt: 2026-01-01T00:00:00Z",
    "updatedAt: 2026-01-02T00:00:00Z",
  ].join("\n");

describe("parseFrontmatter", () => {
  it("reads an all-digit checksum as the string it is", () => {
    const sum = "0".repeat(64);
    const parsed = parseFrontmatter(document(fields(sum)));
    expect(parsed?.frontmatter.checksum).toBe(sum);
    expect(parsed?.frontmatter.version).toBe(3);
  });

  it("reads a digits-e-digits checksum as a string", () => {
    const sum = `${"1".repeat(40)}e${"2".repeat(23)}`;
    expect(parseFrontmatter(document(fields(sum)))?.frontmatter.checksum).toBe(sum);
  });

  it("reads a quoted checksum without its quotes", () => {
    const sum = "9".repeat(64);
    expect(parseFrontmatter(document(fields(`"${sum}"`)))?.frontmatter.checksum).toBe(sum);
  });

  it("rejects a version that is not a non-negative integer", () => {
    for (const version of ["1.5", "1e3", "x", "-1"]) {
      const text = document(fields("a".repeat(64)).replace("version: 3", `version: ${version}`));
      expect(parseFrontmatter(text)).toBeNull();
    }
  });

  it("property: every 64-hex checksum survives parse and serialize unchanged", () => {
    fc.assert(
      fc.property(checksum, fc.integer({ min: 0, max: 1_000_000 }), (sum, version) => {
        const parsed = parseFrontmatter(document(fields(sum).replace("version: 3", `version: ${version}`)));
        expect(parsed).not.toBeNull();
        expect(typeof parsed!.frontmatter.checksum).toBe("string");
        expect(parsed!.frontmatter.checksum).toBe(sum);
        expect(parsed!.frontmatter.version).toBe(version);

        const frontmatter: LifecycleFrontmatter = { ...parsed!.frontmatter, checksum: sum as Checksum };
        const again = parseFrontmatter(serializeFrontmatter(frontmatter, parsed!.body));
        expect(again).toEqual(parsed);
      }),
      { numRuns: 500 },
    );
  });
});
