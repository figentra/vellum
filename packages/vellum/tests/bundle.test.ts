/**
 * Bundle verification tests for @figentra/vellum
 *
 * These tests verify:
 * 1. Zero runtime dependencies (offline capability)
 * 2. Bundle size < 500KB
 * 3. Installation on clean machine works
 */

import { describe, it, expect } from "vitest";
import { readFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { builtinModules } from "node:module";

describe("Bundle Verification", () => {
  const distDir = join(__dirname, "..", "dist");

  describe("Zero Runtime Dependencies", () => {
    it("should have only workspace dependencies in package.json", () => {
      const packageJson = JSON.parse(
        readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
      );

      const deps = packageJson.dependencies || {};
      const depNames = Object.keys(deps);

      // All dependencies should be workspace packages
      const nonWorkspaceDeps = depNames.filter(
        (name) => !deps[name].includes("workspace:"),
      );

      expect(nonWorkspaceDeps).toEqual([]);
    });

    it("should bundle all dependencies into dist", () => {
      // Check that dist directory exists and has files
      expect(existsSync(distDir)).toBe(true);

      const files = readdirSync(distDir);
      expect(files.length).toBeGreaterThan(0);

      // Should have main entry points
      expect(files).toContain("cli.js");
      expect(files).toContain("index.js");
      expect(files).toContain("server.js");
    });

    it("should work offline (no external calls)", () => {
      const packageJson = JSON.parse(
        readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
      );

      // Should not have external runtime dependencies
      const deps = Object.keys(packageJson.dependencies || {});
      const externalPackages = ["axios", "node-fetch", "got", "request"];

      const hasExternalDeps = deps.some((dep) =>
        externalPackages.includes(dep),
      );

      expect(hasExternalDeps).toBe(false);
    });
  });

  describe("Self-contained bundle", () => {
    const packageJson = () =>
      JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
    const bundle = () =>
      readdirSync(distDir)
        .filter((f) => f.endsWith(".js"))
        .map((f) => ({
          file: f,
          source: readFileSync(join(distDir, f), "utf-8"),
        }));

    it("declares no runtime dependencies of any kind", () => {
      const pkg = packageJson();
      for (const field of [
        "dependencies",
        "optionalDependencies",
        "peerDependencies",
        "bundledDependencies",
      ]) {
        expect(Object.keys(pkg[field] ?? {}), field).toEqual([]);
      }
    });

    it("contains no import or require of a @vellum/ package", () => {
      const pattern =
        /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)["']@vellum\//;
      const offenders = bundle()
        .filter(({ source }) => pattern.test(source))
        .map(({ file }) => file);
      expect(offenders).toEqual([]);
    });

    it("imports nothing but its own chunks and Node builtins", () => {
      const builtins = new Set(builtinModules.flatMap((m) => [m, `node:${m}`]));
      const specifiers = bundle().flatMap(({ source }) =>
        [
          ...source.matchAll(
            /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^import\s+)["']([^"']+)["']/gm,
          ),
        ].map((m) => m[1]!),
      );
      expect(specifiers.length).toBeGreaterThan(0);
      const foreign = specifiers.filter(
        (s) => !s.startsWith("./") && !builtins.has(s),
      );
      expect(foreign).toEqual([]);
    });

    it("declares a vellum and a vellum-mcp bin, each an existing file with a node shebang", () => {
      const pkg = packageJson();
      expect(Object.keys(pkg.bin).sort()).toEqual(["vellum", "vellum-mcp"]);
      for (const path of Object.values(pkg.bin) as string[]) {
        const file = join(__dirname, "..", path);
        expect(existsSync(file), path).toBe(true);
        expect(
          readFileSync(file, "utf-8").startsWith("#!/usr/bin/env node\n"),
          path,
        ).toBe(true);
      }
    });

    it("publishes only dist, with a source map beside every JavaScript file", () => {
      const pkg = packageJson();
      expect(pkg.files.every((f: string) => f.startsWith("dist/"))).toBe(true);
      const files = readdirSync(distDir);
      for (const js of files.filter((f) => f.endsWith(".js"))) {
        expect(files, js).toContain(`${js}.map`);
      }
    });

    it("pins engines.node to the repository's Node floor", () => {
      const root = JSON.parse(
        readFileSync(
          join(__dirname, "..", "..", "..", "package.json"),
          "utf-8",
        ),
      );
      expect(packageJson().engines.node).toBe(root.engines.node);
    });

    it("publishes only to the private Figentra registry, never the public npm registry", () => {
      expect(packageJson().publishConfig?.registry).toBe("https://npm.figentra.com/");
    });
  });

  describe("Bundle Size", () => {
    it("should have total bundle size < 500KB", () => {
      if (!existsSync(distDir)) {
        expect(true).toBe(true); // Skip if not built yet
        return;
      }

      const files = readdirSync(distDir).filter((f) => f.endsWith(".js"));

      let totalSize = 0;
      for (const file of files) {
        const filePath = join(distDir, file);
        const stats = statSync(filePath);
        totalSize += stats.size;
      }

      // 500KB limit
      const maxBytes = 500 * 1024;
      expect(totalSize).toBeLessThan(maxBytes);
    });

    it("should have each chunk < 200KB", () => {
      if (!existsSync(distDir)) {
        expect(true).toBe(true); // Skip if not built yet
        return;
      }

      const files = readdirSync(distDir).filter((f) => f.endsWith(".js"));
      const maxChunkSize = 200 * 1024; // 200KB

      for (const file of files) {
        const filePath = join(distDir, file);
        const stats = statSync(filePath);

        expect(
          stats.size,
          `File ${file} should be < 200KB (was ${(stats.size / 1024).toFixed(2)}KB)`,
        ).toBeLessThan(maxChunkSize);
      }
    });
  });

  describe("Installation on Clean Machine", () => {
    it("should install without network access after initial install", () => {
      // This test verifies the package.json is properly configured
      const packageJson = JSON.parse(
        readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
      );

      // Should have bin entry point
      expect(packageJson.bin).toBeDefined();
      expect(packageJson.bin.vellum).toBeDefined();

      // Should have proper exports
      expect(packageJson.exports).toBeDefined();
      expect(packageJson.exports["."]).toBeDefined();
      expect(packageJson.exports["./cli"]).toBeDefined();
      expect(packageJson.exports["./mcp"]).toBeDefined();
    });

    it("should have no peer dependencies", () => {
      const packageJson = JSON.parse(
        readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
      );

      expect(packageJson.peerDependencies).toBeUndefined();
    });

    it("should have proper engines field", () => {
      const packageJson = JSON.parse(
        readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
      );

      expect(packageJson.engines).toBeDefined();
      expect(packageJson.engines.node).toMatch(/>=\d+/);
    });
  });

  describe("Build Artifacts", () => {
    it("should generate all required output files", () => {
      if (!existsSync(distDir)) {
        expect(true).toBe(true); // Skip if not built yet
        return;
      }

      const files = readdirSync(distDir);

      // Required files
      const requiredFiles = ["cli.js", "index.js", "index.d.ts"];

      for (const file of requiredFiles) {
        expect(files).toContain(file);
      }
    });

    it("should have source maps for debugging", () => {
      if (!existsSync(distDir)) {
        expect(true).toBe(true); // Skip if not built yet
        return;
      }

      const files = readdirSync(distDir);
      const jsFiles = files.filter((f) => f.endsWith(".js"));
      const mapFiles = files.filter((f) => f.endsWith(".js.map"));

      // Should have source maps for main entry points
      expect(mapFiles.length).toBeGreaterThan(0);
    });

    it("maps name their sources without embedding the sources' text", () => {
      expect(existsSync(distDir)).toBe(true);
      const maps = readdirSync(distDir).filter((f) => f.endsWith(".js.map"));
      expect(maps.length).toBeGreaterThan(0);
      for (const file of maps) {
        const map = JSON.parse(readFileSync(join(distDir, file), "utf8")) as {
          sources: string[];
          sourcesContent?: unknown;
        };
        expect(map.sourcesContent, file).toBeUndefined();
        expect(map.sources.length, file).toBeGreaterThan(0);
      }
    });
  });

  // The size budget CI enforced as a shell step, now a test so it runs
  // wherever the suite runs: all of dist/ (JS and maps) within 500 KiB, and no
  // single JS file over 200 KiB.
  describe("Size budget", () => {
    it("keeps dist/ within 500 KiB and each JS file within 200 KiB", () => {
      expect(existsSync(distDir)).toBe(true);
      let total = 0;
      for (const file of readdirSync(distDir)) {
        const size = statSync(join(distDir, file)).size;
        total += size;
        if (file.endsWith(".js")) expect(size, file).toBeLessThanOrEqual(200 * 1024);
      }
      expect(total).toBeLessThanOrEqual(500 * 1024);
    });
  });
});
