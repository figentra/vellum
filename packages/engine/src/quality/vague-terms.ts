/**
 * Vague Terms Checker - detects vague terms, escape clauses, and absolutes.
 *
 * @see requirements.md Requirement 1.5
 */

import type { QualityFinding } from "@vellum/protocol";
import { createQualityFinding } from "@vellum/protocol";
import { RULE_IDS } from "./rules";
import { parseCriteria } from "./patterns/criterion-parser";
import { isVagueTerm } from "./lists/vague-terms";
import { containsEscapeClause } from "./lists/escape-clauses";
import { containsAbsolute } from "./lists/absolutes";

/**
 * Check for vague terms, escape clauses, and absolutes in requirements.
 *
 * @param criteriaText - Full requirements text
 * @param filePath - Path to the requirements artifact
 * @returns Array of quality findings for violations
 */
export function checkVagueTerms(criteriaText: string, filePath: string): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const criteria = parseCriteria(criteriaText);

  for (const criterion of criteria) {
    // Check for vague terms
    const vagueTerms = findVagueTermsInText(criterion.text);
    for (const term of vagueTerms) {
      findings.push(
        createQualityFinding(
          RULE_IDS.VAGUE_TERM_USED,
          `Criterion ${criterion.reference} uses vague term "${term}"`,
          filePath,
          criterion.line_number,
          "warn",
          criterion.reference,
          term,
        ),
      );
    }

    // Check for escape clauses (criterion 1.5)
    const escapeClause = containsEscapeClause(criterion.text);
    if (escapeClause) {
      findings.push(
        createQualityFinding(
          RULE_IDS.VAGUE_TERM_USED,
          `Criterion ${criterion.reference} uses escape clause "${escapeClause}"`,
          filePath,
          criterion.line_number,
          "warn",
          criterion.reference,
          escapeClause,
        ),
      );
    }

    // Check for absolutes (criterion 1.5)
    const absolute = containsAbsolute(criterion.text);
    if (absolute) {
      findings.push(
        createQualityFinding(
          RULE_IDS.VAGUE_TERM_USED,
          `Criterion ${criterion.reference} uses absolute "${absolute}"`,
          filePath,
          criterion.line_number,
          "warn",
          criterion.reference,
          absolute,
        ),
      );
    }
  }

  return findings;
}

/**
 * Find all vague terms in text.
 */
function findVagueTermsInText(text: string): string[] {
  const terms: string[] = [];
  const words = text.split(/\s+/);

  for (const word of words) {
    const cleaned = word.toLowerCase().replace(/[.,!?;:]/, "");
    if (isVagueTerm(cleaned)) {
      terms.push(word);
    }
  }

  return terms;
}
