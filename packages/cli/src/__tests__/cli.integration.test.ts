/**
 * The CLI against a real git repository per test: every command either does
 * what it says — verified by reading the repository afterwards — or refuses.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { checkLedgerIntegrity } from "@vellum/engine";
import { readLedgerHead } from "@vellum/storage";
import { Fixture, REQUIREMENTS, SLUG } from "./fixture.js";

function hasSshKeygen(): boolean {
  try {
    execFileSync("which", ["ssh-keygen"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const SSH = hasSshKeygen();
if (!SSH) console.warn("cli.integration.test: SKIPPING — ssh-keygen is not installed");

const TASKS_PATH = `.agents/specs/${SLUG}/tasks.md`;
const ALL = ["requirements", "design", "tasks"] as const;

describe.skipIf(!SSH)("vellum CLI against a temp repository", () => {
  let fx: Fixture;

  beforeEach(() => {
    fx = new Fixture();
  });

  afterEach(() => {
    fx.dispose();
  });

  const marker = (taskId: string) =>
    new RegExp(`^- \\[(.)\\] ${taskId} `, "m").exec(fx.read(TASKS_PATH))?.[1];

  describe("status", () => {
    it("reports no valid approval before any, and one each after signed approvals", async () => {
      const before = await fx.cli(["status", SLUG, "--json"]);
      expect(before.status).toBe(0);
      const report = JSON.parse(before.stdout).specs[0];
      expect(report.recordedState).toBe("IN_PROGRESS");
      expect(report.effectiveState).toBeNull();
      expect(report.approvals.requirements).toEqual({ current: 0, required: 1, complete: false });
      expect(report.verification).toEqual({ required: 2, completed: 0, failed: 0, complete: false });
      expect(report.ledger).toEqual({ entries: 0, valid: true, failures: [] });

      await fx.approve(ALL, "alice");
      const after = JSON.parse((await fx.cli(["status", "001", "--json"])).stdout).specs[0];
      expect(after.approvals.requirements).toEqual({ current: 1, required: 1, complete: true });
      expect(after.approvals.tasks).toEqual({ current: 1, required: 1, complete: true });
    });

    it("says in human output that the effective state is not computed", async () => {
      const result = await fx.cli(["status"]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Effective state: not computed");
    });

    it("exits 2 naming the fragment when no spec matches", async () => {
      const result = await fx.cli(["status", "999"]);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("no spec matches '999'");
    });
  });

  describe("lint", () => {
    it("passes a well-formed spec and says what it examined", async () => {
      const result = await fx.cli(["lint", SLUG]);
      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("PASS: 0 finding(s); examined 1 spec(s), 3 artifact(s), 2 task line(s)");
    });

    it("fails an artifact edited without its checksum, and a fourth file in the spec", async () => {
      const design = fx.read(`.agents/specs/${SLUG}/design.md`);
      fx.write(`.agents/specs/${SLUG}/design.md`, design.replace("First", "Changed"));
      fx.write(`.agents/specs/${SLUG}/notes.md`, "scratch\n");

      const result = await fx.cli(["lint", SLUG, "--json"]);
      expect(result.status).toBe(1);
      const rules = JSON.parse(result.stdout).findings.map((f: { rule: string }) => f.rule);
      expect(rules).toContain("CHECKSUM_MISMATCH");
      expect(rules).toContain("SPEC_EXTRA_FILE");
    });

    it("with --type validates only that artifact", async () => {
      const design = fx.read(`.agents/specs/${SLUG}/design.md`);
      fx.write(`.agents/specs/${SLUG}/design.md`, design.replace("First", "Changed"));
      expect((await fx.cli(["lint", SLUG, "--type=tasks"])).status).toBe(0);
      expect((await fx.cli(["lint", SLUG, "--type=design"])).status).toBe(1);
    });

    it("is INCONCLUSIVE (exit 2) when there is nothing under management to examine", async () => {
      fx.write(".agents/specs/002-legacy/requirements.md", "# Legacy\n");
      const result = await fx.cli(["lint", "002"]);
      expect(result.status).toBe(2);
      expect(result.stdout).toContain("legacy spec, not validated: 002-legacy");
    });
  });

  describe("task start and task complete", () => {
    it("refuses to start before the artifacts hold valid approvals, writing nothing", async () => {
      const result = await fx.cli(["task", "start", SLUG, "1"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("failed the pre-execution check");
      expect(await fx.ledger()).toEqual([]);
      expect(marker("1")).toBe(" ");
    });

    it("complete runs the command, records evidence, flips the marker and keeps the chain valid", async () => {
      await fx.approve(ALL, "alice");
      const start = await fx.cli(["task", "start", SLUG, "1"]);
      expect(start.stderr).toBe("");
      expect(start.status).toBe(0);
      expect(marker("1")).toBe("-");

      const head = fx.git(["rev-parse", "HEAD"]).trim();
      const result = await fx.cli(["task", "complete", SLUG, "1", "--command=echo verified"]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Task 1 verified: exit status 0");
      expect(marker("1")).toBe("x");

      const ledger = await fx.ledger();
      const evidence = ledger[ledger.length - 1] as unknown as Record<string, unknown>;
      expect(evidence).toMatchObject({
        kind: "evidence",
        task_id: "1",
        command: "echo verified",
        exit_status: 0,
        commit: head,
        uncommitted: false,
        timed_out: false,
        output_sha256: createHash("sha256").update("verified\n").digest("hex"),
      });
      expect(evidence).not.toHaveProperty("stdout");
      expect(checkLedgerIntegrity(ledger, await readLedgerHead(fx.ledgerPath))).toEqual({
        valid: true,
        failures: [],
      });
    });

    it("a failing command records the failed attempt and leaves the marker", async () => {
      await fx.approve(ALL, "alice");
      await fx.cli(["task", "start", SLUG, "2"]);

      const result = await fx.cli(["task", "complete", SLUG, "2", "--command", "echo broken >&2; exit 3"]);
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("Task 2 FAILED: exit status 3");
      expect(result.stderr).toContain("broken");
      expect(marker("2")).toBe("-");
      const ledger = await fx.ledger();
      expect(ledger[ledger.length - 1]).toMatchObject({ kind: "evidence", task_id: "2", exit_status: 3 });
    });

    it("does not set [x] when the working tree differs from HEAD outside the spec", async () => {
      await fx.approve(ALL, "alice");
      await fx.cli(["task", "start", SLUG, "1"]);
      fx.write("src/new.ts", "export {};\n");

      const result = await fx.cli(["task", "complete", SLUG, "1", "--command=true"]);
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("src/new.ts");
      expect(marker("1")).toBe("-");
      const ledger = await fx.ledger();
      expect(ledger[ledger.length - 1]).toMatchObject({ exit_status: 0, uncommitted: true });
    });

    it("refuses to complete a task that was never started", async () => {
      const result = await fx.cli(["task", "complete", SLUG, "1", "--command=true"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("has no Task Binding");
      expect(await fx.ledger()).toEqual([]);
    });

    it("stops a command at its timeout and records exit status 124", async () => {
      await fx.approve(ALL, "alice");
      await fx.cli(["task", "start", SLUG, "1"]);
      const result = await fx.cli(["task", "complete", SLUG, "1", "--command=sleep 30", "--timeout=1"]);
      expect(result.status).toBe(1);
      const ledger = await fx.ledger();
      expect(ledger[ledger.length - 1]).toMatchObject({ exit_status: 124, timed_out: true });
    }, 15_000);

    it("has no --exit option: a caller cannot report an exit status", async () => {
      const result = await fx.cli(["task", "complete", SLUG, "1", "--command=true", "--exit=0"]);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("no --exit option");
    });
  });

  describe("approve", () => {
    it("refuses outside an interactive terminal, writing nothing", async () => {
      const result = await fx.cli(["approve", SLUG, "requirements"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("an approval requires a human");
      expect(await fx.ledger()).toEqual([]);
    });

    it("refuses in a detected assistant session even on a terminal", async () => {
      const result = await fx.cli(["approve", SLUG, "requirements"], {
        interactive: true,
        assistantSession: "CLAUDECODE",
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("assistant session");
      expect(await fx.ledger()).toEqual([]);
    });

    it("on a terminal, writes a record that is not valid until a signed commit adds it", async () => {
      const result = await fx.cli(["approve", SLUG, "requirements"], { interactive: true });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("It is NOT valid yet");
      const ledger = await fx.ledger();
      expect(ledger[0]).toMatchObject({
        kind: "approval",
        identity: "alice@example.com",
        artifact: "requirements.md",
        approval_signal: { commit: null },
      });

      const uncommitted = JSON.parse((await fx.cli(["verify", SLUG, "--json"])).stdout);
      expect(JSON.stringify(uncommitted.specs[0].findings)).toContain("not committed");
    });

    it("explains in --help that the signed commit, not the command, makes it valid", async () => {
      const result = await fx.cli(["approve", "--help"]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("NOT valid when this command finishes");
    });
  });

  describe("verify --strict", () => {
    async function completeAll(): Promise<void> {
      for (const id of ["1", "2"]) {
        expect((await fx.cli(["task", "start", SLUG, id])).status).toBe(0);
        expect((await fx.cli(["task", "complete", SLUG, id, "--command=true"])).status).toBe(0);
      }
      fx.commit("record task evidence");
    }

    it("passes a spec approved by signed commits with every task evidenced", async () => {
      await fx.approve(ALL, "alice");
      await completeAll();

      const result = await fx.cli(["verify", SLUG, "--strict"]);
      expect(result.stdout).toContain("Result: PASS");
      expect(result.status).toBe(0);
    });

    it("fails an approval whose commit is unsigned", async () => {
      await fx.approve(ALL, null);
      await completeAll().catch(() => undefined);

      const result = await fx.cli(["verify", SLUG, "--strict", "--json"]);
      expect(result.status).toBe(1);
      const messages = JSON.stringify(JSON.parse(result.stdout).specs[0].findings);
      expect(messages).toContain("UNSIGNED_COMMIT");
    });

    it("fails an approval signed by a key the policy does not list for the approver", async () => {
      await fx.approve(ALL, "mallory");

      const result = await fx.cli(["verify", SLUG, "--strict", "--json"]);
      expect(result.status).toBe(1);
      expect(JSON.stringify(JSON.parse(result.stdout).specs[0].findings)).toContain("SIGNER_NOT_AUTHORIZED");
    });

    it("fails an approval whose signed commit also changes other files", async () => {
      fx.write("src/feature.ts", "export const x = 1;\n");
      await fx.approve(ALL, "alice", { alsoCommit: "src/feature.ts" });

      const result = await fx.cli(["verify", SLUG, "--json"]);
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("an Approval Signal commit may change only the spec's ledger");
    });

    it("fails once an approved artifact is edited after approval", async () => {
      await fx.approve(ALL, "alice");
      await completeAll();
      expect((await fx.cli(["verify", SLUG, "--strict"])).status).toBe(0);

      fx.writeArtifact("requirements", REQUIREMENTS.replace("do one thing", "do two things"));
      fx.commit("edit requirements after approval");

      const result = await fx.cli(["verify", SLUG, "--strict", "--json"]);
      expect(result.status).toBe(1);
      expect(JSON.stringify(JSON.parse(result.stdout).specs[0].findings)).toContain("CHECKSUM_MISMATCH");
    });

    it("fails a ledger whose last entries were removed", async () => {
      await fx.approve(ALL, "alice");
      await completeAll();
      const lines = readFileSync(fx.ledgerPath, "utf8").split("\n").filter((l) => l !== "");
      writeFileSync(fx.ledgerPath, `${lines.slice(0, -2).join("\n")}\n`);

      const result = await fx.cli(["verify", SLUG, "--json"]);
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("LEDGER_INTEGRITY");
    });

    it("is INCONCLUSIVE (exit 2) when no spec is in progress", async () => {
      fx.writeArtifact("requirements", REQUIREMENTS);
      const draft = fx.read(`.agents/specs/${SLUG}/requirements.md`).replace("IN_PROGRESS", "DRAFT");
      fx.write(`.agents/specs/${SLUG}/requirements.md`, draft);
      const result = await fx.cli(["verify"]);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("no spec to verify");
    });
  });

  describe("doctor", () => {
    it("passes a healthy repository and marks unimplemented categories NOT_CHECKED", async () => {
      const result = await fx.cli(["doctor", "--json"]);
      expect(result.status).toBe(0);
      const diagnostics = JSON.parse(result.stdout).diagnostics as { category: string; outcome: string }[];
      expect(diagnostics.find((d) => d.category === "Approval Policy")?.outcome).toBe("PASS");
      expect(diagnostics.find((d) => d.category === "Ledger integrity")?.outcome).toBe("PASS");
      expect(diagnostics.find((d) => d.category === "Repository hooks")?.outcome).toBe("NOT_CHECKED");
    });

    it("fails a damaged ledger and an untracked spec document", async () => {
      await fx.approve(["requirements"], "alice");
      writeFileSync(fx.ledgerPath, readFileSync(fx.ledgerPath, "utf8").replace("alice@", "mallory@"));
      fx.write(`.agents/specs/${SLUG}/draft.md`, "notes\n");

      const result = await fx.cli(["doctor"]);
      expect(result.status).toBe(1);
      expect(result.stdout).toMatch(/FAIL\s+Ledger integrity/);
      expect(result.stdout).toMatch(/FAIL\s+Untracked spec documents: .*draft\.md/);
    });
  });

  describe("command surface", () => {
    it("exits 2 with 'not implemented' for check, adopt and sync", async () => {
      for (const command of ["check", "adopt", "sync"]) {
        const result = await fx.cli([command]);
        expect(result.status).toBe(2);
        expect(result.stderr).toContain("not implemented");
        expect(result.stdout).toBe("");
      }
    });

    it("exits 2 for an unknown command, listing the implemented ones", async () => {
      const result = await fx.cli(["frobnicate"]);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("Implemented commands: status, lint, verify");
    });

    it("exits 2 for an option the command does not declare", async () => {
      const result = await fx.cli(["status", "--fast"]);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("no option --fast");
    });

    it("lists in help only commands that exist, and names the ones that do not", async () => {
      const result = await fx.cli(["--help"]);
      expect(result.status).toBe(0);
      expect(result.stdout).not.toMatch(/^\s+(check|adopt|sync)\b/m);
      expect(result.stdout).toContain("Not implemented in this version (exit 2): check, adopt, sync.");
    });
  });
});
