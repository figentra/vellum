/**
 * resolveRepoPath confines a caller-supplied path to the repository root.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRepoPath } from "../queries/paths.js";

describe("resolveRepoPath", () => {
  let base: string;
  let root: string;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), "vellum-paths-"));
    root = join(base, "repo");
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(join(root, "docs", "a.md"), "a");
    writeFileSync(join(base, "secret.txt"), "outside");
    symlinkSync(join(base, "secret.txt"), join(root, "docs", "link.txt"));
    symlinkSync(base, join(root, "up"));
  });

  afterEach(() => {
    rmSync(base, { recursive: true, force: true });
  });

  it("accepts a relative path inside the root and reports it with / separators", () => {
    expect(resolveRepoPath(root, "docs/a.md")).toEqual({
      kind: "inside",
      absolute: join(root, "docs", "a.md"),
      relative: "docs/a.md",
    });
  });

  it.each([
    ["../secret.txt"],
    ["docs/../../secret.txt"],
    ["docs/../a.md"],
    [".."],
    ["docs\\..\\..\\secret.txt"],
  ])("rejects '%s', which contains a '..' segment", (input) => {
    const result = resolveRepoPath(root, input);
    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") expect(result.message).toContain("..");
  });

  it("rejects an absolute path, even one inside the root", () => {
    for (const input of [
      join(base, "secret.txt"),
      join(root, "docs", "a.md"),
      "/etc/passwd",
      "C:\\x",
    ]) {
      const result = resolveRepoPath(root, input);
      expect(result.kind, input).toBe("rejected");
    }
  });

  it("rejects a symbolic link whose target lies outside the root", () => {
    expect(resolveRepoPath(root, "docs/link.txt").kind).toBe("rejected");
    expect(resolveRepoPath(root, "up/secret.txt").kind).toBe("rejected");
  });

  it("rejects an empty path and a NUL byte", () => {
    expect(resolveRepoPath(root, "").kind).toBe("rejected");
    expect(resolveRepoPath(root, "docs/a.md\0").kind).toBe("rejected");
  });
});
