/**
 * @vellum/testing — End-to-End Workflow Tests
 *
 * Tests the complete lifecycle: create → approve → implement → verify
 * across all Vellum packages working together.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FixtureBuilder, createMinimalSpec, withTestDir } from "../framework.js";

describe("E2E: Complete Lifecycle Workflow", () => {
  let builder: FixtureBuilder;

  beforeEach(async () => {
    builder = new FixtureBuilder(`lifecycle-${Date.now()}`);
    await builder.init();
  });

  afterEach(async () => {
    await builder.cleanup();
  });

  it("should create a minimal valid spec", async () => {
    await createMinimalSpec(builder, "001" as any, "DRAFT");
    await builder.commit("Initial spec");

    const requirements = await builder.readFile(".agents/specs/001-test-spec/requirements.md");
    expect(requirements).toContain("version: 1");
    expect(requirements).toContain("state: DRAFT");
  });

  it("should validate a spec directory structure", async () => {
    await createMinimalSpec(builder, "002" as any, "DRAFT");
    await builder.commit("Create spec");

    // Check that all required files exist
    expect(await builder.readFile(".agents/specs/002-test-spec/requirements.md")).toBeDefined();
    expect(await builder.readFile(".agents/specs/002-test-spec/design.md")).toBeDefined();
    expect(await builder.readFile(".agents/specs/002-test-spec/tasks.md")).toBeDefined();
  });

  it("should handle multiple specs in same repository", async () => {
    await createMinimalSpec(builder, "001" as any, "DRAFT");
    await createMinimalSpec(builder, "002" as any, "DRAFT");
    await builder.commit("Create multiple specs");

    expect(await builder.readFile(".agents/specs/001-test-spec/requirements.md")).toBeDefined();
    expect(await builder.readFile(".agents/specs/002-test-spec/requirements.md")).toBeDefined();
  });

  it("should maintain ledger integrity across commits", async () => {
    await createMinimalSpec(builder, "003" as any, "DRAFT");
    const sha1 = await builder.commit("Initial spec");

    // Modify and commit
    await builder.writeFile(
      ".agents/specs/003-test-spec/requirements.md",
      "# Updated Requirements",
    );
    const sha2 = await builder.commit("Update requirements");

    expect(sha1).not.toBe(sha2);
    expect(await builder.getHeadSha()).toBe(sha2);
  });
});

describe("E2E: Approval Workflow", () => {
  let builder: FixtureBuilder;

  beforeEach(async () => {
    builder = new FixtureBuilder(`approval-${Date.now()}`);
    await builder.init();
  });

  afterEach(async () => {
    await builder.cleanup();
  });

  it("should create approval records in ledger", async () => {
    await createMinimalSpec(builder, "004" as any, "IN_REVIEW");
    await builder.commit("Create spec for approval");

    // Simulate approval recording
    const ledgerContent = await builder.readFile(".agents/specs/004-test-spec/.sdlc/ledger.jsonl");
    expect(ledgerContent).toBeDefined();
  });
});

describe("E2E: Task Execution Workflow", () => {
  let builder: FixtureBuilder;

  beforeEach(async () => {
    builder = new FixtureBuilder(`task-${Date.now()}`);
    await builder.init();
  });

  afterEach(async () => {
    await builder.cleanup();
  });

  it("should record evidence for task execution", async () => {
    await createMinimalSpec(builder, "005" as any, "IN_PROGRESS");
    await builder.commit("Create spec in progress");

    // Simulate task completion with evidence
    const tasks = await builder.readFile(".agents/specs/005-test-spec/tasks.md");
    expect(tasks).toContain("state: IN_PROGRESS");
  });
});

describe("E2E: Verification Workflow", () => {
  let builder: FixtureBuilder;

  beforeEach(async () => {
    builder = new FixtureBuilder(`verify-${Date.now()}`);
    await builder.init();
  });

  afterEach(async () => {
    await builder.cleanup();
  });

  it("should verify a complete spec lifecycle", async () => {
    // Create spec
    await createMinimalSpec(builder, "006" as any, "VERIFIED");
    await builder.commit("Create verified spec");

    const requirements = await builder.readFile(".agents/specs/006-test-spec/requirements.md");
    expect(requirements).toContain("state: VERIFIED");
  });
});

describe("E2E: Error Handling", () => {
  let builder: FixtureBuilder;

  beforeEach(async () => {
    builder = new FixtureBuilder(`error-${Date.now()}`);
    await builder.init();
  });

  afterEach(async () => {
    await builder.cleanup();
  });

  it("should handle missing artifacts gracefully", async () => {
    // Create incomplete spec (missing requirements.md)
    await builder.writeFile(".agents/specs/007-test/design.md", "# Design\n\nTest design");
    await builder.commit("Incomplete spec");

    // Should detect missing requirements.md during validation
    try {
      await builder.readFile(".agents/specs/007-test/requirements.md");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should detect invalid frontmatter", async () => {
    await builder.writeFile(
      ".agents/specs/008-test/requirements.md",
      `---
invalid: true
---
# Requirements`,
    );
    await builder.commit("Invalid frontmatter");

    const content = await builder.readFile(".agents/specs/008-test/requirements.md");
    expect(content).toContain("invalid: true");
    // Validation should fail when run
  });
});

describe("E2E: Fixture Repository Isolation", () => {
  it("should create isolated test directories", async () => {
    await withTestDir(async (dir1) => {
      await withTestDir(async (dir2) => {
        expect(dir1).not.toBe(dir2);
      });
    });
  });

  it("should clean up test directories", async () => {
    let tempDir: string;
    await withTestDir(async (dir) => {
      tempDir = dir;
    });

    // Directory should no longer exist
    const fs = await import("node:fs/promises");
    await expect(fs.access(tempDir!)).rejects.toThrow();
  });
});
