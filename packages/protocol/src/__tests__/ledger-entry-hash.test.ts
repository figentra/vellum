/**
 * computeLedgerEntryHash covers every payload field, nested ones included.
 */

import { describe, expect, it } from "vitest";
import { computeLedgerEntryHash, INITIAL_PREDECESSOR_HASH } from "../frontmatter.js";

const entry = (commit: string) => ({
  seq: 1,
  kind: "approval",
  timestamp: "2026-09-26T10:00:00Z",
  predecessorHash: INITIAL_PREDECESSOR_HASH,
  payload: {
    identity: "alice@example.com",
    approval_signal: { commit, message_prefix: "approve:" },
  },
});

describe("computeLedgerEntryHash", () => {
  it("changes when a nested payload field changes", () => {
    expect(computeLedgerEntryHash(entry("b".repeat(40)))).not.toBe(
      computeLedgerEntryHash(entry("c".repeat(40))),
    );
  });

  it("does not depend on key order", () => {
    const a = entry("b".repeat(40));
    const reordered = {
      ...a,
      payload: {
        approval_signal: { message_prefix: "approve:", commit: "b".repeat(40) },
        identity: "alice@example.com",
      },
    };
    expect(computeLedgerEntryHash(reordered)).toBe(computeLedgerEntryHash(a));
  });
});
