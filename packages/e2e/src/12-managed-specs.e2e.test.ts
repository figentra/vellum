/**
 * Scenario 12 — the method's own output comes under management. spec-new
 * writes a bare requirements.md (no Lifecycle Frontmatter, no Machine
 * Folder); `vellum status` names `vellum adopt`, which adds the frontmatter
 * without touching a byte of the body, records IN_REVIEW and no approval.
 *
 * Then an approved document is edited the way a skill edits it (frontmatter
 * block left as it was): approve refuses the stale frontmatter naming
 * `vellum stamp`; stamp records the next version; the old approval still
 * does not count — a stamp cannot revive it — until the human approves again
 * and commits it signed. A Task Marker flip is not an edit: stamp writes
 * nothing for it.
 */

import { afterAll, describe, expect, it } from "vitest";
import { approve, verifiedSpec } from "./support/lifecycle.js";
import { TestRepo } from "./support/repo.js";
import { REQUIREMENTS, SLUG } from "./support/spec.js";

/** A requirements.md shaped as spec-new writes one: intake, discovery table, EARS criteria. */
const SPEC_NEW_REQUIREMENTS = `# Requirements Document

## Intake

**Problem:** The greeter has no way to greet a person by name.

**Risk class:** standard — a new command-line surface; no credentials or personal data.

**Lifecycle path:** full spec, both review gates.

## Discovery

**Current behaviour:** Nothing does this yet.

**Sources:**

| Source           | What it established          |
| ---------------- | ---------------------------- |
| \`package.json\`   | ESM; no runtime dependencies |
| \`.sdlc/policy.json\` | One approver for standard |

## Introduction

A command-line greeter that prints a greeting for a name.

## Glossary

- **Greeter**: the command-line program this spec describes.

## Requirements

### Requirement 1: Greet a person by name

**User Story:** As a user, I want a greeting that names me, so that the output is personal.

#### Acceptance Criteria

1. WHEN the Greeter receives a non-empty name, THE Greeter SHALL print "Hello, <name>!" on one line.

## Assumptions

1. The name arrives as the first argument.
`;

describe("scenario 12: specs the method writes are adopted and stamped by the CLI", () => {
  const repos: TestRepo[] = [];
  afterAll(() => {
    for (const repo of repos) repo.dispose();
  });

  it("adopts the bare requirements.md spec-new writes: body unchanged, IN_REVIEW, no approval", () => {
    const repo = TestRepo.create();
    repos.push(repo);
    const path = `${repo.specDir}/requirements.md`;
    repo.write(path, SPEC_NEW_REQUIREMENTS);

    const legacy = JSON.parse(repo.vellum(["status", SLUG, "--json"]).stdout).specs[0];
    expect(legacy).toMatchObject({ legacy: true, next: `npx vellum adopt ${SLUG}` });
    expect(repo.vellum(["status", SLUG]).stdout).toContain(`npx vellum adopt ${SLUG}`);
    expect(repo.vellumInTerminal(["approve", SLUG, "requirements"]).output).toContain(
      `run npx vellum adopt ${SLUG} first`,
    );

    const adopt = repo.vellum(["adopt", SLUG]);
    expect(adopt.stderr).toBe("");
    expect(adopt.status).toBe(0);
    const text = repo.read(path);
    expect(text.slice(text.indexOf("\n---\n") + 5)).toBe(SPEC_NEW_REQUIREMENTS);
    expect(repo.frontmatter("requirements")).toMatchObject({ version: "1", state: "IN_REVIEW" });
    expect(repo.ledger()).toEqual([
      expect.objectContaining({ kind: "adoption", id: 1, from: "legacy", to: "managed" }),
    ]);
    repo.commitAll(`docs: adopt ${SLUG}`);

    const spec = JSON.parse(repo.vellum(["status", SLUG, "--json"]).stdout).specs[0];
    expect(spec).toMatchObject({ recordedState: "IN_REVIEW", effectiveState: "IN_REVIEW" });
    expect(spec.approvals.requirements.current).toBe(0);
    expect(repo.vellum(["check", SLUG]).status).toBe(0);
    const lint = JSON.parse(repo.vellum(["lint", SLUG, "--type=requirements", "--json"]).stdout);
    expect(lint.findings).toEqual([]);

    // Adopting again changes nothing.
    const before = repo.fingerprint();
    expect(repo.vellum(["adopt", SLUG]).status).toBe(0);
    expect(repo.fingerprint()).toBe(before);
  });

  it("an edited approved document: approve refuses until stamped, the old approval never counts again, a signed re-approval passes", () => {
    const repo = verifiedSpec();
    repos.push(repo);
    const path = `${repo.specDir}/requirements.md`;
    const approvedChecksum = repo.frontmatter("requirements").checksum;
    const edited = REQUIREMENTS.replace("on one line.", "on one line, then a newline.");
    repo.write(path, repo.read(path).replace(REQUIREMENTS, edited));

    const refused = repo.vellumInTerminal(["approve", SLUG, "requirements"]);
    expect(refused.status).toBe(1);
    expect(refused.output).toContain("the frontmatter of requirements.md is stale");
    expect(refused.output).toContain(`npx vellum stamp ${SLUG}`);

    const stamp = repo.vellum(["stamp", SLUG]);
    expect(stamp.status).toBe(0);
    expect(repo.frontmatter("requirements").version).toBe("2");
    const current = repo.frontmatter("requirements").checksum;
    expect(current).not.toBe(approvedChecksum);
    // The recorded state (VERIFIED) is past every in-review state: not lowered.
    expect(repo.frontmatter("requirements").state).toBe("VERIFIED");
    repo.commitAll(`docs: amend ${SLUG} requirements`);

    const failed = repo.vellum(["verify", SLUG, "--strict", "--json"]);
    expect(failed.status).toBe(1);
    expect(JSON.stringify(JSON.parse(failed.stdout).specs[0].findings)).toContain(
      `CHECKSUM_MISMATCH — requirements.md was approved at ${approvedChecksum} and is now ${current}`,
    );

    approve(repo, "requirements");
    expect(repo.ledger().at(-1)).toMatchObject({
      artifact: "requirements.md",
      artifact_version: 2,
    });
    const passed = repo.vellum(["verify", SLUG, "--strict", "--json"]);
    expect(JSON.parse(passed.stdout).result).toBe("PASS");
    expect(passed.status).toBe(0);
  });

  it("a Task Marker flip is not an edit: stamp writes nothing after task complete", () => {
    const repo = verifiedSpec();
    repos.push(repo);
    // verifiedSpec recorded every required task's [x] through vellum task complete.
    expect(repo.marker("1.1")).toBe("x");
    const before = repo.fingerprint();
    const stamp = repo.vellum(["stamp", SLUG, "--json"]);
    expect(stamp.status).toBe(0);
    expect(JSON.parse(stamp.stdout)).toMatchObject({ result: "CURRENT", artifacts: [] });
    expect(repo.fingerprint()).toBe(before);
  });
});
