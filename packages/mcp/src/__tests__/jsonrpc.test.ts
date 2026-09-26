/**
 * The JSON-RPC message layer: the methods a tools-only MCP server answers.
 */

import { describe, expect, it } from "vitest";
import { tmpdir } from "node:os";
import { ERROR, PROTOCOL_VERSIONS, handleMessage } from "../jsonrpc.js";
import { TOOLS } from "../tools.js";

const options = { cwd: tmpdir() };

describe("handleMessage", () => {
  it("initialize echoes a supported protocol version and offers tools only", async () => {
    const response = await handleMessage(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-03-26" },
      },
      options,
    );
    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "vellum" },
      },
    });
    expect(
      Object.keys((response!.result as { capabilities: object }).capabilities),
    ).toEqual(["tools"]);
  });

  it("initialize answers an unsupported version with the newest it speaks", async () => {
    const response = await handleMessage(
      {
        jsonrpc: "2.0",
        id: "a",
        method: "initialize",
        params: { protocolVersion: "1999-01-01" },
      },
      options,
    );
    expect(
      (response!.result as { protocolVersion: string }).protocolVersion,
    ).toBe(PROTOCOL_VERSIONS[0]);
  });

  it("tools/list returns the tool definitions; ping answers empty", async () => {
    expect(
      await handleMessage(
        { jsonrpc: "2.0", id: 2, method: "tools/list" },
        options,
      ),
    ).toEqual({
      jsonrpc: "2.0",
      id: 2,
      result: { tools: TOOLS },
    });
    expect(
      await handleMessage({ jsonrpc: "2.0", id: 3, method: "ping" }, options),
    ).toEqual({
      jsonrpc: "2.0",
      id: 3,
      result: {},
    });
  });

  it("gives no response to a notification", async () => {
    expect(
      await handleMessage(
        { jsonrpc: "2.0", method: "notifications/initialized" },
        options,
      ),
    ).toBeNull();
  });

  it("rejects an unknown method, a malformed request and a call without a tool name", async () => {
    expect(
      await handleMessage(
        { jsonrpc: "2.0", id: 4, method: "resources/list" },
        options,
      ),
    ).toMatchObject({
      error: { code: ERROR.METHOD_NOT_FOUND },
    });
    expect(
      await handleMessage({ id: 5, method: "ping" }, options),
    ).toMatchObject({
      id: 5,
      error: { code: ERROR.INVALID_REQUEST },
    });
    expect(await handleMessage([1, 2], options)).toMatchObject({
      id: null,
      error: { code: ERROR.INVALID_REQUEST },
    });
    expect(
      await handleMessage(
        { jsonrpc: "2.0", id: 6, method: "tools/call", params: {} },
        options,
      ),
    ).toMatchObject({ error: { code: ERROR.INVALID_PARAMS } });
  });
});
