/**
 * Published vague term list for Quality Checker.
 *
 * @see requirements.md criterion 1.5
 */

/**
 * Vague terms that should not appear in criteria.
 */
export const VAGUE_TERMS = [
  "quickly",
  "adequately",
  "reasonable",
  "user-friendly",
  "robust",
  "efficient",
  "performant",
  "scalable",
  "sufficient",
  "appropriate",
  "fast",
  "slow",
  "timely",
  "effectively",
  "properly",
  "correctly",
  "proper",
  "adequate",
  "satisfactory",
  "good",
  "bad",
  "simple",
  "easy",
  "complex",
  "flexible",
  "maintainable",
] as const;

export type VagueTerm = (typeof VAGUE_TERMS)[number];

/**
 * Check if a term is a vague term.
 */
export function isVagueTerm(term: string): term is VagueTerm {
  return VAGUE_TERMS.includes(term.toLowerCase() as VagueTerm);
}
