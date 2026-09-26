/**
 * @vellum/mcp — Read-only MCP server
 *
 * Exposes Vellum capabilities to AI assistants via MCP:
 * - status, context, trace, workspace map
 * - Refuses writes (mutations must go through CLI)
 *
 * ## Design Principles
 *
 * - Read-only interface
 * - All queries return JSON
 * - State queries are deterministic
 * - No mutations through MCP
 */

export const VERSION = "0.1.0" as const;

// Re-export types for programmatic use
export type { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
