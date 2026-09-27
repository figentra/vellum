/**
 * Scenario 9 — every Correctness Property must be cited by a task (criterion
 * 12.3, PROPERTY_NOT_CITED). The design writes `Property N:` headings the way
 * the method's template does (not bold), and the plan cites them the way the
 * method's tasks template does: `_Properties: N_` after the requirements
 * trailer. Before either form was read, no property of a method-written spec
 * was ever counted, so an uncited one passed verify.
 *
 * `vellum approve <spec> tasks` refuses a plan that leaves a property uncited
 * (criterion 20.4), so the uncited plan here is approved while design.md has
 * only Properties 1 and 2; design.md then gains Property 3 and is approved
 * again. The plan's approval still binds its unchanged text, and verify is
 * what catches the gap.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { approve, approveAll, completeAll } from "./support/lifecycle.js";
import { TestRepo } from "./support/repo.js";
import { DESIGN, REQUIREMENTS, SLUG, TASKS } from "./support/spec.js";

const UNCITED = TASKS.replace(" _Properties: 3_", "");
const PROPERTY_3 = `Property 3: Farewell replaces greeting

For all names with --bye, the output is "Goodbye, " followed by the name and "!".

**Validates: Requirements 2.1**

`;
const TWO_PROPERTIES = DESIGN.replace(PROPERTY_3, "");

interface VerifyJson {
  result: string;
  specs: Array<{
    properties: { satisfied: number; total: number };
    approvals: { satisfied: number; total: number };
    supersededApprovals: number;
    findings: Array<{ rule: string; message: string }>;
  }>;
}

describe("scenario 9: property citation", () => {
  let repo: TestRepo;
  beforeAll(() => {
    expect(UNCITED).not.toBe(TASKS);
    expect(TWO_PROPERTIES).not.toBe(DESIGN);
    repo = TestRepo.create();
    repo.writeSpec({ requirements: REQUIREMENTS, design: TWO_PROPERTIES, tasks: UNCITED });
    repo.commitAll(`docs: spec ${SLUG} with two properties`);
    approveAll(repo);
    completeAll(repo);
    repo.rewriteBody("design", DESIGN);
    repo.commitAll(`docs: ${SLUG} design adds Property 3`);
    approve(repo, "design");
  });
  afterAll(() => repo?.dispose());

  const verify = () => {
    const result = repo.vellum(["verify", SLUG, "--strict", "--json"]);
    return { status: result.status, json: JSON.parse(result.stdout) as VerifyJson };
  };

  it("approve refuses the plan while it cites no task for Property 3, writing nothing", () => {
    const before = repo.ledgerLines();
    const result = repo.vellumInTerminal(["approve", SLUG, "tasks"]);
    expect(result.status).toBe(1);
    expect(result.output).toContain("tasks.md cannot be approved");
    expect(result.output).toContain("Property P3 is cited by no task");
    expect(result.output).not.toContain("Criterion");
    expect(repo.ledgerLines()).toEqual(before);
    expect(repo.git(["status", "--porcelain"])).toBe("");
  });

  it("an approved, fully evidenced plan that cites no task for Property 3 fails verify", () => {
    const { status, json } = verify();
    expect(json.result).toBe("FAIL");
    expect(status).toBe(1);
    expect(json.specs[0]!.properties).toEqual({ satisfied: 2, total: 3 });
    expect(json.specs[0]!.findings.map((f) => `${f.rule}: ${f.message}`)).toEqual([
      "PROPERTY_NOT_CITED: Property P3 is cited by no task",
    ]);
  });

  const BYE_TEST = "Unit test for --bye in test/greet.test.mjs _Requirements: 2.1_";
  const body = () => repo.read(`${repo.specDir}/tasks.md`).replace(/^---\n[\s\S]*?\n---\n/, "");

  it("lint names a citation of a property design.md does not define", () => {
    const original = body();
    repo.rewriteBody("tasks", original.replace(BYE_TEST, `${BYE_TEST} _Properties: 4_`));
    const lint = repo.vellum(["lint", SLUG, "--type=tasks", "--json"]);
    expect(lint.status).toBe(1);
    expect(JSON.parse(lint.stdout).findings).toEqual([
      expect.objectContaining({ file: `${repo.specDir}/tasks.md`, rule: "TASK_PROPERTY_UNDEFINED" }),
    ]);
    repo.rewriteBody("tasks", original);
    expect(repo.vellum(["lint", SLUG, "--type=tasks"]).status).toBe(0);
  });

  it("the same spec, amended to cite Property 3 and approved again, passes verify", () => {
    // Amend the approved plan in place: the old tasks approval no longer
    // binds the current text, so verify fails until the human re-approves.
    const amended = body().replace(BYE_TEST, `${BYE_TEST} _Properties: 3_`);
    expect(amended).not.toBe(body());
    repo.rewriteBody("tasks", amended);
    repo.commitAll(`docs: ${SLUG} plan cites Property 3`);

    const stale = verify();
    expect(stale.status).toBe(1);
    expect(stale.json.specs[0]!.findings.map((f) => f.rule)).toEqual([
      "APPROVAL_INVALID",
      "APPROVAL_REQUIRED",
    ]);

    // The human approves the amended plan and commits the record, signed.
    approve(repo, "tasks");

    const { status, json } = verify();
    expect(json.specs[0]!.findings).toEqual([]);
    expect(json.specs[0]!.properties).toEqual({ satisfied: 3, total: 3 });
    // One approval per document counts; the first design and plan approvals are history.
    expect(json.specs[0]!.approvals).toEqual({ satisfied: 3, total: 3 });
    expect(json.specs[0]!.supersededApprovals).toBe(2);
    expect(json.result).toBe("PASS");
    expect(status).toBe(0);
  });
});
