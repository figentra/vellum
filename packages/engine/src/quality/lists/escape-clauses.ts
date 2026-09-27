/**
 * Published escape clause list for Quality Checker.
 *
 * @see requirements.md criterion 1.5
 */

/**
 * Escape clauses that should not appear in criteria.
 */
export const ESCAPE_CLAUSES = [
  "where possible",
  "if feasible",
  "as appropriate",
  "if practical",
  "where applicable",
  "where economically viable",
  "where reasonable",
  "when possible",
  "where necessary",
  "as needed",
  "as required",
  "where available",
  "if available",
  "to the extent possible",
  "where appropriate",
  "if deemed necessary",
] as const;

export type EscapeClause = (typeof ESCAPE_CLAUSES)[number];

/**
 * Check if text contains an escape clause.
 */
export function containsEscapeClause(text: string): EscapeClause | null {
  const lowerText = text.toLowerCase();
  for (const clause of ESCAPE_CLAUSES) {
    if (lowerText.includes(clause)) {
      return clause;
    }
  }
  return null;
}
