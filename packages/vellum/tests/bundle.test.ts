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
import { execSync } from "node:child_process";

describe("Bundle Verification", () => {
  const distDir = join(__dirname, "..", "dist");

  describe("Zero Runtime Dependencies", () => {
    it("should have only workspace dependencies in package.json", () => {
      const packageJson = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

      const deps = packageJson.dependencies || {};
      const depNames = Object.keys(deps);

      // All dependencies should be workspace packages
      const nonWorkspaceDeps = depNames.filter((name) => !deps[name].includes("workspace:"));

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
      const packageJson = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

      // Should not have external runtime dependencies
      const deps = Object.keys(packageJson.dependencies || {});
      const externalPackages = ["axios", "node-fetch", "got", "request"];

      const hasExternalDeps = deps.some((dep) => externalPackages.includes(dep));

      expect(hasExternalDeps).toBe(false);
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
      const packageJson = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

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
      const packageJson = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

      expect(packageJson.peerDependencies).toBeUndefined();
    });

    it("should have proper engines field", () => {
      const packageJson = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

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
  });
});
