/**
 * Ledger Integrity tests.
 *
 * @see requirements.md Requirements 4.7, 4.8, 4.9, 4.10, 4.12
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, mkdir, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { readLedger, verifyChain } from "../ledger-reader.js";
import { appendEntry, initializeLedger } from "../ledger-writer.js";
import { canonicalSerialize } from "../canonical-json.js";
import { createHash } from "crypto";
import type { LedgerEntry } from "../types.js";

describe("Ledger Integrity (Task 5.4)", () => {
  let testDir: string;
  let testCounter = 0;

  beforeAll(async () => {
    testDir = join(tmpdir(), `vellum-test-ledger-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  function getLedgerPath() {
    testCounter++;
    return join(testDir, `ledger-${testCounter}.jsonl`);
  }

  describe("append entry to empty ledger", () => {
    it("should create first entry with id 1 and null predecessor_digest", async () => {
      const ledgerPath = getLedgerPath();
      const result = await initializeLedger(ledgerPath);
      expect(result.success).toBe(true);

      const appendResult = await appendEntry(ledgerPath, {
        kind: "decision",
        decision: "Use TypeScript",
        rationale: "Type safety improves reliability",
        blocking: false,
      });

      expect(appendResult.success).toBe(true);
      expect(appendResult.entry_id).toBe(1);
      expect(appendResult.digest).toBeDefined();

      const { entries } = await readLedger(ledgerPath);
      expect(entries.length).toBe(1);
      expect(entries[0].id).toBe(1);
      expect(entries[0].predecessor_digest).toBe(null);
    });
  });

  describe("append second entry", () => {
    it("should verify chain and set predecessor_digest to SHA-256 of first entry", async () => {
      const ledgerPath = getLedgerPath();
      let result = await initializeLedger(ledgerPath);
      expect(result.success).toBe(true);

      // First entry
      const first = await appendEntry(ledgerPath, {
        kind: "decision",
        decision: "First decision",
        rationale: "First rationale",
        blocking: false,
      });
      expect(first.success).toBe(true);
      expect(first.entry_id).toBe(1);

      // Second entry
      const second = await appendEntry(ledgerPath, {
        kind: "decision",
        decision: "Second decision",
        rationale: "Second rationale",
        blocking: false,
      });
      expect(second.success).toBe(true);
      expect(second.entry_id).toBe(2);

      const { entries } = await readLedger(ledgerPath);
      expect(entries.length).toBe(2);

      // Verify predecessor_digest
      expect(entries[1].predecessor_digest).toBe(first.digest);

      // Verify chain
      const verifyResult = verifyChain(entries);
      expect(verifyResult.failures).toEqual([]);
      expect(verifyResult.forks).toEqual([]);
    });
  });

  describe("detect corrupted predecessor digest", () => {
    it("should report predecessor_digest_mismatch", async () => {
      const ledgerPath = getLedgerPath();

      // Create a ledger with two entries
      await initializeLedger(ledgerPath);
      await appendEntry(ledgerPath, {
        kind: "decision",
        decision: "First",
        rationale: "First rationale",
        blocking: false,
      });
      await appendEntry(ledgerPath, {
        kind: "decision",
        decision: "Second",
        rationale: "Second rationale",
        blocking: false,
      });

      // Read and corrupt the second entry's predecessor_digest
      const { entries } = await readLedger(ledgerPath);
      entries[1].predecessor_digest = "0".repeat(64); // Invalid digest

      // Write corrupted ledger
      const corruptedContent = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
      await writeFile(ledgerPath, corruptedContent, "utf8");

      // Verify detects corruption
      const { entries: corrupted } = await readLedger(ledgerPath);
      const verifyResult = verifyChain(corrupted);

      expect(verifyResult.failures.length).toBeGreaterThan(0);
      expect(verifyResult.failures.some((f) => f.kind === "predecessor_digest_mismatch")).toBe(
        true,
      );
    });
  });

  describe("detect missing entry", () => {
    it("should report ordering_violation for missing entry", async () => {
      const ledgerPath = getLedgerPath();

      // Create ledger with entries 1 and 3 (2 is missing)
      const entry1 = {
        kind: "decision",
        id: 1,
        predecessor_digest: null,
        timestamp: "2026-09-25T12:00:00.000Z",
        decision: "First",
        rationale: "First rationale",
        blocking: false,
      };

      const entry3 = {
        kind: "decision",
        id: 3, // Should be 2
        predecessor_digest: "dummy",
        timestamp: "2026-09-25T12:01:00.000Z",
        decision: "Third",
        rationale: "Third rationale",
        blocking: false,
      };

      const content = [JSON.stringify(entry1), JSON.stringify(entry3)].join("\n") + "\n";
      await writeFile(ledgerPath, content, "utf8");

      const { entries } = await readLedger(ledgerPath);
      const verifyResult = verifyChain(entries);

      // Should have ordering violation for entry 3 (position 2 but id 3)
      expect(verifyResult.failures.some((f) => f.kind === "ordering_violation")).toBe(true);
    });
  });

  describe("detect fork", () => {
    it("should report fork when two entries have same predecessor_digest", async () => {
      const ledgerPath = getLedgerPath();

      // Create a valid first entry
      const entry1: LedgerEntry = {
        kind: "decision",
        id: 1,
        predecessor_digest: null,
        timestamp: "2026-09-25T12:00:00.000Z",
        decision: "First",
        rationale: "First rationale",
        blocking: false,
      };

      // Compute digest of first entry
      const digest1 = createHash("sha256").update(canonicalSerialize(entry1), "utf8").digest("hex");

      // Create two entries that both claim to be successor of entry 1
      const entry2: LedgerEntry = {
        kind: "decision",
        id: 2,
        predecessor_digest: digest1,
        timestamp: "2026-09-25T12:01:00.000Z",
        decision: "Second A",
        rationale: "Second A rationale",
        blocking: false,
      };

      const entry3: LedgerEntry = {
        kind: "decision",
        id: 3,
        predecessor_digest: digest1, // Same predecessor!
        timestamp: "2026-09-25T12:02:00.000Z",
        decision: "Second B",
        rationale: "Second B rationale",
        blocking: false,
      };

      const content =
        [JSON.stringify(entry1), JSON.stringify(entry2), JSON.stringify(entry3)].join("\n") + "\n";
      await writeFile(ledgerPath, content, "utf8");

      const { entries } = await readLedger(ledgerPath);
      const verifyResult = verifyChain(entries);

      expect(verifyResult.forks.length).toBeGreaterThan(0);
      expect(verifyResult.failures.some((f) => f.kind === "fork")).toBe(true);
    });
  });

  describe("immutable on failure", () => {
    it("should leave ledger unmodified when append fails due to integrity failure", async () => {
      const ledgerPath = getLedgerPath();

      // Create a corrupted ledger
      await writeFile(
        ledgerPath,
        JSON.stringify({
          kind: "decision",
          id: 2, // Invalid: first entry should have id 1
          predecessor_digest: null,
          timestamp: "2026-09-25T12:00:00.000Z",
          decision: "Corrupted",
          rationale: "This ledger is corrupted",
          blocking: false,
        }) + "\n",
        "utf8",
      );

      // Read ledger to get before state
      const before = await readFile(ledgerPath, "utf8");

      // Try to append - should fail
      const result = await appendEntry(ledgerPath, {
        kind: "decision",
        decision: "New decision",
        rationale: "Should fail",
        blocking: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("integrity");

      // Verify ledger wasn't modified
      const after = await readFile(ledgerPath, "utf8");
      expect(after).toBe(before);
    });
  });

  describe("monotonic timestamps", () => {
    it("should report violation for out-of-order timestamps", async () => {
      const ledgerPath = getLedgerPath();

      const entry1: LedgerEntry = {
        kind: "decision",
        id: 1,
        predecessor_digest: null,
        timestamp: "2026-09-25T12:02:00.000Z", // Later
        decision: "First",
        rationale: "First rationale",
        blocking: false,
      };

      const digest1 = createHash("sha256").update(canonicalSerialize(entry1), "utf8").digest("hex");

      const entry2: LedgerEntry = {
        kind: "decision",
        id: 2,
        predecessor_digest: digest1,
        timestamp: "2026-09-25T12:00:00.000Z", // Earlier - violation
        decision: "Second",
        rationale: "Second rationale",
        blocking: false,
      };

      const content = [JSON.stringify(entry1), JSON.stringify(entry2)].join("\n") + "\n";
      await writeFile(ledgerPath, content, "utf8");

      const { entries } = await readLedger(ledgerPath);
      const verifyResult = verifyChain(entries);

      // Property 4: timestamps monotonic
      expect(
        verifyResult.failures.some(
          (f) => f.kind === "ordering_violation" && f.message.includes("timestamp"),
        ),
      ).toBe(true);
    });
  });
});
