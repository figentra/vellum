/**
 * The MCP stdio transport: one JSON-RPC message per line on stdin, one per
 * line on stdout. Node builtins only. Messages are answered in order.
 */

import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import {
  ERROR,
  handleMessage,
  type JsonRpcResponse,
  type ServerOptions,
} from "./jsonrpc.js";

export interface StdioOptions extends ServerOptions {
  readonly input: Readable;
  readonly output: Writable;
}

/** Serve until `input` ends; resolves once every response is written. */
export function serveStdio(options: StdioOptions): Promise<void> {
  const lines = createInterface({ input: options.input, crlfDelay: Infinity });
  let queue: Promise<void> = Promise.resolve();
  const send = (response: JsonRpcResponse | null) => {
    if (response !== null)
      options.output.write(`${JSON.stringify(response)}\n`);
  };

  lines.on("line", (line) => {
    if (line.trim() === "") return;
    queue = queue.then(async () => {
      let message: unknown;
      try {
        message = JSON.parse(line);
      } catch {
        send({
          jsonrpc: "2.0",
          id: null,
          error: { code: ERROR.PARSE, message: "parse error" },
        });
        return;
      }
      send(await handleMessage(message, options));
    });
  });

  return new Promise((resolve) => {
    lines.on("close", () => {
      void queue.then(resolve);
    });
  });
}
