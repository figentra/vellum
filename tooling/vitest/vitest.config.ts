import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: "threads",
    // Vitest 4 replaced poolOptions.threads.{min,max}Threads with maxWorkers.
    maxWorkers: 4,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/**/__tests__/**"],
    },
    setupFiles: [],
    reporters: ["default"],
    passWithNoTests: true,
  },
});
