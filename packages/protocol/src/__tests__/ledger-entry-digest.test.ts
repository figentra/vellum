/**
 * computeLedgerEntryDigest covers every field of an entry, nested ones
 * included, and does not depend on key order.
 */

import { describe, expect, it } from "vitest";
import { computeLedgerEntryDigest } from "../ledger/canonical-json.js";

const entry = (commit: string) => ({
  id: 1,
  kind: "approval",
  timestamp: "2026-09-26T10:00:00Z",
  predecessor_digest: null,
  identity: "alice@example.com",
  approval_signal: { commit, message_prefix: "approve:" },
});

describe("computeLedgerEntryDigest", () => {
  it("is a 64-character lowercase hex SHA-256", () => {
    expect(computeLedgerEntryDigest(entry("b".repeat(40)))).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when a nested payload field changes", () => {
    expect(computeLedgerEntryDigest(entry("b".repeat(40)))).not.toBe(
      computeLedgerEntryDigest(entry("c".repeat(40))),
    );
  });

  it("changes when a header field changes", () => {
    const a = entry("b".repeat(40));
    expect(computeLedgerEntryDigest({ ...a, id: 2 })).not.toBe(computeLedgerEntryDigest(a));
    expect(computeLedgerEntryDigest({ ...a, predecessor_digest: "0".repeat(64) })).not.toBe(
      computeLedgerEntryDigest(a),
    );
  });

  it("does not depend on key order", () => {
    const a = entry("b".repeat(40));
    const reordered = {
      approval_signal: { message_prefix: "approve:", commit: "b".repeat(40) },
      identity: "alice@example.com",
      predecessor_digest: null,
      timestamp: "2026-09-26T10:00:00Z",
      kind: "approval",
      id: 1,
    };
    expect(computeLedgerEntryDigest(reordered)).toBe(computeLedgerEntryDigest(a));
  });

  it("is the same for an entry and its JSON round trip", () => {
    const a = entry("b".repeat(40));
    expect(computeLedgerEntryDigest(JSON.parse(JSON.stringify(a)) as object)).toBe(
      computeLedgerEntryDigest(a),
    );
  });
});
