/**
 * @vellum/testing — Performance Benchmarks
 *
 * Run with `pnpm --filter @vellum/testing test:bench` (`vitest bench`). Each
 * case exercises the real engine or storage function; nothing here is a
 * placeholder. Benchmarks report timings and do not assert budgets — a budget
 * is enforced where a spec sets one, not here.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, bench, describe } from "vitest";
import { parseTaskLine } from "@vellum/protocol";
import type { LedgerEntry, TaskLine } from "@vellum/protocol";
import { checkLedgerIntegrity, computeCoverage } from "@vellum/engine";
import { appendLedgerEntry, readLedger } from "@vellum/storage";
import { randomChecksum, randomCommitSha } from "../framework.js";

/** Criteria per spec at the default Spec Size Limit. */
const CRITERIA = 80;

function requirementsWith(criteria: number): string {
  const lines = [
    "# Requirements",
    "",
    "### Requirement 1: Benchmark",
    "",
    "#### Acceptance Criteria",
    "",
  ];
  for (let i = 1; i <= criteria; i++) {
    lines.push(`1.${i} WHEN event ${i} occurs, THE System SHALL respond ${i}.`);
  }
  return lines.join("\n");
}

function designWith(properties: number): string {
  const lines = ["# Design", ""];
  for (let i = 1; i <= properties; i++) {
    lines.push(`**Property ${i}: Property ${i}**`, `**Validates: Requirements 1.${i}**`, "");
  }
  return lines.join("\n");
}

function tasksWith(count: number): TaskLine[] {
  const tasks: TaskLine[] = [];
  for (let i = 1; i <= count; i++) {
    const parsed = parseTaskLine(
      `- [ ] ${i} Task ${i} <!-- criteria: 1.${i} --> <!-- properties: P${i} -->`,
    );
    if (!parsed) throw new Error(`benchmark fixture task ${i} did not parse`);
    tasks.push({ ...parsed, lineNumber: i });
  }
  return tasks;
}

function ledgerWith(count: number): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  for (let i = 0; i < count; i++) {
    entries.push({
      kind: "approval",
      id: i,
      predecessor_digest: i === 0 ? null : randomChecksum(),
      timestamp: "2026-09-26T00:00:00.000Z",
      approver: "alice@example.com",
      artifact: "requirements",
      artifactChecksum: randomChecksum(),
      signalCommit: randomCommitSha(),
    });
  }
  return entries;
}

describe("engine", () => {
  const requirements = requirementsWith(CRITERIA);
  const design = designWith(CRITERIA);
  const tasks = tasksWith(CRITERIA);
  const ledger = ledgerWith(1000);

  bench(`computeCoverage — ${CRITERIA} criteria, ${CRITERIA} properties, ${CRITERIA} tasks`, () => {
    computeCoverage(requirements, design, tasks);
  });

  bench("checkLedgerIntegrity — 1000 entries", () => {
    checkLedgerIntegrity(ledger);
  });
});

describe("storage", () => {
  const dir = mkdtempSync(join(tmpdir(), "vellum-bench-"));
  const appendPath = join(dir, "append.jsonl");
  const readPath = join(dir, "read.jsonl");
  let nextId = 0;
  let seeded = false;

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  bench("appendLedgerEntry — one entry to a growing ledger", async () => {
    await appendLedgerEntry(appendPath, {
      kind: "block",
      id: nextId++,
      timestamp: "2026-09-26T00:00:00.000Z",
      reason: "benchmark",
    });
  });

  bench(
    "readLedger — 100 entries",
    async () => {
      await readLedger(readPath);
    },
    {
      setup: async () => {
        if (seeded) return;
        for (let i = 0; i < 100; i++) {
          await appendLedgerEntry(readPath, {
            kind: "block",
            id: i,
            timestamp: "2026-09-26T00:00:00.000Z",
            reason: "benchmark",
          });
        }
        seeded = true;
      },
    },
  );
});
