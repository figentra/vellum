import { defineConfig } from "vitest/config";

/**
 * Each scenario file runs in its own forked process, in parallel; the tests
 * inside a file run in order. Timeouts are wall-clock budgets for real work
 * — dozens of `vellum`, `git` and `ssh-keygen` process starts per scenario —
 * on a machine that may be heavily loaded, not an expectation of slowness.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.e2e.test.ts"],
    globalSetup: ["./src/global-setup.ts"],
    pool: "forks",
    fileParallelism: true,
    testTimeout: 120_000,
    hookTimeout: 300_000,
  },
});
