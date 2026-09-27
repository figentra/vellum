/**
 * Section Checker - validates required sections in design.md.
 *
 * @see requirements.md Requirements 2.5, 2.6
 */

import type { QualityFinding } from "@vellum/protocol";
import { createQualityFinding } from "@vellum/protocol";
import { RULE_IDS } from "./rules";

/**
 * Required sections in design.md.
 */
const REQUIRED_SECTIONS = [
  "Overview",
  "Applicable Standards",
  "Glossary",
  "Architecture",
  "Components",
  "Correctness Properties",
  "Data Model",
  "API Contracts",
  "Error Model",
  "Security Model",
  "Observability",
  "Idempotency",
  "Concurrency",
  "Migration Strategy",
  "Rollback Strategy",
  "ADR Consistency",
] as const;

/**
 * Check that required sections exist in design.md.
 *
 * @param designText - Full design.md text
 * @param designPath - Path to design.md
 * @returns Array of quality findings
 */
export function checkRequiredSections(designText: string, designPath: string): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const lines = designText.split("\n");

  const presentSections = new Set<string>();

  for (const line of lines) {
    if (!line) continue;
    // Match markdown headings (## Section or ### Section)
    const match = line.match(/^#{2,3}\s+(.+?)(?:\s*$|(?=\s+#))/);
    if (match?.[1] !== undefined) {
      presentSections.add(match[1].trim());
    }
  }

  // Check each required section (criterion 2.5)
  for (const section of REQUIRED_SECTIONS) {
    if (!presentSections.has(section) && !isMarkedNA(designText, section)) {
      findings.push(
        createQualityFinding(
          RULE_IDS.REQUIRED_SECTION_MISSING,
          `Missing required section: ${section}`,
          designPath,
          1,
          "error",
          undefined,
          section,
        ),
      );
    }
  }

  return findings;
}

/**
 * Check if a section is marked as N/A.
 */
function isMarkedNA(text: string, section: string): boolean {
  const naPattern = new RegExp(`${section}[^\\n]*N\\/A[^\\n]*(?:reason|because)`, "i");
  return naPattern.test(text);
}

/**
 * ADR citation in design.md.
 */
export interface AdrCitation {
  /** ADR number */
  number: string;
  /** ADR file path */
  path: string;
  /** Line number in design.md */
  line_number: number;
}

/**
 * Extract ADR citations from design.md.
 *
 * @param designText - Full design.md text
 * @returns Array of ADR citations
 */
export function extractAdrCitations(designText: string): AdrCitation[] {
  const citations: AdrCitation[] = [];
  const lines = designText.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Match ADR references like ADR-0042 or apps/docs/src/adr/0042-*
    const matches = line.matchAll(/ADR[-\s]?(\d{4})|adr\/(\d{4})/gi);
    for (const match of matches) {
      const num = match[1] ?? match[2];
      if (num === undefined) continue;
      citations.push({
        number: num,
        path: `apps/docs/src/adr/${num}`,
        line_number: i + 1,
      });
    }
  }

  return citations;
}

/**
 * Status of an ADR in the repository's ADR index.
 */
export type AdrStatus = "active" | "superseded";

/**
 * Check ADR citations (criterion 004:2.6): each cited ADR must exist and not
 * be Superseded.
 *
 * The engine does no I/O, so the caller supplies the ADR index — ADR number
 * (e.g. "0042") to status — read from the repository.
 *
 * @param designText - Full design.md text
 * @param designPath - Path to design.md
 * @param adrs - ADR number to status, for every ADR file in the repository
 * @returns One finding per citation of a missing or Superseded ADR
 */
export function checkAdrCitations(
  designText: string,
  designPath: string,
  adrs: ReadonlyMap<string, AdrStatus>,
): QualityFinding[] {
  const findings: QualityFinding[] = [];

  for (const citation of extractAdrCitations(designText)) {
    const status = adrs.get(citation.number);
    if (status === "active") continue;
    const reason = status === undefined ? "does not exist" : "is Superseded";
    findings.push(
      createQualityFinding(
        RULE_IDS.ADR_CITATION_INVALID,
        `Cited ADR-${citation.number} ${reason}`,
        designPath,
        citation.line_number,
        "error",
        undefined,
        `ADR-${citation.number}`,
      ),
    );
  }

  return findings;
}
