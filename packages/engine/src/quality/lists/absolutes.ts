/**
 * Published absolute list for Quality Checker.
 *
 * @see requirements.md criterion 1.5
 */

/**
 * Absolute words that should not appear in criteria.
 */
export const ABSOLUTES = [
  "never",
  "always",
  "all",
  "100%",
  "every conceivable",
  "any and all",
  "every single",
  "completely",
  "totally",
  "absolutely",
  "entirely",
  "perfectly",
  "forever",
] as const;

export type Absolute = (typeof ABSOLUTES)[number];

/**
 * Check if text contains an absolute word.
 */
export function containsAbsolute(text: string): Absolute | null {
  const lowerText = text.toLowerCase();
  for (const abs of ABSOLUTES) {
    // Use word boundary check to avoid false positives like "SHALL" containing "all"
    const regex = new RegExp(`\\b${abs.toLowerCase()}\\b`);
    if (regex.test(lowerText)) {
      return abs;
    }
  }
  return null;
}
