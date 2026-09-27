/**
 * Scenario 5 — when vellum cannot evaluate, it says so with exit status 2
 * and names the input, never a PASS (criteria 19.3, 19.4 of 002-vellum-core):
 * an artifact that cannot be parsed, an Approval Policy that cannot be
 * parsed, a repository with no spec.
 *
 * A *missing* Approval Policy is the one absent input here, and the protocol
 * decides it differently: criterion 19.6 makes an absent input that is not a
 * Permitted Absence a FAIL naming the input, and criterion 7.4 refuses an
 * approval without one (exit 1). The case below pins that.
 */

import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifiedSpec } from "./support/lifecycle.js";
import { TestRepo } from "./support/repo.js";
import { SLUG } from "./support/spec.js";

describe("scenario 5: INCONCLUSIVE and the missing policy", () => {
  let base: TestRepo;
  const repos: TestRepo[] = [];
  beforeAll(() => {
    base = verifiedSpec();
  });
  afterAll(() => {
    for (const repo of repos) repo.dispose();
    base?.dispose();
  });
  const copy = (): TestRepo => {
    const repo = base.clone();
    repos.push(repo);
    return repo;
  };

  it("an unparseable artifact: verify, status and check exit 2 naming it; lint reports it", () => {
    const repo = copy();
    const path = `${repo.specDir}/design.md`;
    repo.write(path, repo.read(path).replace(/^version: 1$/m, "version one"));
    const problem = "design.md has no valid Lifecycle Frontmatter";
    for (const args of [["verify", SLUG, "--strict"], ["status", SLUG], ["check"]]) {
      const result = repo.vellum(args);
      expect(result.status, args.join(" ")).toBe(2);
      expect(result.stdout, args.join(" ")).toContain("INCONCLUSIVE");
      expect(result.stdout, args.join(" ")).toContain(problem);
    }
    const verify = JSON.parse(repo.vellum(["verify", SLUG, "--json"]).stdout);
    expect(verify.result).toBe("INCONCLUSIVE");
    const lint = repo.vellum(["lint", SLUG, "--json"]);
    expect(lint.status).toBe(1);
    expect(JSON.parse(lint.stdout).findings).toEqual([
      expect.objectContaining({ file: path, rule: "FRONTMATTER_MISSING" }),
    ]);
  });

  it("an unparseable Approval Policy: verify, status and check exit 2 naming it", () => {
    const repo = copy();
    repo.write(".sdlc/policy.json", "{ this is not json");
    for (const args of [["verify", SLUG], ["status", SLUG], ["check"]]) {
      const result = repo.vellum(args);
      expect(result.status, args.join(" ")).toBe(2);
      expect(`${result.stdout}${result.stderr}`, args.join(" ")).toMatch(/policy\.json.*invalid|invalid.*policy\.json/i);
    }
  });

  it("no spec at all: verify, lint and check exit 2 saying there is nothing to examine", () => {
    const repo = TestRepo.create();
    repos.push(repo);
    const verify = repo.vellum(["verify"]);
    expect(verify.status).toBe(2);
    expect(verify.stderr).toContain("INCONCLUSIVE — no spec to verify");
    const lint = repo.vellum(["lint", "--json"]);
    expect(lint.status).toBe(2);
    expect(JSON.parse(lint.stdout)).toMatchObject({ status: "INCONCLUSIVE", examined: { specs: 0, artifacts: 0 } });
    const check = repo.vellum(["check"]);
    expect(check.status).toBe(2);
    expect(check.stderr).toContain("no spec to check");
    expect(check.stdout).not.toContain("PASS");
  });

  it("a missing Approval Policy: verify and check FAIL naming it; approve is refused", () => {
    const repo = copy();
    unlinkSync(join(repo.repo, ".sdlc/policy.json"));
    const verify = repo.vellum(["verify", SLUG]);
    expect(verify.status).toBe(1);
    expect(verify.stdout).toContain("Approval Policy: missing (.sdlc/policy.json); no approval can be valid");
    expect(verify.stdout).toContain("Result: FAIL");
    const check = JSON.parse(repo.vellum(["check", "--json"]).stdout);
    expect(check).toMatchObject({ exitStatus: 1, policy: "missing" });
    const status = JSON.parse(repo.vellum(["status", SLUG, "--json"]).stdout);
    expect(status.policy).toBe("missing");
    expect(status.specs[0].effective.failedPrecondition).toContain("the Approval Policy is missing");
    const before = repo.ledgerLines();
    const approve = repo.vellumInTerminal(["approve", SLUG, "requirements"]);
    expect(approve.status).toBe(1);
    expect(approve.output).toContain("refused — the Approval Policy is missing");
    expect(repo.ledgerLines()).toEqual(before);
  });
});
