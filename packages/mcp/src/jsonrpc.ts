/**
 * The MCP message layer: JSON-RPC 2.0 requests in, responses out, with the
 * methods a tools-only MCP server answers. Transport-free; see stdio.ts.
 */

import { VERSION } from "./version.js";
import { TOOLS, callTool } from "./tools.js";

/** MCP protocol revisions this server speaks, newest first. */
export const PROTOCOL_VERSIONS = [
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
] as const;

export const SERVER_INFO = { name: "vellum", version: VERSION } as const;

export const ERROR = {
  PARSE: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
} as const;

type Id = string | number | null;

export interface JsonRpcResponse {
  readonly jsonrpc: "2.0";
  readonly id: Id;
  readonly result?: unknown;
  readonly error?: { readonly code: number; readonly message: string };
}

export interface ServerOptions {
  /** Directory whose repository every tool reads */
  readonly cwd: string;
}

function failure(id: Id, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Answer one JSON-RPC message. Returns null for a notification (no `id`),
 * which gets no response.
 */
export async function handleMessage(
  message: unknown,
  options: ServerOptions,
): Promise<JsonRpcResponse | null> {
  if (
    !isObject(message) ||
    message.jsonrpc !== "2.0" ||
    typeof message.method !== "string"
  ) {
    const id =
      isObject(message) &&
      (typeof message.id === "string" || typeof message.id === "number")
        ? message.id
        : null;
    return failure(id, ERROR.INVALID_REQUEST, "not a JSON-RPC 2.0 request");
  }
  if (!("id" in message)) return null;
  const id = message.id as Id;
  const params = isObject(message.params) ? message.params : {};

  try {
    switch (message.method) {
      case "initialize": {
        const requested = params.protocolVersion;
        const protocolVersion =
          typeof requested === "string" &&
          (PROTOCOL_VERSIONS as readonly string[]).includes(requested)
            ? requested
            : PROTOCOL_VERSIONS[0];
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion,
            capabilities: { tools: { listChanged: false } },
            serverInfo: SERVER_INFO,
            instructions:
              "Read-only Vellum queries. Approvals and task evidence are recorded with the vellum CLI, never through this server.",
          },
        };
      }
      case "ping":
        return { jsonrpc: "2.0", id, result: {} };
      case "tools/list":
        return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
      case "tools/call": {
        if (typeof params.name !== "string")
          return failure(
            id,
            ERROR.INVALID_PARAMS,
            "tools/call needs a tool name",
          );
        return {
          jsonrpc: "2.0",
          id,
          result: await callTool(
            options.cwd,
            params.name,
            params.arguments ?? {},
          ),
        };
      }
      default:
        return failure(
          id,
          ERROR.METHOD_NOT_FOUND,
          `method not found: ${message.method}`,
        );
    }
  } catch (cause) {
    return failure(
      id,
      ERROR.INTERNAL,
      cause instanceof Error ? cause.message : String(cause),
    );
  }
}
