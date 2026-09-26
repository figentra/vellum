/**
 * @vellum/cli — Command handler tests
 */

import { describe, it, expect } from "vitest";
import { lint } from "../commands/lint.js";
import { status } from "../commands/status.js";
import { approve } from "../commands/approve.js";
import { verify } from "../commands/verify.js";
import { check } from "../commands/check.js";
import { adopt } from "../commands/adopt.js";
import { doctor } from "../commands/doctor.js";
import { sync } from "../commands/sync.js";
import { task } from "../commands/task.js";
import { EXIT_STATUS } from "@vellum/protocol";
import type { CliContext } from "../context.js";

// Mock context for testing
const mockContext: CliContext = {
  json: false,
  cwd: "/test",
  ci: false,
  interactive: true,
  stdout: process.stdout,
  stderr: process.stderr,
};

const mockJsonContext: CliContext = {
  ...mockContext,
  json: true,
};

const mockNonInteractiveContext: CliContext = {
  ...mockContext,
  interactive: false,
};

describe("lint command", () => {
  it("should return success for valid spec", async () => {
    const result = await lint({ json: false }, mockContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });

  it("should return success with JSON output", async () => {
    const result = await lint({ json: true }, mockJsonContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });

  it("should filter by artifact type", async () => {
    const result = await lint({ json: true, type: "requirements" }, mockJsonContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });
});

describe("status command", () => {
  it("should return success without spec", async () => {
    const result = await status({ json: false }, mockContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });

  it("should return success for valid spec", async () => {
    const result = await status({ spec: "016", json: false }, mockContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });

  it("should return success with JSON output", async () => {
    const result = await status({ spec: "016", json: true }, mockJsonContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });
});

describe("approve command", () => {
  it("should refuse approval in non-interactive mode", async () => {
    const result = await approve(
      { spec: "016", artifact: "requirements", reject: false },
      mockNonInteractiveContext,
    );
    expect(result).toBe(EXIT_STATUS.FAILURE);
  });

  it("should refuse without rationale for rejection", async () => {
    const result = await approve(
      { spec: "016", artifact: "requirements", reject: true },
      mockContext,
    );
    expect(result).toBe(EXIT_STATUS.FAILURE);
  });

  it("should refuse invalid artifact", async () => {
    const result = await approve({ spec: "016", artifact: "invalid", reject: false }, mockContext);
    expect(result).toBe(EXIT_STATUS.FAILURE);
  });

  it("should succeed with valid approval", async () => {
    const result = await approve(
      { spec: "016", artifact: "requirements", reject: false },
      mockContext,
    );
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });
});

describe("verify command", () => {
  it("should return success for valid spec", async () => {
    const result = await verify({ json: false }, mockContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });

  it("should return success with JSON output", async () => {
    const result = await verify({ json: true }, mockJsonContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });
});

describe("check command", () => {
  it("should return success for valid check", async () => {
    const result = await check({ json: false }, mockContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });

  it("should return success with JSON output", async () => {
    const result = await check({ json: true }, mockJsonContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });
});

describe("adopt command", () => {
  it("should return success with JSON output", async () => {
    const result = await adopt({ spec: "016", json: true }, mockJsonContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });

  it("should return success without JSON", async () => {
    const result = await adopt({ spec: "016", json: false }, mockContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });
});

describe("doctor command", () => {
  it("should run all diagnostics", async () => {
    const result = await doctor({ json: false }, mockContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });

  it("should return JSON output", async () => {
    const result = await doctor({ json: true }, mockJsonContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });
});

describe("sync command", () => {
  it("should sync to all targets by default", async () => {
    const result = await sync({ check: false, json: true }, mockJsonContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });

  it("should run in check mode", async () => {
    const result = await sync({ check: true, json: true }, mockJsonContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });

  it("should filter by target", async () => {
    const result = await sync({ target: "kiro", check: false, json: true }, mockJsonContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });
});

describe("task.start", () => {
  it("should start a task", async () => {
    const result = await task.start({ spec: "016", taskId: "1" }, mockContext);
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });
});

describe("task.complete", () => {
  it("should refuse non-zero exit", async () => {
    const result = await task.complete(
      { spec: "016", taskId: "1", command: "test", exit: 1 },
      mockContext,
    );
    expect(result).toBe(EXIT_STATUS.FAILURE);
  });

  it("should complete with exit 0", async () => {
    const result = await task.complete(
      { spec: "016", taskId: "1", command: "test", exit: 0 },
      mockContext,
    );
    expect(result).toBe(EXIT_STATUS.SUCCESS);
  });
});
