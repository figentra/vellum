/**
 * @vellum/storage — Tests for Ledger Operations
 *
 * The chain format is the protocol's: ids from 1, a null predecessor for the
 * first entry, then computeLedgerEntryDigest of the preceding entry.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  readLedger,
  readLedgerHead,
  getLastEntry,
  appendLedgerEntry,
  verifyLedgerIntegrity,
  detectFork,
  getLedgerHeadPath,
  type NewLedgerEntry,
} from "../ledger.ts";
import type { LedgerEntry } from "@vellum/protocol";
import { brand, computeLedgerEntryDigest } from "@vellum/protocol";

const created = (id: number, spec = "test"): NewLedgerEntry => ({
  id,
  kind: "claim",
  timestamp: "2026-09-26T10:00:00Z",
  type: "created",
  spec: brand<string, "SpecSlug">(spec),
});

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
      await appendLedgerEntry(ledgerPath, created(1));
      await appendLedgerEntry(ledgerPath, created(2, "other"));

      const entries = await readLedger(ledgerPath);
      expect(entries.map((e) => e.id)).toEqual([1, 2]);
    });
  });

  describe("getLastEntry", () => {
    it("should return null for empty ledger", async () => {
      const entry = await getLastEntry(ledgerPath);
      expect(entry).toBeNull();
    });

    it("should return last entry", async () => {
      await appendLedgerEntry(ledgerPath, created(1));
      await appendLedgerEntry(ledgerPath, created(2));

      const last = await getLastEntry(ledgerPath);
      expect(last?.id).toBe(2);
    });
  });

  describe("appendLedgerEntry", () => {
    it("should append the first entry with id 1 and a null predecessor", async () => {
      const entry = await appendLedgerEntry(ledgerPath, created(1));

      expect(entry.id).toBe(1);
      expect(entry.predecessor_digest).toBeNull();
      expect("hash" in entry).toBe(false);
    });

    it("should link each later entry to the digest of the entry before it", async () => {
      const entry1 = await appendLedgerEntry(ledgerPath, created(1));
      const entry2 = await appendLedgerEntry(ledgerPath, {
        id: 2,
        kind: "approval",
        timestamp: "2026-09-26T10:00:00Z",
        approver: "alice",
        artifact: "requirements",
        artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
        signalCommit: brand<string, "CommitSha">("b".repeat(40)),
      });

      expect(entry2.predecessor_digest).toBe(computeLedgerEntryDigest(entry1));
    });

    it("should record the last entry's id and digest in the Ledger Head", async () => {
      await appendLedgerEntry(ledgerPath, created(1));
      const entry2 = await appendLedgerEntry(ledgerPath, created(2));

      expect(await readLedgerHead(ledgerPath)).toEqual({
        last_id: 2,
        last_digest: computeLedgerEntryDigest(entry2),
      });
      const lines = (await readFile(ledgerPath, "utf8")).split("\n").filter((l) => l !== "");
      expect(computeLedgerEntryDigest(JSON.parse(lines[1]!) as LedgerEntry)).toBe(
        computeLedgerEntryDigest(entry2),
      );
    });
  });

  describe("verifyLedgerIntegrity", () => {
    it("should pass for valid chain", async () => {
      await appendLedgerEntry(ledgerPath, created(1));
      await appendLedgerEntry(ledgerPath, created(2));

      const result = await verifyLedgerIntegrity(ledgerPath);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should pass for a ledger that does not exist yet", async () => {
      expect(await verifyLedgerIntegrity(ledgerPath)).toEqual({ valid: true, errors: [] });
    });

    it("should detect broken chain", async () => {
      await appendLedgerEntry(ledgerPath, created(1));
      await appendLedgerEntry(ledgerPath, created(2));
      const lines = (await readFile(ledgerPath, "utf8")).split("\n").filter((l) => l !== "");
      const second = JSON.parse(lines[1]!) as Record<string, unknown>;
      lines[1] = JSON.stringify({ ...second, predecessor_digest: "f".repeat(64) });
      await writeFile(ledgerPath, `${lines.join("\n")}\n`);

      const result = await verifyLedgerIntegrity(ledgerPath);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.seq === 1 && /edited/.test(e.message))).toBe(true);
    });

    it("should fail a ledger with entries but no Ledger Head", async () => {
      await appendLedgerEntry(ledgerPath, created(1));
      await rm(getLedgerHeadPath(ledgerPath));

      const result = await verifyLedgerIntegrity(ledgerPath);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.message).toMatch(/no Ledger Head/);
    });
  });

  describe("detectFork", () => {
    it("should detect no fork in valid chain", async () => {
      await appendLedgerEntry(ledgerPath, created(1));
      await appendLedgerEntry(ledgerPath, created(2));

      const result = await detectFork(ledgerPath);
      expect(result.hasFork).toBe(false);
    });

    it("should name both entries of a fork", async () => {
      await appendLedgerEntry(ledgerPath, created(1));
      const second = await appendLedgerEntry(ledgerPath, created(2));
      const rival = { ...second, id: 3, spec: "rival" };
      await writeFile(
        ledgerPath,
        `${await readFile(ledgerPath, "utf8")}${JSON.stringify(rival)}\n`,
      );

      expect(await detectFork(ledgerPath)).toEqual({
        hasFork: true,
        fork: { entry1: 2, entry2: 3 },
      });
    });
  });
});
