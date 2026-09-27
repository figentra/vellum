/**
 * Scenario 8 — frontmatter values keep the type the protocol gives them. The
 * checksum is a string of 64 hex digits; one that happens to be all digits,
 * or digits around an `e`, is still a string. The parser once read such a
 * value as a number, so the artifact had "no valid Lifecycle Frontmatter"
 * and every command went INCONCLUSIVE on a spec that was fine.
 *
 * A body whose SHA-256 is all digits cannot be written on purpose, so the
 * frontmatter records a stale all-digit checksum: status must read it,
 * compare it with the computed one and call it stale — not refuse the file.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifiedSpec } from "./support/lifecycle.js";
import { TestRepo } from "./support/repo.js";
import { SLUG } from "./support/spec.js";

describe("scenario 8: numeric-looking frontmatter values", () => {
  let base: TestRepo;
  const repos: TestRepo[] = [];
  beforeAll(() => {
    base = verifiedSpec();
  });
  afterAll(() => {
    for (const repo of repos) repo.dispose();
    base?.dispose();
  });

  for (const checksum of ["0123456789".repeat(7).slice(0, 64), `${"1".repeat(40)}e${"2".repeat(23)}`]) {
    it(`reads checksum ${checksum.slice(0, 12)}… as a string and reports it stale`, () => {
      const repo = base.clone();
      repos.push(repo);
      const path = `${repo.specDir}/design.md`;
      repo.write(path, repo.read(path).replace(/^checksum: .*$/m, `checksum: ${checksum}`));

      const status = repo.vellum(["status", SLUG, "--json"]);
      expect(status.stdout).not.toContain("INCONCLUSIVE");
      expect(status.status).toBe(0);
      const design = JSON.parse(status.stdout).specs[0].artifacts.design;
      expect(design.checksum).toMatch(/^[0-9a-f]{64}$/);
      expect(design.checksumCurrent).toBe(false);
      expect(repo.vellum(["status", SLUG]).stdout).toContain("frontmatter checksum is stale");

      // Approvals bind the body's computed checksum, not the frontmatter's
      // record of it, so the spec still verifies.
      const verify = repo.vellum(["verify", SLUG, "--strict", "--json"]);
      expect(JSON.parse(verify.stdout).result).toBe("PASS");
      expect(verify.status).toBe(0);
      // lint compares the recorded value with the body, so it reads the value too.
      const lint = repo.vellum(["lint", SLUG, "--json"]);
      expect(lint.status).toBe(1);
      expect(JSON.parse(lint.stdout).findings).toEqual([
        expect.objectContaining({ file: path, rule: "CHECKSUM_MISMATCH" }),
      ]);
    });
  }
});
