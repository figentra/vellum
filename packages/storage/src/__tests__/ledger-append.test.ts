/**
 * appendLedgerEntry refuses to extend a damaged ledger, never leaves the file
 * half-written, and reports concurrent appends (requirement 4.7-4.10, 4.12).
 *
 * Entry ids run from 1 (the protocol's chain format); the machine folder holds
 * the ledger and its Ledger Head.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { LedgerEntry } from "@vellum/protocol";
import { brand, computeLedgerEntryDigest } from "@vellum/protocol";
import {
  appendLedgerEntry,
  LedgerError,
  LEDGER_HEAD_FILE,
  nodeLedgerFileSystem,
  verifyLedgerIntegrity,
  type LedgerFileSystem,
  type NewLedgerEntry,
} from "../ledger.ts";

const FILES = [LEDGER_HEAD_FILE, "ledger.jsonl"].sort();

const claim = (id: number, spec = "test"): NewLedgerEntry => ({
  id,
  kind: "claim",
  timestamp: "2026-09-26T10:00:00Z",
  type: "created",
  spec: brand<string, "SpecSlug">(spec),
});

describe("appendLedgerEntry integrity", () => {
  let dir: string;
  let ledgerPath: string;

  beforeEach(async () => {
    dir = join(tmpdir(), `vellum-append-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    ledgerPath = join(dir, "ledger.jsonl");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function seed(count: number): Promise<string[]> {
    for (let id = 1; id <= count; id++) await appendLedgerEntry(ledgerPath, claim(id, `s${id}`));
    return (await readFile(ledgerPath, "utf8")).split("\n").filter((l) => l !== "");
  }

  /** Append must refuse with `code`, naming `entryId`, and leave the bytes alone. */
  async function expectRefusal(code: string, entryId: number, next = 4): Promise<LedgerError> {
    const before = await readFile(ledgerPath, "utf8");
    const error = await appendLedgerEntry(ledgerPath, claim(next)).then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(LedgerError);
    const ledgerError = error as LedgerError;
    expect(ledgerError.code).toBe(code);
    expect(ledgerError.entryId).toBe(entryId);
    expect(ledgerError.message).toContain(`entry ${entryId}`);
    expect(await readFile(ledgerPath, "utf8")).toBe(before);
    expect((await readdir(dir)).sort()).toEqual(FILES);
    return ledgerError;
  }

  it("appends to an intact chain and keeps existing bytes identical", async () => {
    const lines = await seed(3);
    const before = await readFile(ledgerPath, "utf8");

    await appendLedgerEntry(ledgerPath, claim(4));

    const after = await readFile(ledgerPath, "utf8");
    expect(after.startsWith(before)).toBe(true);
    expect(after.split("\n").filter((l) => l !== "")).toHaveLength(lines.length + 1);
    expect((await verifyLedgerIntegrity(ledgerPath)).valid).toBe(true);
    expect((await readdir(dir)).sort()).toEqual(FILES);
  });

  it("refuses when an entry was edited, naming it", async () => {
    const lines = await seed(3);
    lines[1] = lines[1]!.replace('"spec":"s2"', '"spec":"forged"');
    await writeFile(ledgerPath, `${lines.join("\n")}\n`);

    await expectRefusal("LEDGER_INTEGRITY_FAILURE", 2);
  });

  it("refuses when an entry was edited and its successor re-linked, naming the successor", async () => {
    const lines = await seed(3);
    const forged = { ...(JSON.parse(lines[1]!) as LedgerEntry), spec: "forged" } as LedgerEntry;
    lines[1] = JSON.stringify(forged);
    const successor = JSON.parse(lines[2]!) as LedgerEntry;
    lines[2] = JSON.stringify({ ...successor, predecessor_digest: computeLedgerEntryDigest(forged) });
    await writeFile(ledgerPath, `${lines.join("\n")}\n`);

    // The re-linked chain is internally consistent; the Ledger Head still
    // records the original last entry's digest.
    await expectRefusal("LEDGER_INTEGRITY_FAILURE", 3);
  });

  it("refuses when an entry was deleted, naming the entry after the gap", async () => {
    const lines = await seed(3);
    await writeFile(ledgerPath, `${[lines[0], lines[2]].join("\n")}\n`);

    await expectRefusal("LEDGER_INTEGRITY_FAILURE", 3);
  });

  it("refuses when the last entries were removed, naming the missing entry", async () => {
    const lines = await seed(3);
    await writeFile(ledgerPath, `${[lines[0], lines[1]].join("\n")}\n`);

    await expectRefusal("LEDGER_INTEGRITY_FAILURE", 3);
  });

  it("refuses when entries were reordered, naming the first out of place", async () => {
    const lines = await seed(3);
    await writeFile(ledgerPath, `${[lines[0], lines[2], lines[1]].join("\n")}\n`);

    await expectRefusal("LEDGER_INTEGRITY_FAILURE", 3);
  });

  it("refuses when the file was truncated mid-entry, naming the line", async () => {
    await seed(3);
    const content = await readFile(ledgerPath, "utf8");
    await writeFile(ledgerPath, content.slice(0, content.length - 20));

    const before = await readFile(ledgerPath, "utf8");
    const error = await appendLedgerEntry(ledgerPath, claim(4)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LedgerError);
    expect((error as LedgerError).code).toBe("LEDGER_INTEGRITY_FAILURE");
    expect((error as LedgerError).message).toContain("line 3");
    expect(await readFile(ledgerPath, "utf8")).toBe(before);
  });

  it("reports a fork, naming both entries, instead of resolving it", async () => {
    const lines = await seed(2);
    const second = JSON.parse(lines[1]!) as LedgerEntry;
    const rivalLine = JSON.stringify({ ...second, id: 3, spec: "rival" });
    await writeFile(ledgerPath, `${[...lines, rivalLine].join("\n")}\n`);

    const error = await expectRefusal("LEDGER_FORK", 2);
    expect(error.otherEntryId).toBe(3);
    expect(error.message).toMatch(/fork/i);
  });

  it("refuses an entry whose id does not follow the last entry", async () => {
    await seed(2);
    const before = await readFile(ledgerPath, "utf8");

    await expect(appendLedgerEntry(ledgerPath, claim(5))).rejects.toThrow(/expected id 3/);
    expect(await readFile(ledgerPath, "utf8")).toBe(before);
  });
});

describe("appendLedgerEntry atomicity", () => {
  let dir: string;
  let ledgerPath: string;

  beforeEach(async () => {
    dir = join(tmpdir(), `vellum-atomic-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    ledgerPath = join(dir, "ledger.jsonl");
    await appendLedgerEntry(ledgerPath, claim(1));
    await appendLedgerEntry(ledgerPath, claim(2));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("leaves the ledger unchanged when the write fails midway", async () => {
    const before = await readFile(ledgerPath, "utf8");
    const failingFs: LedgerFileSystem = {
      ...nodeLedgerFileSystem,
      async writeFileDurably(path, data) {
        // Half the bytes reach the disk, then the device fails.
        await writeFile(path, data.slice(0, Math.floor(data.length / 2)));
        throw new Error("EIO: simulated write failure");
      },
    };

    await expect(appendLedgerEntry(ledgerPath, claim(3), { fs: failingFs })).rejects.toThrow(
      /simulated write failure/,
    );

    expect(await readFile(ledgerPath, "utf8")).toBe(before);
    expect((await readdir(dir)).sort()).toEqual(FILES);
    // The lock was released: a later append succeeds.
    await appendLedgerEntry(ledgerPath, claim(3));
    expect((await verifyLedgerIntegrity(ledgerPath)).valid).toBe(true);
  });

  it("leaves the ledger unchanged when the rename fails", async () => {
    const before = await readFile(ledgerPath, "utf8");
    const failingFs: LedgerFileSystem = {
      ...nodeLedgerFileSystem,
      async rename() {
        throw new Error("EXDEV: simulated rename failure");
      },
    };

    await expect(appendLedgerEntry(ledgerPath, claim(3), { fs: failingFs })).rejects.toThrow(
      /simulated rename failure/,
    );

    expect(await readFile(ledgerPath, "utf8")).toBe(before);
    expect((await readdir(dir)).sort()).toEqual(FILES);
  });

  it("writes through a temp file in the same directory, fsynced, then renamed", async () => {
    const calls: string[] = [];
    const tracingFs: LedgerFileSystem = {
      ...nodeLedgerFileSystem,
      async writeFileDurably(path, data) {
        calls.push(`write ${path.startsWith(`${dir}/`) ? "same-dir" : "elsewhere"}`);
        await nodeLedgerFileSystem.writeFileDurably(path, data);
      },
      async rename(from, to) {
        calls.push(
          `rename -> ${to === ledgerPath ? "ledger" : to === join(dir, LEDGER_HEAD_FILE) ? "head" : to}`,
        );
        await nodeLedgerFileSystem.rename(from, to);
      },
      async syncDirectory(path) {
        calls.push(`sync ${path === dir ? "dir" : path}`);
        await nodeLedgerFileSystem.syncDirectory(path);
      },
    };

    await appendLedgerEntry(ledgerPath, claim(3), { fs: tracingFs });

    expect(calls).toEqual([
      "write same-dir",
      "write same-dir",
      "rename -> ledger",
      "rename -> head",
      "sync dir",
    ]);
  });
});

describe("appendLedgerEntry concurrency", () => {
  let dir: string;
  let ledgerPath: string;

  beforeEach(async () => {
    dir = join(tmpdir(), `vellum-concurrent-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    ledgerPath = join(dir, "ledger.jsonl");
    await appendLedgerEntry(ledgerPath, claim(1));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("never forks or loses an entry when appends race", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) => appendLedgerEntry(ledgerPath, claim(2, `racer-${i}`))),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    for (const r of rejected) {
      expect(r.reason).toBeInstanceOf(LedgerError);
      expect(["LEDGER_CONCURRENT_APPEND", "LEDGER_ENTRY_INVALID"]).toContain(
        (r.reason as LedgerError).code,
      );
    }

    const integrity = await verifyLedgerIntegrity(ledgerPath);
    expect(integrity).toEqual({ valid: true, errors: [] });
    const lines = (await readFile(ledgerPath, "utf8")).split("\n").filter((l) => l !== "");
    // Entry 1 plus exactly the appends that reported success.
    expect(lines).toHaveLength(1 + fulfilled.length);
    expect((await readdir(dir)).sort()).toEqual(FILES);
  });

  it("reports an append already in progress instead of waiting or overwriting", async () => {
    await writeFile(`${ledgerPath}.lock`, "12345\n");
    const before = await readFile(ledgerPath, "utf8");

    const error = await appendLedgerEntry(ledgerPath, claim(2)).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(LedgerError);
    expect((error as LedgerError).code).toBe("LEDGER_CONCURRENT_APPEND");
    expect((error as LedgerError).message).toContain(`${ledgerPath}.lock`);
    expect(await readFile(ledgerPath, "utf8")).toBe(before);
    // The other writer's lock is not ours to remove.
    expect(await readFile(`${ledgerPath}.lock`, "utf8")).toBe("12345\n");
  });

  it("reports a ledger changed underneath it by a writer that took no lock", async () => {
    const intruder = JSON.stringify({ note: "written by another tool" });
    const racingFs: LedgerFileSystem = {
      ...nodeLedgerFileSystem,
      async writeFileDurably(path, data) {
        await nodeLedgerFileSystem.writeFileDurably(path, data);
        await writeFile(ledgerPath, `${await readFile(ledgerPath, "utf8")}${intruder}\n`);
      },
    };

    const error = await appendLedgerEntry(ledgerPath, claim(2), { fs: racingFs }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(LedgerError);
    expect((error as LedgerError).code).toBe("LEDGER_CONCURRENT_APPEND");
    // The other writer's bytes survive; ours were not renamed over them.
    expect(await readFile(ledgerPath, "utf8")).toContain(intruder);
    expect((await readdir(dir)).sort()).toEqual(FILES);
  });
});
