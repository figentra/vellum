/**
 * Scenario 2 — an agent cannot approve. The CLI refuses an approval from a
 * detected assistant session even at a terminal, and from a non-terminal,
 * writing nothing. And the guarantee that does not depend on detection: an
 * approval record committed unsigned, or signed by a key the Approval Policy
 * does not list, does not count — verify fails naming why.
 */

import { afterEach, describe, expect, it } from "vitest";
import { draftSpec } from "./support/lifecycle.js";
import { HUMAN, INTRUDER_KEY, KINDS, type TestRepo } from "./support/repo.js";
import { SLUG } from "./support/spec.js";

const ASSISTANT_ENVIRONMENTS: ReadonlyArray<Record<string, string>> = [
  { CLAUDECODE: "1" },
  { CLAUDE_CODE_ENTRYPOINT: "cli" },
  { ASSISTANT_SESSION: "true" },
  { OPENCODE: "1" },
  { KIRO_AGENT: "1" },
];

describe("scenario 2: an agent cannot approve", () => {
  let repo: TestRepo;
  afterEach(() => repo?.dispose());

  it("refuses in an assistant session even at a terminal, and outside a terminal, leaving the ledger untouched", () => {
    repo = draftSpec();
    const before = repo.fingerprint();
    // The adoption entry `vellum adopt` wrote; no approval may join it.
    const ledgerBefore = repo.ledgerLines();
    expect(repo.ledger().map((e) => e.kind)).toEqual(["adoption"]);
    for (const env of ASSISTANT_ENVIRONMENTS) {
      const result = repo.vellumInTerminal(["approve", SLUG, "requirements"], env);
      expect(result.status, JSON.stringify(env)).toBe(1);
      expect(result.output).toContain(`an assistant session was detected (${Object.keys(env)[0]})`);
    }
    const piped = repo.vellum(["approve", SLUG, "requirements"]);
    expect(piped.status).toBe(1);
    expect(piped.stderr).toContain("not an interactive terminal session");
    const ci = repo.vellumInTerminal(["approve", SLUG, "requirements"], { CI: "true" });
    expect(ci.status).toBe(1);
    expect(ci.output).toContain("not an interactive terminal session");
    expect(repo.ledgerLines()).toEqual(ledgerBefore);
    expect(repo.fingerprint()).toBe(before);
  });

  it("does not count an approval committed unsigned: verify FAIL, UNSIGNED_COMMIT", () => {
    repo = draftSpec();
    for (const kind of KINDS) {
      expect(repo.vellumInTerminal(["approve", SLUG, kind]).status).toBe(0);
      repo.commitLedger(`approve: ${SLUG} ${kind}`, null);
    }
    const verify = repo.vellum(["verify", SLUG, "--strict", "--json"]);
    expect(verify.status).toBe(1);
    const report = JSON.parse(verify.stdout);
    expect(report.result).toBe("FAIL");
    const findings = JSON.stringify(report.specs[0].findings);
    expect(findings).toContain("UNSIGNED_COMMIT");
    const status = JSON.parse(repo.vellum(["status", SLUG, "--json"]).stdout).specs[0];
    expect(status.approvals.requirements).toEqual({ current: 0, required: 1, complete: false });
  });

  it("does not count an approval signed by a key the policy does not list: verify FAIL, SIGNER_NOT_AUTHORIZED", () => {
    repo = draftSpec();
    for (const kind of KINDS) {
      expect(repo.vellumInTerminal(["approve", SLUG, kind]).status).toBe(0);
      repo.commitLedger(`approve: ${SLUG} ${kind}`, INTRUDER_KEY);
    }
    // The commit is genuinely signed — just not by the approver's listed key.
    expect(repo.git(["cat-file", "commit", "HEAD"])).toContain("-----BEGIN SSH SIGNATURE-----");
    const verify = repo.vellum(["verify", SLUG, "--strict", "--json"]);
    expect(verify.status).toBe(1);
    expect(JSON.stringify(JSON.parse(verify.stdout).specs[0].findings)).toContain("SIGNER_NOT_AUTHORIZED");
    const status = JSON.parse(repo.vellum(["status", SLUG, "--json"]).stdout).specs[0];
    expect(status.approvals.tasks.current).toBe(0);
    const approvals = repo.ledger().filter((e) => e.kind === "approval");
    expect(approvals).toHaveLength(KINDS.length);
    expect(approvals.every((e) => e.identity === HUMAN.email)).toBe(true);
  });
});
