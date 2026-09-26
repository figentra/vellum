/**
 * @vellum/mcp — Read-only MCP server
 *
 * Exposes Vellum's read-only queries to AI assistants as MCP tools over
 * stdio. Every tool runs the same @vellum/storage query as the CLI; nothing
 * here writes. Approvals and task evidence are recorded with the CLI.
 * Implemented with Node builtins only (no MCP SDK).
 */

export { VERSION } from "./version.js";
export {
  TOOLS,
  callTool,
  type ToolDefinition,
  type ToolInputSchema,
  type ToolResult,
} from "./tools.js";
export {
  handleMessage,
  PROTOCOL_VERSIONS,
  SERVER_INFO,
  ERROR,
  type JsonRpcResponse,
  type ServerOptions,
} from "./jsonrpc.js";
export { serveStdio, type StdioOptions } from "./stdio.js";
export { main } from "./main.js";
