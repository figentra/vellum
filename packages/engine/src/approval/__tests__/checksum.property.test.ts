/**
 * Properties of the Artifact Checksum an approval binds (criteria 8.2, 8.4).
 *
 * The checksum is computeChecksum from @vellum/protocol: SHA-256 of the
 * canonical body. These properties generate Markdown artifacts (paragraphs,
 * tables, fenced code), then render them neatly, reformatted, or with one
 * letter changed, and check that:
 *
 * 1. the checksum is idempotent: canonicalising first changes nothing;
 * 2. a formatting-only change keeps the checksum, and so the approval;
 * 3. a content change (a letter replaced, or spaces inserted inside a word
 *    of a paragraph, table cell or code line) alters the checksum, and
 *    invalidates the approval.
 */

import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import type { ApprovalPolicy, Checksum, GitCommit } from "@vellum/protocol";
import { brand, canonicalArtifactBody, computeChecksum } from "@vellum/protocol";
import { verifyApproval } from "../verify.js";

type Align = "none" | "left" | "right" | "center";
type Block =
  | { readonly kind: "para"; readonly lines: readonly (readonly string[])[] }
  | {
      readonly kind: "table";
      readonly align: readonly Align[];
      readonly rows: readonly (readonly string[])[];
    }
  | { readonly kind: "code"; readonly fence: "```" | "~~~"; readonly lines: readonly string[] };

const word = fc
  .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz"), { minLength: 1, maxLength: 8 })
  .map((chars) => chars.join(""));
const words = fc.array(word, { minLength: 1, maxLength: 5 });

const para = fc
  .array(words, { minLength: 1, maxLength: 3 })
  .map((lines): Block => ({ kind: "para", lines }));

const table = fc.integer({ min: 1, max: 4 }).chain((columns) =>
  fc
    .record({
      align: fc.array(fc.constantFrom<Align>("none", "left", "right", "center"), {
        minLength: columns,
        maxLength: columns,
      }),
      rows: fc.array(fc.array(word, { minLength: columns, maxLength: columns }), {
        minLength: 2,
        maxLength: 4,
      }),
    })
    .map((t): Block => ({ kind: "table", ...t })),
);

// Code lines keep their interior spacing and may contain pipes: both are content.
const codeLine = fc
  .tuple(word, fc.array(fc.oneof(word, fc.constantFrom(" ", "  ", "|", " | ")), { maxLength: 5 }))
  .map(([first, rest]) => [first, ...rest].join(""));
const code = fc
  .record({
    fence: fc.constantFrom<"```" | "~~~">("```", "~~~"),
    lines: fc.array(codeLine, { minLength: 1, maxLength: 4 }),
  })
  .map((c): Block => ({ kind: "code", ...c }));

const doc = fc.array(fc.oneof(para, table, code), { minLength: 1, maxLength: 6 });

/** A stream of small integers that picks formatting choices; empty = neat. */
const noise = fc.array(fc.nat({ max: 7 }), { minLength: 1, maxLength: 64 });

/** Render a document. With noise, apply formatting-only variation. */
function render(blocks: readonly Block[], noiseStream: readonly number[]): string {
  let cursor = 0;
  const pick = (): number => {
    if (noiseStream.length === 0) return 0;
    const value = noiseStream[cursor % noiseStream.length] ?? 0;
    cursor++;
    return value;
  };
  const trailing = (): string => ["", "", " ", "  ", "\t", " \t "][pick() % 6] ?? "";
  const pad = (): string => " ".repeat(pick() % 4);

  const lines: string[] = [];
  if (noiseStream.length > 0) {
    // A frontmatter-only difference: excluded from the checksum (criterion 8.4).
    lines.push("---", `version: ${pick() + 1}`, "state: IN_REVIEW", "---");
  }

  blocks.forEach((block, index) => {
    if (index > 0) lines.push("");
    switch (block.kind) {
      case "para":
        for (const line of block.lines) lines.push(line.join(" ") + trailing());
        break;
      case "table": {
        const neat = noiseStream.length === 0;
        const row = (cells: readonly string[]): string => {
          const body = cells.map((cell) => (neat ? ` ${cell} ` : `${pad()}${cell}${pad()}`));
          const closing = neat || pick() % 2 === 0 ? "|" : "";
          return `${neat ? "" : pad()}|${body.join("|")}${closing}${trailing()}`;
        };
        const delimiter = block.align.map((align) => {
          const dashes = "-".repeat(neat ? 3 : 1 + (pick() % 6));
          const left = align === "left" || align === "center" ? ":" : "";
          const right = align === "right" || align === "center" ? ":" : "";
          return `${left}${dashes}${right}`;
        });
        const [header, ...rest] = block.rows;
        lines.push(row(header ?? []), row(delimiter));
        for (const r of rest) lines.push(row(r));
        break;
      }
      case "code":
        lines.push(block.fence + "ts" + trailing());
        for (const line of block.lines) lines.push(line + trailing());
        lines.push(block.fence + trailing());
        break;
    }
  });

  const eol = noiseStream.length > 0 ? (["\n", "\r\n", "\r"][pick() % 3] ?? "\n") : "\n";
  const tail = noiseStream.length > 0 ? "\n".repeat(pick() % 3) : "";
  return lines.join(eol) + eol + tail.replace(/\n/g, eol);
}

/**
 * A content change to the `target`-th word: replace the letter at `at` (modulo
 * the word's length) with a different letter, or insert a space into it.
 */
function editWord(
  blocks: readonly Block[],
  target: number,
  at: number,
  letter: string,
  insertSpace: boolean,
): Block[] {
  let seen = 0;
  const edit = (w: string): string => {
    const hit = seen++ === target;
    if (!hit) return w;
    // Spaces go strictly inside the word: at its edge in a table cell they
    // would be padding, which is formatting, not content.
    if (insertSpace && w.length >= 2) {
      const inside = 1 + (at % (w.length - 1));
      return `${w.slice(0, inside)}  ${w.slice(inside)}`;
    }
    const i = at % w.length;
    const old = w.charAt(i);
    const replacement = old === letter ? (letter === "a" ? "b" : "a") : letter;
    return w.slice(0, i) + replacement + w.slice(i + 1);
  };
  const editLine = (line: string): string => line.replace(/[a-z]+/g, (w) => edit(w));
  return blocks.map((block): Block => {
    switch (block.kind) {
      case "para":
        return { ...block, lines: block.lines.map((line) => line.map(edit)) };
      case "table":
        return { ...block, rows: block.rows.map((r) => r.map(edit)) };
      case "code":
        return { ...block, lines: block.lines.map(editLine) };
    }
  });
}

function wordCount(blocks: readonly Block[]): number {
  return blocks.reduce((n, block) => {
    switch (block.kind) {
      case "para":
        return n + block.lines.flat().length;
      case "table":
        return n + block.rows.flat().length;
      case "code":
        return n + (block.lines.join(" ").match(/[a-z]+/g) ?? []).length;
    }
  }, 0);
}

// Approval fixtures: one authorised human signal.
const SIGNAL = "a".repeat(40);
const policy: ApprovalPolicy = {
  approvers: new Map([["standard", new Map([["requirements", ["alice@example.com"]]])]]),
  requiredCount: new Map([["standard", new Map([["requirements", 1]])]]),
  identities: [
    {
      identity: "alice@example.com",
      keys: [{ type: "ssh", fingerprint: "SHA256:alice", publicKey: "ssh-ed25519 AAAA" }],
    },
  ],
};
const commits = new Map<string, GitCommit>([
  [
    SIGNAL,
    {
      sha: brand<string, "CommitSha">(SIGNAL),
      author: { name: "Alice", email: "alice@example.com" },
      committer: { name: "Alice", email: "alice@example.com" },
      message: "approve: requirements",
      timestamp: "2026-09-26T10:00:00Z",
      signature: "-----BEGIN SSH SIGNATURE-----",
      signer: { type: "ssh", fingerprint: "SHA256:alice" },
    },
  ],
]);
const approvalOf = (checksum: Checksum) => ({
  approver: "alice@example.com",
  artifact: "requirements" as const,
  artifactChecksum: checksum,
  signalCommit: SIGNAL,
});

describe("Artifact Checksum properties", () => {
  it("is idempotent: the checksum of the canonical form is the checksum", () => {
    fc.assert(
      fc.property(doc, noise, (blocks, n) => {
        const text = render(blocks, n);
        const canonical = canonicalArtifactBody(text);
        expect(canonicalArtifactBody(canonical)).toBe(canonical);
        expect(computeChecksum(canonical)).toBe(computeChecksum(text));
        expect(computeChecksum(text)).toBe(computeChecksum(text));
      }),
    );
  });

  it("is idempotent on arbitrary text, not only generated Markdown", () => {
    const char = fc.constantFrom(..."ab \t\n\r|`~-:\\#");
    fc.assert(
      fc.property(fc.array(char, { maxLength: 200 }), (chars) => {
        // Prefixed so the text never opens with a frontmatter block: stripping
        // one block can expose a second, which is content, not frontmatter.
        const text = `x${chars.join("")}`;
        const canonical = canonicalArtifactBody(text);
        expect(canonicalArtifactBody(canonical)).toBe(canonical);
      }),
      { numRuns: 500 },
    );
  });

  it("does not change under a formatting-only change, so the approval stays valid", () => {
    fc.assert(
      fc.property(doc, noise, (blocks, n) => {
        const approved = computeChecksum(render(blocks, []));
        const reformatted = computeChecksum(render(blocks, n));
        expect(reformatted).toBe(approved);
        expect(verifyApproval(approvalOf(approved), policy, "standard", commits, reformatted)).toEqual({
          valid: true,
        });
      }),
    );
  });

  it("changes when content changes, so the approval is invalidated", () => {
    fc.assert(
      fc.property(
        doc,
        noise,
        fc.nat(),
        fc.nat(),
        fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz"),
        fc.boolean(),
        (blocks, n, target, at, letter, insertSpace) => {
          const approved = computeChecksum(render(blocks, []));
          const edited = editWord(blocks, target % wordCount(blocks), at, letter, insertSpace);
          const current = computeChecksum(render(edited, n));
          expect(current).not.toBe(approved);
          expect(verifyApproval(approvalOf(approved), policy, "standard", commits, current)).toEqual({
            valid: false,
            reason: "CHECKSUM_MISMATCH",
          });
        },
      ),
    );
  });
});
