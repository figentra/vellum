/**
 * Glossary Checker - validates that THE subjects are defined in glossary.
 *
 * @see requirements.md Requirement 1.4
 */

import type { QualityFinding } from "@vellum/protocol";
import { createQualityFinding } from "@vellum/protocol";
import { RULE_IDS } from "./rules";
import { parseCriteria } from "./patterns/criterion-parser";
import { extractSubject } from "./patterns/ears-patterns";

/**
 * Glossary term definition.
 */
export interface GlossaryTerm {
  /** Term name */
  term: string;
  /** Term definition */
  definition: string;
}

/**
 * Extract glossary terms from a glossary section.
 *
 * @param glossaryText - The glossary section text
 * @returns Array of glossary terms
 */
export function extractGlossaryTerms(glossaryText: string): GlossaryTerm[] {
  const terms: GlossaryTerm[] = [];
  const lines = glossaryText.split("\n");

  for (const line of lines) {
    if (!line) continue;
    // Match glossary table format: | Term | Definition |
    const match = line.match(/\|\s*([A-Z][A-Za-z0-9_\s]+?)\s*\|\s*(.+?)\s*\|/);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      terms.push({
        term: match[1].trim(),
        definition: match[2].trim(),
      });
    }
  }

  return terms;
}

/**
 * Check that all THE subjects in criteria are defined in glossary.
 *
 * @param criteriaText - Full requirements text
 * @param glossaryText - Glossary section text
 * @param filePath - Path to the requirements artifact
 * @returns Array of quality findings for undefined subjects
 */
export function checkGlossaryCoverage(
  criteriaText: string,
  glossaryText: string,
  filePath: string,
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const terms = extractGlossaryTerms(glossaryText);
  const definedTerms = new Set(terms.map((t) => t.term.toUpperCase()));
  const criteria = parseCriteria(criteriaText);

  for (const criterion of criteria) {
    const subject = extractSubject(criterion.text);
    if (subject && !definedTerms.has(subject.toUpperCase())) {
      findings.push(
        createQualityFinding(
          RULE_IDS.GLOSSARY_UNDEFINED,
          `Criterion ${criterion.reference} uses undefined glossary term: ${subject}`,
          filePath,
          criterion.line_number,
          "error",
          criterion.reference,
          subject,
        ),
      );
    }
  }

  return findings;
}
