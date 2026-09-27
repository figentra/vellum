/**
 * EARS Parser - validates criteria against EARS patterns.
 *
 * @see requirements.md Requirements 1.1, 1.2, 1.3
 */

import type { QualityFinding } from "@vellum/protocol";
import { createQualityFinding } from "@vellum/protocol";
import { RULE_IDS } from "./rules";
import { matchEarsPattern, hasBothWhenAndIf } from "./patterns/ears-patterns";
import { validateClauseOrder } from "./patterns/clause-order";
import { parseCriteria } from "./patterns/criterion-parser";

/**
 * Parse and validate EARS patterns in requirements text.
 *
 * @param criteriaText - Full requirements text containing criteria
 * @param filePath - Path to the requirements artifact
 * @returns Array of quality findings for violations
 */
export function parseAndValidateEars(criteriaText: string, filePath: string): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const criteria = parseCriteria(criteriaText);

  for (const criterion of criteria) {
    // Check for both WHEN and IF (criterion 1.3)
    if (hasBothWhenAndIf(criterion.text)) {
      findings.push(
        createQualityFinding(
          RULE_IDS.BOTH_WHEN_AND_IF,
          `Criterion ${criterion.reference} uses both WHEN and IF clauses`,
          filePath,
          criterion.line_number,
          "error",
          criterion.reference,
          criterion.text,
        ),
      );
      continue;
    }

    // Check EARS pattern match (criterion 1.1)
    const matchResult = matchEarsPattern(criterion.text);
    if (!matchResult.matches) {
      findings.push(
        createQualityFinding(
          RULE_IDS.EARS_PATTERN_INVALID,
          `Criterion ${criterion.reference} does not match any EARS pattern`,
          filePath,
          criterion.line_number,
          "error",
          criterion.reference,
          criterion.text,
        ),
      );
      continue;
    }

    // Validate clause order for complex patterns (criterion 1.2)
    if (matchResult.isComplex) {
      const orderResult = validateClauseOrder(criterion.text);
      if (!orderResult.valid && orderResult.error) {
        findings.push(
          createQualityFinding(
            RULE_IDS.CLAUSE_ORDER_INVALID,
            `Criterion ${criterion.reference} has invalid clause order: ${orderResult.error}`,
            filePath,
            criterion.line_number,
            "error",
            criterion.reference,
            criterion.text,
          ),
        );
      }
    }
  }

  return findings;
}
