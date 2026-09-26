/**
 * Talk to the installed `vellum-mcp` over stdio: one JSON-RPC message per
 * line in, one per line out.
 */

import { spawn } from "node:child_process";
import { join } from "node:path";
import { inject } from "vitest";

export interface RpcResponse {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly result?: Record<string, unknown>;
  readonly error?: { code: number; message: string };
}

/** The handshake every session starts with. */
export const HANDSHAKE: readonly object[] = [
  {
    jsonrpc: "2.0",
    id: 0,
    method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vellum-e2e", version: "0" } },
  },
  { jsonrpc: "2.0", method: "notifications/initialized" },
];

/**
 * Send `messages` (after the handshake) to a fresh server in `cwd`, close its
 * stdin, and return every response keyed by id.
 */
export function mcpSession(
  cwd: string,
  env: NodeJS.ProcessEnv,
  messages: readonly object[],
): Promise<{ responses: Map<number, RpcResponse>; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(join(inject("vellumBinDir"), "vellum-mcp"), [], { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.on("error", reject);
    child.on("close", (exitCode) => {
      const responses = new Map<number, RpcResponse>();
      for (const line of stdout.split("\n")) {
        if (line === "") continue;
        const message = JSON.parse(line) as RpcResponse;
        responses.set(message.id, message);
      }
      resolve({ responses, stderr, exitCode });
    });
    for (const message of [...HANDSHAKE, ...messages]) child.stdin.write(`${JSON.stringify(message)}\n`);
    child.stdin.end();
  });
}

/** A tools/call request. */
export function call(id: number, name: string, args: object = {}): object {
  return { jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } };
}

/** The JSON document inside a tools/call result. */
export function toolPayload(response: RpcResponse | undefined): { isError: boolean; value: unknown } {
  const result = response?.result as { content: Array<{ text: string }>; isError?: boolean } | undefined;
  if (result === undefined) throw new Error(`no result: ${JSON.stringify(response)}`);
  return { isError: result.isError === true, value: JSON.parse(result.content[0]!.text) as unknown };
}
