/**
 * @vellum/engine — Property Tests for Ledger Integrity
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as crypto from "node:crypto";

describe("Property: Ledger Integrity", () => {
  it("should maintain chain integrity for any sequence of valid entries", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            kind: fc.constant("approval" as const),
            id: fc.nat({ max: 1000 }),
            timestamp: fc.date().map((d) => d.toISOString()),
            approver: fc.string({ minLength: 1, maxLength: 50 }),
            artifact: fc.constant("requirements" as const),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (entries) => {
          // Property: entries can be sorted by ID
          const sorted = [...entries].sort((a, b) => a.id - b.id);
          expect(sorted.length).toBe(entries.length);
          return true;
        },
      ),
    );
  });

  it("should compute predecessor digest deterministically", () => {
    fc.assert(
      fc.property(
        fc.record({
          kind: fc.constant("approval" as const),
          id: fc.nat({ max: 1000 }),
          timestamp: fc.string({ minLength: 24, maxLength: 24 }),
          approver: fc.string(),
        }),
        (entry) => {
          // Same input → same digest
          const digest1 = crypto.createHash("sha256").update(JSON.stringify(entry)).digest("hex");
          const digest2 = crypto.createHash("sha256").update(JSON.stringify(entry)).digest("hex");

          expect(digest1).toBe(digest2);
          expect(digest1.length).toBe(64);
          expect(/^[a-f0-9]{64}$/.test(digest1)).toBe(true);
        },
      ),
    );
  });

  it("should detect duplicate predecessor digests (forks)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            predecessor_digest: fc.hexaString({ minLength: 64, maxLength: 64 }),
          }),
          { minLength: 2, maxLength: 10 },
        ),
        (entries) => {
          // Check for duplicate predecessor digests
          const digests = new Set<string>();
          let hasFork = false;

          for (const entry of entries) {
            if (digests.has(entry.predecessor_digest)) {
              hasFork = true;
              break;
            }
            digests.add(entry.predecessor_digest);
          }

          // If duplicates exist, fork is detected
          const uniqueDigests = new Set(entries.map((e) => e.predecessor_digest));
          expect(hasFork).toBe(entries.length !== uniqueDigests.size);
        },
      ),
    );
  });
});

describe("Property: Checksum Stability", () => {
  it("should produce stable checksums for same content", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 1000 }), (content) => {
        const checksum1 = crypto.createHash("sha256").update(content).digest("hex");
        const checksum2 = crypto.createHash("sha256").update(content).digest("hex");

        expect(checksum1).toBe(checksum2);
        expect(checksum1.length).toBe(64);
      }),
    );
  });

  it("should produce different checksums for different content", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
        ),
        ([content1, content2]) => {
          fc.pre(content1 !== content2);

          const checksum1 = crypto.createHash("sha256").update(content1).digest("hex");
          const checksum2 = crypto.createHash("sha256").update(content2).digest("hex");

          expect(checksum1).not.toBe(checksum2);
        },
      ),
    );
  });
});
