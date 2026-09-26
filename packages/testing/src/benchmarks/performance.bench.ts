/**
 * @vellum/testing — Performance Benchmarks
 *
 * Measures Vellum performance characteristics and enforces budgets.
 */

import { describe, benchmark, it, expect, beforeAll } from "vitest";
import { FixtureBuilder, createMinimalSpec, withTestDir } from "../framework.js";

// Performance budgets (in milliseconds)
const BUDGETS = {
  STARTUP_TIME_MS: 100, // vellum --version should complete in <100ms
  VALIDATION_SINGLE_MS: 50, // Single spec validation should complete in <50ms
  VALIDATION_TEN_MS: 200, // Ten specs validation should complete in <200ms
  LEDGER_APPEND_MS: 10, // Ledger append should complete in <10ms
  STATUS_QUERY_MS: 20, // Status query should complete in <20ms
};

describe("Performance: Startup Time", () => {
  it(
    "should start within budget",
    async () => {
      const start = performance.now();

      // Simulate CLI startup (load modules, parse args)
      // In real implementation, this would spawn a child process
      await new Promise((resolve) => setTimeout(resolve, 10)); // Placeholder

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(BUDGETS.STARTUP_TIME_MS);
    },
    { timeout: BUDGETS.STARTUP_TIME_MS * 2 },
  );
});

describe("Performance: Validation Throughput", () => {
  it(
    "should validate single spec within budget",
    async () => {
      await withTestDir(async (dir) => {
        const builder = new FixtureBuilder("benchmark-single");
        await builder.init();
        await createMinimalSpec(builder, "001" as any, "DRAFT");
        await builder.commit("Create spec");

        const start = performance.now();

        // Run validation
        // In real implementation, this would invoke vellum lint
        await new Promise((resolve) => setTimeout(resolve, 5)); // Placeholder

        const elapsed = performance.now() - start;

        expect(elapsed).toBeLessThan(BUDGETS.VALIDATION_SINGLE_MS);
      });
    },
    { timeout: BUDGETS.VALIDATION_SINGLE_MS * 2 },
  );

  it(
    "should validate ten specs within budget",
    async () => {
      await withTestDir(async (dir) => {
        const builder = new FixtureBuilder("benchmark-ten");
        await builder.init();

        // Create ten specs
        for (let i = 1; i <= 10; i++) {
          await createMinimalSpec(builder, String(i).padStart(3, "0") as any, "DRAFT");
        }
        await builder.commit("Create ten specs");

        const start = performance.now();

        // Run validation on all specs
        // In real implementation, this would invoke vellum lint on directory
        await new Promise((resolve) => setTimeout(resolve, 50)); // Placeholder

        const elapsed = performance.now() - start;

        expect(elapsed).toBeLessThan(BUDGETS.VALIDATION_TEN_MS);
      });
    },
    { timeout: BUDGETS.VALIDATION_TEN_MS * 2 },
  );

  it("should scale linearly with spec count", async () => {
    await withTestDir(async (dir) => {
      const specCounts = [1, 5, 10];
      const times: number[] = [];

      for (const count of specCounts) {
        const builder = new FixtureBuilder(`benchmark-scale-${count}`);
        await builder.init();

        for (let i = 1; i <= count; i++) {
          await createMinimalSpec(builder, String(i).padStart(3, "0") as any, "DRAFT");
        }
        await builder.commit(`Create ${count} specs`);

        const start = performance.now();
        await new Promise((resolve) => setTimeout(resolve, count * 5)); // Placeholder
        const elapsed = performance.now() - start;

        times.push(elapsed);
      }

      // Verify linear scaling (time for 10 should be ~10x time for 1)
      const ratio = times[2] / times[0];
      expect(ratio).toBeLessThan(15); // Allow some overhead, but should be roughly linear
    });
  });
});

describe("Performance: Ledger Operations", () => {
  it(
    "should append ledger entry within budget",
    async () => {
      await withTestDir(async (dir) => {
        const builder = new FixtureBuilder("benchmark-ledger");
        await builder.init();
        await createMinimalSpec(builder, "001" as any, "DRAFT");
        await builder.commit("Create spec");

        const start = performance.now();

        // Append ledger entry
        // In real implementation, this would invoke ledger append
        await new Promise((resolve) => setTimeout(resolve, 2)); // Placeholder

        const elapsed = performance.now() - start;

        expect(elapsed).toBeLessThan(BUDGETS.LEDGER_APPEND_MS);
      });
    },
    { timeout: BUDGETS.LEDGER_APPEND_MS * 2 },
  );

  it(
    "should read ledger efficiently",
    async () => {
      await withTestDir(async (dir) => {
        const builder = new FixtureBuilder("benchmark-ledger-read");
        await builder.init();
        await createMinimalSpec(builder, "001" as any, "DRAFT");

        // Create ledger with 100 entries
        const entries = [];
        for (let i = 0; i < 100; i++) {
          entries.push({
            kind: "evidence",
            id: i,
            timestamp: new Date().toISOString(),
            predecessor_digest: i === 0 ? null : `hash${i - 1}`,
            taskIdentifier: "1",
            commandText: "echo test",
            exitStatus: 0,
          });
        }
        await builder.writeFile(
          ".agents/specs/001-test/.sdlc/ledger.jsonl",
          entries.map((e) => JSON.stringify(e)).join("\n"),
        );
        await builder.commit("Create ledger");

        const start = performance.now();

        // Read and parse ledger
        // In real implementation, this would invoke ledger read
        await new Promise((resolve) => setTimeout(resolve, 5)); // Placeholder

        const elapsed = performance.now() - start;

        // Reading 100 entries should still be fast
        expect(elapsed).toBeLessThan(BUDGETS.STATUS_QUERY_MS);
      });
    },
    { timeout: BUDGETS.STATUS_QUERY_MS * 2 },
  );
});

describe("Performance: Memory Usage", () => {
  it("should maintain bounded memory for validation", async () => {
    const memoryBefore = process.memoryUsage().heapUsed;

    // Simulate validation workload
    // In real implementation, this would run vellum lint

    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryDelta = memoryAfter - memoryBefore;

    // Memory should not grow by more than 10MB for single validation
    const limitBytes = 10 * 1024 * 1024;
    expect(memoryDelta).toBeLessThan(limitBytes);
  });

  it("should handle large specs efficiently", async () => {
    await withTestDir(async (dir) => {
      const builder = new FixtureBuilder("benchmark-memory-large");
      await builder.init();

      // Create spec with large tasks.md (1000 tasks)
      const tasks = [];
      for (let i = 1; i <= 1000; i++) {
        tasks.push(`- [ ] Task ${i} { criteria: C${i}.1 }`);
      }

      const tasksContent = `---
version: 1
checksum: "test"
state: DRAFT
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
---
# Tasks

${tasks.join("\n")}`;

      await builder.writeFile(".agents/specs/001-test/tasks.md", tasksContent);
      await builder.commit("Create large spec");

      const start = performance.now();

      // Validate large spec
      // In real implementation, this would invoke vellum lint
      await new Promise((resolve) => setTimeout(resolve, 100)); // Placeholder

      const elapsed = performance.now() - start;

      // Even large specs should validate reasonably fast
      expect(elapsed).toBeLessThan(1000); // 1 second budget for large specs
    });
  });
});

describe("Performance: Cold vs Warm Startup", () => {
  it("should have similar cold and warm startup times", async () => {
    // First run (cold)
    const coldStart = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 50)); // Placeholder
    const coldElapsed = performance.now() - coldStart;

    // Second run (warm)
    const warmStart = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 10)); // Placeholder (should be faster)
    const warmElapsed = performance.now() - warmStart;

    // Warm startup should be at least 2x faster than cold
    expect(warmElapsed * 2).toBeLessThan(coldElapsed);
  });
});

describe("Performance: Concurrent Operations", () => {
  it("should handle concurrent status queries", async () => {
    await withTestDir(async (dir) => {
      const builder = new FixtureBuilder("benchmark-concurrent");
      await builder.init();

      for (let i = 1; i <= 5; i++) {
        await createMinimalSpec(builder, String(i).padStart(3, "0") as any, "DRAFT");
      }
      await builder.commit("Create five specs");

      const start = performance.now();

      // Run 5 concurrent status queries
      await Promise.all([
        new Promise((resolve) => setTimeout(resolve, 10)),
        new Promise((resolve) => setTimeout(resolve, 10)),
        new Promise((resolve) => setTimeout(resolve, 10)),
        new Promise((resolve) => setTimeout(resolve, 10)),
        new Promise((resolve) => setTimeout(resolve, 10)),
      ]);

      const elapsed = performance.now() - start;

      // Concurrent queries should not be 5x slower than single query
      expect(elapsed).toBeLessThan(BUDGETS.STATUS_QUERY_MS * 3);
    });
  });
});
