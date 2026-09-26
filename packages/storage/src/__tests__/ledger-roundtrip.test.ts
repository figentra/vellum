/**
 * One chain format: a ledger written by storage's appendLedgerEntry passes the
 * engine's checkLedgerIntegrity, and every tamper fails both storage's
 * verifier and the engine's check.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { LedgerEntry } from "@vellum/protocol";
import { computeLedgerEntryDigest } from "@vellum/protocol";
import { checkLedgerIntegrity } from "@vellum/engine";
import {
  appendLedgerEntry,
  readLedger,
  readLedgerHead,
  verifyLedgerIntegrity,
  type NewLedgerEntry,
} from "../ledger.ts";

const claim = (id: number): NewLedgerEntry => ({
  id,
  kind: "claim",
  timestamp: "2026-09-26T10:00:00Z",
  claim: `claim ${id}`,
  provenance: "human",
  verified: false,
});

describe("storage-written ledger against the engine's integrity check", () => {
  let dir: string;
  let ledgerPath: string;
  let lines: string[];

  beforeEach(async () => {
    dir = join(tmpdir(), `vellum-roundtrip-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    ledgerPath = join(dir, "ledger.jsonl");
    for (let id = 1; id <= 4; id++) await appendLedgerEntry(ledgerPath, claim(id));
    lines = (await readFile(ledgerPath, "utf8")).split("\n").filter((l) => l !== "");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function rewrite(next: readonly string[]): Promise<void> {
    await writeFile(ledgerPath, `${next.join("\n")}\n`);
  }

  /** Both verifiers reject the ledger on disk; returns the engine's failure kinds. */
  async function expectBothReject(): Promise<string[]> {
    const storage = await verifyLedgerIntegrity(ledgerPath);
    expect(storage.valid).toBe(false);
    const engine = checkLedgerIntegrity(
      await readLedger(ledgerPath),
      await readLedgerHead(ledgerPath),
    );
    expect(engine.valid).toBe(false);
    await expect(appendLedgerEntry(ledgerPath, claim(5))).rejects.toThrow();
    return engine.failures.map((f) => f.kind);
  }

  it("passes the engine's check, head included", async () => {
    const entries = await readLedger(ledgerPath);
    expect(entries.map((e) => e.id)).toEqual([1, 2, 3, 4]);
    expect(entries[0]?.predecessor_digest).toBeNull();
    expect(checkLedgerIntegrity(entries, await readLedgerHead(ledgerPath))).toEqual({
      valid: true,
      failures: [],
    });
    expect(await verifyLedgerIntegrity(ledgerPath)).toEqual({ valid: true, errors: [] });
  });

  it("edit of a middle entry fails both", async () => {
    const next = [...lines];
    next[1] = next[1]!.replace('"claim 2"', '"forged"');
    await rewrite(next);
    expect(await expectBothReject()).toContain("predecessor_digest_mismatch");
  });

  it("edit with the successor re-linked to the forged digest fails both", async () => {
    const next = [...lines];
    const forged = { ...(JSON.parse(next[1]!) as LedgerEntry), claim: "forged" } as LedgerEntry;
    next[1] = JSON.stringify(forged);
    const successor = JSON.parse(next[2]!) as LedgerEntry;
    next[2] = JSON.stringify({
      ...successor,
      predecessor_digest: computeLedgerEntryDigest(forged),
    });
    await rewrite(next);
    expect(await expectBothReject()).toContain("predecessor_digest_mismatch");
  });

  it("a fully re-linked chain after an edit still fails both, on the Ledger Head", async () => {
    const entries = lines.map((l) => JSON.parse(l) as LedgerEntry);
    entries[1] = { ...entries[1], claim: "forged" } as LedgerEntry;
    for (let i = 2; i < entries.length; i++) {
      entries[i] = {
        ...entries[i],
        predecessor_digest: computeLedgerEntryDigest(entries[i - 1]!),
      } as LedgerEntry;
    }
    await rewrite(entries.map((e) => JSON.stringify(e)));
    expect(await expectBothReject()).toEqual(["head_mismatch"]);
  });

  it("deleting a middle entry fails both", async () => {
    await rewrite([lines[0]!, lines[2]!, lines[3]!]);
    expect(await expectBothReject()).toContain("missing_entry");
  });

  it("reordering entries fails both", async () => {
    await rewrite([lines[0]!, lines[2]!, lines[1]!, lines[3]!]);
    expect(await expectBothReject()).toContain("ordering_violation");
  });

  it("a fork fails both", async () => {
    const third = JSON.parse(lines[2]!) as LedgerEntry;
    const rival = JSON.stringify({ ...third, id: 5, claim: "rival" });
    await rewrite([...lines, rival]);
    expect(await expectBothReject()).toContain("fork");
  });

  it("truncating the tail fails both, on the Ledger Head", async () => {
    await rewrite(lines.slice(0, 2));
    expect(await expectBothReject()).toEqual(["head_mismatch"]);
  });

  it("editing the last entry fails both, on the Ledger Head", async () => {
    const next = [...lines];
    next[3] = next[3]!.replace('"claim 4"', '"forged"');
    await rewrite(next);
    expect(await expectBothReject()).toEqual(["head_mismatch"]);
  });

  it("emptying the ledger fails both, on the Ledger Head", async () => {
    await writeFile(ledgerPath, "");
    expect(await expectBothReject()).toEqual(["head_mismatch"]);
  });

  it("the engine's check without a head is silent about the tail, and says so by signature", () => {
    // checkLedgerIntegrity(entries) with the head omitted checks the chain
    // only; callers that can read the head must pass it (null when absent).
    const entries = lines.slice(0, 2).map((l) => JSON.parse(l) as LedgerEntry);
    expect(checkLedgerIntegrity(entries).valid).toBe(true);
    expect(checkLedgerIntegrity(entries, null).valid).toBe(false);
  });
});
