/**
 * @vellum/storage — Tests for Filesystem Operations
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createFilesystem,
  parseFrontmatter,
  serializeFrontmatter,
  computeChecksum,
  stripFrontmatter,
} from "../fs.ts";

describe("Filesystem Operations", () => {
  let testDir: string;
  let fs: ReturnType<typeof createFilesystem>;

  beforeEach(async () => {
    testDir = join(tmpdir(), `vellum-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    fs = createFilesystem(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("readFile/writeFile", () => {
    it("should write and read file", async () => {
      const content = "Hello, World!";
      await fs.writeFile("test.txt", content);
      const read = await fs.readFile("test.txt");
      expect(read).toBe(content);
    });

    it("should handle UTF-8 content", async () => {
      const content = "Hello, 世界!";
      await fs.writeFile("test.txt", content);
      const read = await fs.readFile("test.txt");
      expect(read).toBe(content);
    });

    it("should be atomic (no partial writes)", async () => {
      const content = "x".repeat(10_000);
      // Write should be atomic
      await fs.writeFile("test.txt", content);
      const read = await fs.readFile("test.txt");
      expect(read.length).toBe(content.length);
    });
  });

  describe("exists", () => {
    it("should return true for existing files", async () => {
      await fs.writeFile("test.txt", "content");
      expect(await fs.exists("test.txt")).toBe(true);
    });

    it("should return false for non-existing files", async () => {
      expect(await fs.exists("missing.txt")).toBe(false);
    });
  });

  describe("readdir", () => {
    it("should list files in directory", async () => {
      await fs.writeFile("file1.txt", "");
      await fs.writeFile("file2.txt", "");
      const files = await fs.readdir(".");
      expect(files).toContain("file1.txt");
      expect(files).toContain("file2.txt");
    });

    it("should return empty array for non-existing directory", async () => {
      const files = await fs.readdir("missing");
      expect(files).toEqual([]);
    });
  });

  describe("delete", () => {
    it("should delete existing file", async () => {
      await fs.writeFile("test.txt", "content");
      await fs.delete("test.txt");
      expect(await fs.exists("test.txt")).toBe(false);
    });

    it("should not error on non-existing file", async () => {
      await expect(fs.delete("missing.txt")).resolves.not.toThrow();
    });
  });

  describe("mkdirp", () => {
    it("should create nested directories", async () => {
      await fs.mkdirp("a/b/c");
      expect(await fs.exists("a/b/c")).toBe(true);
    });

    it("should be idempotent", async () => {
      await fs.mkdirp("test");
      await fs.mkdirp("test"); // Should not error
      expect(await fs.exists("test")).toBe(true);
    });
  });

  describe("updateSection", () => {
    it("should update section between markers", async () => {
      const content = `Header
<!-- START -->
old content
<!-- END -->
Footer`;
      await fs.writeFile("test.md", content);
      await fs.updateSection("test.md", {
        startMarker: "<!-- START -->",
        endMarker: "<!-- END -->",
        content: "\nnew content\n",
      });
      const updated = await fs.readFile("test.md");
      expect(updated).toContain("new content");
      expect(updated).toContain("Header");
      expect(updated).toContain("Footer");
    });
  });
});

describe("Frontmatter Parsing", () => {
  it("should parse YAML frontmatter", () => {
    const content = `---
version: 1
checksum: abc123
state: DRAFT
---
Body content`;
    const result = parseFrontmatter(content);
    expect(result).not.toBeNull();
    expect(result?.frontmatter.version).toBe(1);
    expect(result?.frontmatter.checksum).toBe("abc123");
    expect(result?.frontmatter.state).toBe("DRAFT");
    expect(result?.body).toBe("Body content");
  });

  it("keeps an all-digit or digits-e-digits checksum a string, through a round trip", () => {
    for (const checksum of ["0".repeat(64), `${"1".repeat(40)}e${"2".repeat(23)}`]) {
      const result = parseFrontmatter(`---\nversion: 2\nchecksum: ${checksum}\nstate: DRAFT\n---\nBody`);
      expect(result?.frontmatter.checksum).toBe(checksum);
      expect(result?.frontmatter.version).toBe(2);
      const again = parseFrontmatter(serializeFrontmatter(result!.frontmatter, result!.body));
      expect(again).toEqual(result);
    }
  });

  it("should return null for content without frontmatter", () => {
    const content = "No frontmatter here";
    expect(parseFrontmatter(content)).toBeNull();
  });

  it("should serialize frontmatter", () => {
    const frontmatter = { version: 1, state: "DRAFT" };
    const body = "Content";
    const serialized = serializeFrontmatter(frontmatter, body);
    expect(serialized).toContain("---");
    expect(serialized).toContain("version: 1");
    expect(serialized).toContain("Content");
  });
});

describe("Checksum", () => {
  it("should compute SHA-256 checksum", () => {
    const content = "Hello, World!";
    const checksum = computeChecksum(content);
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should be deterministic", () => {
    const content = "test";
    expect(computeChecksum(content)).toBe(computeChecksum(content));
  });

  it("should differ for different content", () => {
    expect(computeChecksum("a")).not.toBe(computeChecksum("b"));
  });
});

describe("computeChecksum outside vitest", () => {
  it("runs as a plain ES module, where require is not defined", () => {
    // vitest supplies a CommonJS `require` to modules it loads, so a stray
    // require() passes here and fails in the published ESM build. Load the
    // source in a bare Node ES-module context instead.
    const source = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "..", "fs.ts")).href;
    const run = spawnSync(
      process.execPath,
      [
        "--experimental-transform-types",
        "--no-warnings",
        "--input-type=module",
        "-e",
        `import { computeChecksum } from ${JSON.stringify(source)}; process.stdout.write(computeChecksum("a"));`,
      ],
      { encoding: "utf8" },
    );

    expect(run.stderr).toBe("");
    expect(run.stdout).toBe(createHash("sha256").update("a", "utf8").digest("hex"));
  });
});

describe("stripFrontmatter", () => {
  it("should remove frontmatter block", () => {
    const content = `---
version: 1
---
Body`;
    expect(stripFrontmatter(content)).toBe("Body");
  });

  it("should handle content without frontmatter", () => {
    const content = "No frontmatter";
    expect(stripFrontmatter(content)).toBe("No frontmatter");
  });
});
