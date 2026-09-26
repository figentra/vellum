/**
 * @vellum/storage — Tests for Ledger Operations
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  readLedger,
  getLastEntry,
  appendLedgerEntry,
  computeEntryHash,
  verifyLedgerIntegrity,
  detectFork,
} from "../ledger.ts";
import type { LedgerEntry } from "@vellum/protocol";
import { brand } from "@vellum/protocol";

describe("Ledger Operations", () => {
  let testDir: string;
  let ledgerPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `vellum-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    ledgerPath = join(testDir, "ledger.jsonl");
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("readLedger", () => {
    it("should return empty array for non-existing ledger", async () => {
      const entries = await readLedger(ledgerPath);
      expect(entries).toEqual([]);
    });

    it("should read entries from ledger file", async () => {
      const entry1 = createTestEntry(0, "claim", {
        type: "created",
        spec: brand<string, "SpecSlug">("test"),
      });
      const entry2 = createTestEntry(
        1,
        "approval",
        {
          approver: "alice",
          artifact: "requirements",
          artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
          signalCommit: brand<string, "CommitSha">("b".repeat(40)),
        },
        entry1.hash,
      );

      await writeFile(ledgerPath, `${JSON.stringify(entry1)}\n${JSON.stringify(entry2)}\n`);

      const entries = await readLedger(ledgerPath);
      expect(entries.length).toBe(2);
      expect(entries[0].id).toBe(0);
      expect(entries[1].id).toBe(1);
    });
  });

  describe("getLastEntry", () => {
    it("should return null for empty ledger", async () => {
      const entry = await getLastEntry(ledgerPath);
      expect(entry).toBeNull();
    });

    it("should return last entry", async () => {
      const entry1 = createTestEntry(0, "claim", {
        type: "created",
        spec: brand<string, "SpecSlug">("test"),
      });
      await writeFile(ledgerPath, `${JSON.stringify(entry1)}\n`);

      const last = await getLastEntry(ledgerPath);
      expect(last?.id).toBe(0);
    });
  });

  describe("appendLedgerEntry", () => {
    it("should append first entry with genesis predecessor", async () => {
      const entry = await appendLedgerEntry(ledgerPath, {
        id: 0,
        kind: "claim",
        timestamp: new Date().toISOString(),
        type: "created",
        spec: brand<string, "SpecSlug">("test"),
      });

      expect(entry.id).toBe(0);
      expect(entry.predecessor_digest).toBe("0".repeat(64));
      expect(entry.hash).toBeDefined();
    });

    it("should append subsequent entries with correct predecessor", async () => {
      const entry1 = await appendLedgerEntry(ledgerPath, {
        id: 0,
        kind: "claim",
        timestamp: new Date().toISOString(),
        type: "created",
        spec: brand<string, "SpecSlug">("test"),
      });

      const entry2 = await appendLedgerEntry(ledgerPath, {
        id: 1,
        kind: "approval",
        timestamp: new Date().toISOString(),
        approver: "alice",
        artifact: "requirements",
        artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
        signalCommit: brand<string, "CommitSha">("b".repeat(40)),
      });

      expect(entry2.predecessor_digest).toBe(entry1.hash);
    });
  });

  describe("computeEntryHash", () => {
    it("should produce valid SHA-256 hash", () => {
      const entry = createTestEntry(0, "claim", {
        type: "created",
        spec: brand<string, "SpecSlug">("test"),
      });
      const hash = computeEntryHash(entry);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should be deterministic", () => {
      const entry = createTestEntry(0, "claim", {
        type: "created",
        spec: brand<string, "SpecSlug">("test"),
      });
      expect(computeEntryHash(entry)).toBe(computeEntryHash(entry));
    });

    it("should differ for different entries", () => {
      const entry1 = createTestEntry(0, "claim", {
        type: "created",
        spec: brand<string, "SpecSlug">("test"),
      });
      const entry2 = createTestEntry(1, "claim", {
        type: "created",
        spec: brand<string, "SpecSlug">("test"),
      });

      expect(computeEntryHash(entry1)).not.toBe(computeEntryHash(entry2));
    });
  });

  describe("verifyLedgerIntegrity", () => {
    it("should pass for valid chain", async () => {
      await appendLedgerEntry(ledgerPath, {
        id: 0,
        kind: "claim",
        timestamp: new Date().toISOString(),
        type: "created",
        spec: brand<string, "SpecSlug">("test"),
      });

      await appendLedgerEntry(ledgerPath, {
        id: 1,
        kind: "approval",
        timestamp: new Date().toISOString(),
        approver: "alice",
        artifact: "requirements",
        artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
        signalCommit: brand<string, "CommitSha">("b".repeat(40)),
      });

      const result = await verifyLedgerIntegrity(ledgerPath);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should detect broken chain", async () => {
      const entry1 = createTestEntry(0, "claim", {
        type: "created",
        spec: brand<string, "SpecSlug">("test"),
      });
      const entry2 = createTestEntry(
        1,
        "claim",
        { type: "created", spec: brand<string, "SpecSlug">("test") },
        brand<string, "Checksum">("wrong".padEnd(64, "0")),
      );

      await writeFile(ledgerPath, `${JSON.stringify(entry1)}\n${JSON.stringify(entry2)}\n`);

      const result = await verifyLedgerIntegrity(ledgerPath);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("Predecessor"))).toBe(true);
    });
  });

  describe("detectFork", () => {
    it("should detect no fork in valid chain", async () => {
      await appendLedgerEntry(ledgerPath, {
        id: 0,
        kind: "claim",
        timestamp: new Date().toISOString(),
        type: "created",
        spec: brand<string, "SpecSlug">("test"),
      });

      const result = await detectFork(ledgerPath);
      expect(result.hasFork).toBe(false);
    });
  });
});

// Helper to create test entries
function createTestEntry(
  id: number,
  kind: LedgerEntry["kind"],
  payload: Record<string, unknown>,
  predecessorHash?: ReturnType<typeof brand<string, "Checksum">>,
): LedgerEntry {
  const entry: LedgerEntry = {
    id,
    kind,
    timestamp: new Date().toISOString(),
    predecessor_digest: predecessorHash ?? brand<string, "Checksum">("0".repeat(64)),
    ...payload,
    hash: brand<string, "Checksum">("a".repeat(64)),
  };

  if (!predecessorHash) {
    // Compute actual hash
    const { hash: _, ...rest } = entry;
    const hash = computeEntryHash(rest as LedgerEntry);
    entry.hash = hash;
  }

  return entry;
}
