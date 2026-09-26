import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

/**
 * Bundle every @vellum/* workspace package into dist/ so the published
 * package has no runtime dependencies; anything else (Node builtins) stays
 * external. Shared code lands in chunks the three entries import.
 */
export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts", "src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  noExternal: [/^@vellum\//],
  splitting: true,
  sourcemap: true,
  dts: { entry: "src/index.ts", resolve: [/^@vellum\//] },
  clean: true,
  // One version everywhere: `vellum --version`, the MCP serverInfo and Evidence Entries.
  define: { __VELLUM_VERSION__: JSON.stringify(version) },
});
