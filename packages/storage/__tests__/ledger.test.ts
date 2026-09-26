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
} from "../src/ledger.js";
import type { LedgerEntry, LedgerPayload } from "@vellum/protocol";
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
      const entry1 = createTestEntry(0, "CLAIM", {
        type: "SPEC_CREATED",
        slug: "test",
      } as LedgerPayload);
      const entry2 = createTestEntry(
        1,
        "APPROVAL",
        { approver: "alice" } as LedgerPayload,
        entry1.hash!,
      );

      await writeFile(ledgerPath, `${JSON.stringify(entry1)}\n${JSON.stringify(entry2)}\n`);

      const entries = await readLedger(ledgerPath);
      expect(entries.length).toBe(2);
      expect(entries[0].seq).toBe(0);
      expect(entries[1].seq).toBe(1);
    });
  });

  describe("getLastEntry", () => {
    it("should return null for empty ledger", async () => {
      const entry = await getLastEntry(ledgerPath);
      expect(entry).toBeNull();
    });

    it("should return last entry", async () => {
      const entry1 = createTestEntry(0, "CLAIM", { type: "SPEC_CREATED" } as LedgerPayload);
      await writeFile(ledgerPath, `${JSON.stringify(entry1)}\n`);

      const last = await getLastEntry(ledgerPath);
      expect(last?.seq).toBe(0);
    });
  });

  describe("appendLedgerEntry", () => {
    it("should append first entry with genesis predecessor", async () => {
      const entry = await appendLedgerEntry(ledgerPath, {
        seq: 0,
        kind: "CLAIM",
        timestamp: new Date().toISOString(),
        payload: { type: "SPEC_CREATED", slug: brand<string, "SpecSlug">("test") },
      });

      expect(entry.seq).toBe(0);
      expect(entry.predecessorHash).toBe("0".repeat(64));
      expect(entry.hash).toBeDefined();
    });

    it("should append subsequent entries with correct predecessor", async () => {
      const entry1 = await appendLedgerEntry(ledgerPath, {
        seq: 0,
        kind: "CLAIM",
        timestamp: new Date().toISOString(),
        payload: { type: "SPEC_CREATED", slug: brand<string, "SpecSlug">("test") },
      });

      const entry2 = await appendLedgerEntry(ledgerPath, {
        seq: 1,
        kind: "APPROVAL",
        timestamp: new Date().toISOString(),
        payload: {
          approver: "alice",
          artifactKind: "requirements",
          artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
          signalCommit: brand<string, "CommitSha">("b".repeat(40)),
        },
      });

      expect(entry2.predecessorHash).toBe(entry1.hash);
    });
  });

  describe("computeEntryHash", () => {
    it("should produce valid SHA-256 hash", () => {
      const entry = createTestEntry(0, "CLAIM", { type: "SPEC_CREATED" } as LedgerPayload);
      const hash = computeEntryHash(entry);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should be deterministic", () => {
      const entry = createTestEntry(0, "CLAIM", { type: "SPEC_CREATED" } as LedgerPayload);
      expect(computeEntryHash(entry)).toBe(computeEntryHash(entry));
    });

    it("should differ for different entries", () => {
      const entry1 = createTestEntry(0, "CLAIM", { type: "SPEC_CREATED" } as LedgerPayload);
      const entry2 = createTestEntry(1, "CLAIM", { type: "SPEC_CREATED" } as LedgerPayload);

      expect(computeEntryHash(entry1)).not.toBe(computeEntryHash(entry2));
    });
  });

  describe("verifyLedgerIntegrity", () => {
    it("should pass for valid chain", async () => {
      const entry1 = await appendLedgerEntry(ledgerPath, {
        seq: 0,
        kind: "CLAIM",
        timestamp: new Date().toISOString(),
        payload: { type: "SPEC_CREATED", slug: brand<string, "SpecSlug">("test") },
      });

      await appendLedgerEntry(ledgerPath, {
        seq: 1,
        kind: "APPROVAL",
        timestamp: new Date().toISOString(),
        payload: {
          approver: "alice",
          artifactKind: "requirements",
          artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
          signalCommit: brand<string, "CommitSha">("b".repeat(40)),
        },
      });

      const result = await verifyLedgerIntegrity(ledgerPath);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should detect broken chain", async () => {
      const entry1 = createTestEntry(0, "CLAIM", { type: "SPEC_CREATED" } as LedgerPayload);
      const entry2 = createTestEntry(
        1,
        "CLAIM",
        { type: "SPEC_CREATED" } as LedgerPayload,
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
        seq: 0,
        kind: "CLAIM",
        timestamp: new Date().toISOString(),
        payload: { type: "SPEC_CREATED", slug: brand<string, "SpecSlug">("test") },
      });

      const result = await detectFork(ledgerPath);
      expect(result.hasFork).toBe(false);
    });
  });
});

// Helper to create test entries
function createTestEntry(
  seq: number,
  kind: LedgerEntry["kind"],
  payload: LedgerPayload,
  predecessorHash?: ReturnType<typeof brand<string, "Checksum">>,
): LedgerEntry {
  const entry: LedgerEntry = {
    seq: brand<number, "EntrySeq">(seq),
    kind,
    timestamp: new Date().toISOString(),
    predecessorHash: predecessorHash ?? brand<string, "Checksum">("0".repeat(64)),
    payload,
    hash: brand<string, "Checksum">("a".repeat(64)),
  };

  if (!predecessorHash) {
    // Compute actual hash
    const hash = computeEntryHash({ ...entry, hash: undefined } as LedgerEntry);
    entry.hash = hash;
  }

  return entry;
}
