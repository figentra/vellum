/**
 * Tests for release gate.
 * @see requirements.md Requirements 7.1-7.5
 */

import { describe, it, expect } from "vitest";
import { ReleaseGate } from "../release-gate";
import type { ReleaseConfirmation } from "../confirmation/release-presenter";
import { checkObservability } from "../validation/observability-checker";
import { checkChangeset, validateChangesetContent } from "../validation/changeset-checker";

const standard = { spec_slug: "001-x", risk_class: "standard" as const };
const critical = { spec_slug: "001-x", risk_class: "critical" as const };

const confirmation: ReleaseConfirmation = {
  package_name: "@figentra/vellum",
  version: "1.2.0",
  commit: "a".repeat(40),
  tag: "v1.2.0",
  environment: "production",
  migrations: [],
};

describe("release gate", () => {
  it("is inconclusive, not passing, when given nothing to check", async () => {
    const result = await new ReleaseGate(standard).evaluate();

    expect(result.gate_id).toBe("release-gate");
    expect(result.status).toBe("inconclusive");
    expect(result.findings).toEqual([]);
  });

  it("refuses a critical release that declares no rollback path", async () => {
    const result = await new ReleaseGate(critical, { rollbackPath: null }).evaluate();

    expect(result.status).toBe("fail");
    expect(result.findings.map((f) => f.rule_id)).toContain("RELEASE_GATE_NO_ROLLBACK");
  });

  it("does not assume a critical release has a rollback path when none was read", async () => {
    const result = await new ReleaseGate(critical).evaluate();

    expect(result.status).not.toBe("pass");
    expect(result.not_checked.map((n) => n.check)).toContain("rollback path (criterion 7.5)");
  });

  it("rejects an invalid version and a wrong increment", async () => {
    expect(
      (await new ReleaseGate(standard, { version: { next: "1.x" } }).evaluate()).findings.map(
        (f) => f.rule_id,
      ),
    ).toContain("RELEASE_GATE_VERSION_INVALID");
    expect(
      (
        await new ReleaseGate(standard, {
          version: { next: "2.0.0", previous: "1.1.0", bump: "minor" },
        }).evaluate()
      ).findings.map((f) => f.rule_id),
    ).toContain("RELEASE_GATE_VERSION_INVALID");
  });

  it("fails an unhealthy observability probe", async () => {
    const result = await new ReleaseGate(standard, {
      observability: {
        endpoints: [{ name: "health", url: "/health", expectedStatus: 200 }],
        probes: new Map([["health", { kind: "response", status: 503, responseTimeMs: 12 }]]),
      },
    }).evaluate();

    expect(result.findings.map((f) => f.rule_id)).toContain("RELEASE_GATE_OBSERVABILITY_FAIL");
  });

  it("shows exact confirmation values and rejects one whose tag does not name the version", async () => {
    const result = await new ReleaseGate(standard, {
      confirmation: { ...confirmation, tag: "v9.9.9" },
    }).evaluate();

    expect(result.findings.map((f) => f.rule_id)).toContain("RELEASE_GATE_CONFIRMATION_INVALID");
  });

  it("never passes while criterion 7.1 checks are unimplemented", async () => {
    const result = await new ReleaseGate(standard, {
      version: { next: "1.2.0", previous: "1.1.0", bump: "minor" },
      changesets: { required: false },
      rollbackPath: null,
      observability: {
        endpoints: [{ name: "health", url: "/health", expectedStatus: 200 }],
        probes: new Map([["health", { kind: "response", status: 200, responseTimeMs: 12 }]]),
      },
      confirmation,
    }).evaluate();

    expect(result.findings).toEqual([]);
    expect(result.status).toBe("inconclusive");
    expect(result.not_checked.every((n) => n.reason.includes("not implemented"))).toBe(true);
  });
});

describe("executeRelease", () => {
  const gate = new ReleaseGate(standard);

  it("proceeds when a human confirmed exactly the values being executed", () => {
    expect(gate.executeRelease(confirmation, { ...confirmation }, { isAssistant: false })).toEqual({
      proceed: true,
    });
  });

  it("aborts when an executed value differs from the shown one", () => {
    const result = gate.executeRelease(
      confirmation,
      { ...confirmation, commit: "b".repeat(40) },
      {
        isAssistant: false,
      },
    );
    expect(result.proceed).toBe(false);
    expect(result.reason).toMatch(/commit/);
  });

  it("aborts when an assistant session answered the confirmation", () => {
    const result = gate.executeRelease(confirmation, confirmation, { isAssistant: true });
    expect(result.proceed).toBe(false);
    expect(result.reason).toMatch(/human/);
  });
});

describe("checkObservability", () => {
  it("does not assume an unprobed endpoint is healthy", () => {
    const result = checkObservability(
      [{ name: "health", url: "/health", expectedStatus: 200 }],
      new Map(),
    );
    expect(result.outcome.status).toBe("not_checked");
    expect(result.endpoints[0]?.healthy).toBeNull();
  });
});

describe("checkChangeset", () => {
  it("does not assume a required changeset exists when none was read", () => {
    expect(checkChangeset(true, undefined).status).toBe("not_checked");
  });

  it("fails a required changeset the change does not add", () => {
    expect(checkChangeset(true, []).status).toBe("fail");
  });

  it("accepts a well-formed changeset and rejects one with no summary", () => {
    expect(
      checkChangeset(true, [
        { path: ".changeset/a.md", content: '---\n"@vellum/engine": minor\n---\n\nAdd a thing.\n' },
      ]).status,
    ).toBe("pass");
    expect(validateChangesetContent('---\n"@vellum/engine": minor\n---\n').errors).toContain(
      "has no summary",
    );
  });
});
