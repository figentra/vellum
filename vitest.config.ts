import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/**", "**/*.test.ts", "**/*.spec.ts", "**/__tests__/**", "**/dist/**"],
    },
    globals: true,
    environment: "node",
    include: ["packages/engine/src/**/*.test.ts", "packages/engine/__tests__/**/*.test.ts"],
  },
});
