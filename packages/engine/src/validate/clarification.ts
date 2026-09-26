/**
 * @vellum/engine — unresolved clarification markers
 *
 * The method's spec-new skill writes `[NEEDS CLARIFICATION: <question>]` where
 * a requirement's answer is unknown, and spec-clarify resolves them. A marker
 * left in requirements.md or design.md is a question where a statement should
 * be: an approval of that artifact would bind a question, and a Property
 * derived from it would encode a guess (spec-design, step 0.5).
 *
 * The protocol has one Finding severity — any Finding fails lint — so every
 * remaining marker is a NEEDS_CLARIFICATION Finding, whatever the spec's
 * state: a draft that still carries one lints FAIL, which is the truthful
 * answer to "is this ready for review?". Markers inside a code fence or an
 * inline code span are examples, not questions, and are not reported.
 *
 * Pure: takes the file text, returns findings.
 */

import type { Finding } from "@vellum/protocol";

/** Rule identifier for an unresolved clarification marker. */
export const NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION";

const MARKER = /\[NEEDS CLARIFICATION:\s*([^\]]*)\]/g;
const FENCE = /^\s{0,3}(```|~~~)/;

/**
 * One Finding per `[NEEDS CLARIFICATION: …]` marker in `text`, at its line.
 *
 * @param text - the artifact file, frontmatter included (line numbers are file lines)
 * @param file - the path findings name
 */
export function findClarificationMarkers(text: string, file: string): Finding[] {
  const findings: Finding[] = [];
  let inFence = false;
  text.split("\n").forEach((raw, index) => {
    const line = raw.replace(/\r$/, "");
    if (FENCE.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const prose = line.replace(/`[^`]*`/g, (code) => " ".repeat(code.length));
    for (const match of prose.matchAll(MARKER)) {
      const question = (match[1] ?? "").trim();
      findings.push({
        file,
        line: index + 1,
        rule: NEEDS_CLARIFICATION,
        message: `Unresolved clarification marker${question ? `: ${question}` : ""} — resolve it (spec-clarify) before this artifact is approved`,
      });
    }
  });
  return findings;
}
