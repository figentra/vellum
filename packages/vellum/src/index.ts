/**
 * @figentra/vellum — the one package meant for publication.
 *
 * Bundles @vellum/protocol, engine, storage, renderers, cli and mcp into
 * dist/ at build time, so the package has no runtime dependencies. Bins:
 * `vellum` (the CLI) and `vellum-mcp` (the read-only MCP server on stdio).
 *
 * The programmatic API re-exported here is what those bins run.
 */

export { run, main as runCli, HELP, VERSION as CLI_VERSION } from "@vellum/cli";
export {
  callTool,
  handleMessage,
  serveStdio,
  TOOLS,
  VERSION as MCP_VERSION,
  type ToolDefinition,
  type ToolResult,
} from "@vellum/mcp";

export const VERSION = "0.0.0" as const;
