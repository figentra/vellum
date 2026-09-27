#!/usr/bin/env node
/**
 * @figentra/vellum — the `vellum-mcp` bin: the bundled read-only MCP server
 * on stdio, serving the repository containing the working directory.
 */

import { main } from "@vellum/mcp";

main().catch((error: unknown) => {
  process.stderr.write(
    `vellum-mcp: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
