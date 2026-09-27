#!/usr/bin/env node
/**
 * vellum-mcp — the read-only Vellum MCP server on stdio.
 */

import { main } from "./main.js";

main().catch((error: unknown) => {
  process.stderr.write(
    `vellum-mcp: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
