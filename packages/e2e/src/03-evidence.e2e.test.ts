/**
 * Scenario 3 — evidence is recorded by the engine, not reported by the
 * caller: a failing verification command records a failed attempt and leaves
 * the marker; there is no way to hand vellum an exit status; and a `[x]`
 * typed by hand, with no evidence behind it, fails verification.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { approveAll, draftSpec } from "./support/lifecycle.js";
import type { TestRepo } from "./support/repo.js";
import { PASSING_COMMAND, REQUIRED_TASKS, SLUG } from "./support/spec.js";

describe("scenario 3: evidence is engine-recorded", () => {
  let repo: TestRepo;
  beforeAll(() => {
    repo = draftSpec();
    approveAll(repo);
  });
  afterAll(() => repo?.dispose());

  it("a failing command exits 1, leaves the marker, and records the failed attempt", () => {
    expect(repo.vellum(["task", "start", SLUG, "1.1"]).status).toBe(0);
    const before = repo.ledgerLines().length;
    const result = repo.vellum(["task", "complete", SLUG, "1.1", "--command", "exit 3"]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Task 1.1 FAILED: exit status 3");
    expect(repo.marker("1.1")).toBe("-");
    expect(repo.ledgerLines()).toHaveLength(before + 1);
    expect(repo.ledger().at(-1)).toMatchObject({
      kind: "evidence",
      task_id: "1.1",
      command: "exit 3",
      exit_status: 3,
      timed_out: false,
    });
  });

  it("has no way to report an exit status: --exit is a usage error (exit 2) that writes nothing", () => {
    const before = repo.fingerprint();
    const result = repo.vellum(["task", "complete", SLUG, "1.1", "--command", "true", "--exit", "0"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("task complete has no --exit option");
    expect(result.stdout).toBe("");
    expect(repo.fingerprint()).toBe(before);
  });

  it("a hand-written [x] with no evidence fails verify as an unverified completion", () => {
    // Every other required task completes the real way; 1.1 retries after its failure.
    for (const id of ["1.1", ...REQUIRED_TASKS.filter((t) => t !== "1.1" && t !== "1.2")]) {
      if (id !== "1.1") expect(repo.vellum(["task", "start", SLUG, id]).status).toBe(0);
      expect(repo.vellum(["task", "complete", SLUG, id, "--command", PASSING_COMMAND]).status).toBe(0);
    }
    const tasks = `${repo.specDir}/tasks.md`;
    repo.write(tasks, repo.read(tasks).replace("- [ ] 1.2 ", "- [x] 1.2 "));
    repo.commitAll("chore: mark 1.2 done by hand");
    expect(repo.marker("1.2")).toBe("x");
    // Flipping a marker is progress, not content: the plan's approval still counts.
    const status = JSON.parse(repo.vellum(["status", SLUG, "--json"]).stdout).specs[0];
    expect(status.approvals.tasks.complete).toBe(true);
    expect(status.artifacts.tasks.checksumCurrent).toBe(true);
    expect(status.verification).toMatchObject({ completed: REQUIRED_TASKS.length - 1, complete: false });

    const verify = repo.vellum(["verify", SLUG, "--strict", "--json"]);
    expect(verify.status).toBe(1);
    const findings = JSON.parse(verify.stdout).specs[0].findings as Array<{ rule: string; message: string }>;
    expect(findings.map((f) => `${f.rule}: ${f.message}`)).toEqual([
      "TASK_NOT_VERIFIED: Task 1.2 has no Evidence Entry with exit status 0",
    ]);
  });
});
