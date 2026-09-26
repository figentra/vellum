/**
 * getCachePath from the built package in plain Node, where an ES module has
 * no `require`. vitest supplies one to modules it loads, so a stray
 * require() passes under vitest and throws in the published build.
 * Needs `build` first (this package's turbo `test` depends on it).
 */

import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BUILT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "dist",
  "index.js",
);

describe("getCachePath in the built ES module", () => {
  it("runs in plain Node and hashes the repository path under the cache home", () => {
    expect(existsSync(BUILT), `${BUILT} — run the build first`).toBe(true);
    const cacheHome = mkdtempSync(join(tmpdir(), "vellum-cache-"));
    try {
      const run = spawnSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `import { getCachePath } from ${JSON.stringify(pathToFileURL(BUILT).href)}; process.stdout.write(getCachePath("/some/repo"));`,
        ],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            XDG_CACHE_HOME: cacheHome,
            LOCALAPPDATA: cacheHome,
          },
        },
      );
      expect(run.stderr).toBe("");
      expect(run.status).toBe(0);
      const hash = createHash("sha256")
        .update("/some/repo", "utf8")
        .digest("hex")
        .slice(0, 16);
      const expected =
        process.platform === "win32"
          ? join(cacheHome, "cache", "vellum", hash)
          : join(cacheHome, "vellum", hash);
      expect(run.stdout).toBe(expected);
    } finally {
      rmSync(cacheHome, { recursive: true, force: true });
    }
  });
});

describe("getCachePath without a cache-home variable", () => {
  it("falls back to the real home directory, never a literal '~'", async () => {
    const { getCachePath } = await import("../state.js");
    const saved = {
      xdg: process.env.XDG_CACHE_HOME,
      local: process.env.LOCALAPPDATA,
    };
    delete process.env.XDG_CACHE_HOME;
    delete process.env.LOCALAPPDATA;
    try {
      const path = getCachePath("/some/repo");
      expect(path.split(/[\\/]/)).not.toContain("~");
      expect(path.startsWith(homedir())).toBe(true);
    } finally {
      if (saved.xdg !== undefined) process.env.XDG_CACHE_HOME = saved.xdg;
      if (saved.local !== undefined) process.env.LOCALAPPDATA = saved.local;
    }
  });
});
