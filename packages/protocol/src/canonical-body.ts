/**
 * @vellum/protocol — Canonical form of an Artifact Body
 *
 * An approval binds to the Artifact Checksum, which is the SHA-256 of the
 * canonical form computed here. The canonical form removes what a formatter
 * may change without changing what the document says, so a formatting-only
 * edit keeps an approval valid and a content edit voids it.
 *
 * Normalised:
 * - a leading byte-order mark;
 * - the Lifecycle Frontmatter block, when the text starts with one;
 * - line endings (CRLF and lone CR become LF);
 * - trailing spaces and tabs on every line;
 * - trailing blank lines (the body ends with exactly one LF, or is empty);
 * - outside fenced code blocks, Markdown table padding: each row whose first
 *   non-blank character is `|` is re-emitted as `| cell | cell |` with every
 *   cell trimmed, and each delimiter cell collapses to `---`, keeping its
 *   alignment colons.
 *
 * Everything else — words, punctuation, blank lines between paragraphs,
 * indentation outside tables, and every character inside a fenced code block
 * apart from trailing whitespace — is kept exactly.
 */

const FRONTMATTER = /^---\n[\s\S]*?\n---(?:\n|$)/;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const DELIMITER_CELL = /^(:?)-+(:?)$/;

/** Return the canonical form of an artifact's text (frontmatter excluded). */
export function canonicalArtifactBody(text: string): string {
  const lf = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const body = lf.replace(FRONTMATTER, "");

  const out: string[] = [];
  let fence: { readonly char: string; readonly length: number } | null = null;

  for (const rawLine of body.split("\n")) {
    const line = rawLine.replace(/[ \t]+$/, "");

    if (fence) {
      out.push(line);
      if (closesFence(line, fence)) fence = null;
      continue;
    }

    const open = FENCE_OPEN.exec(line);
    if (open?.[1] !== undefined) {
      fence = { char: open[1].charAt(0), length: open[1].length };
      out.push(line);
      continue;
    }

    out.push(line.trimStart().startsWith("|") ? canonicalTableRow(line) : line);
  }

  const joined = out.join("\n").replace(/\n+$/, "");
  return joined === "" ? "" : `${joined}\n`;
}

function closesFence(
  line: string,
  fence: { readonly char: string; readonly length: number },
): boolean {
  const trimmed = line.replace(/^ {0,3}/, "");
  if (!trimmed.startsWith(fence.char.repeat(fence.length))) return false;
  const run = trimmed.length - trimmed.replace(new RegExp(`^\\${fence.char}+`), "").length;
  return run >= fence.length && trimmed.slice(run).trim() === "";
}

/** Split a table row on unescaped pipes, trim cells, collapse delimiter runs. */
function canonicalTableRow(line: string): string {
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line.charAt(i);
    if (ch === "\\" && i + 1 < line.length) {
      current += ch + line.charAt(i + 1);
      i++;
      continue;
    }
    if (ch === "|") {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);

  // The row starts with `|`, so the first split piece is the (blank) indent.
  // A trailing `|` leaves a blank last piece; a row without one does not.
  const inner = cells.slice(1);
  if (inner.length > 0 && inner[inner.length - 1]?.trim() === "") inner.pop();

  const trimmed = inner.map((cell) => cell.trim());
  const isDelimiterRow = trimmed.length > 0 && trimmed.every((cell) => DELIMITER_CELL.test(cell));
  const canonical = isDelimiterRow
    ? trimmed.map((cell) => cell.replace(DELIMITER_CELL, "$1---$2"))
    : trimmed;

  return `| ${canonical.join(" | ")} |`;
}
