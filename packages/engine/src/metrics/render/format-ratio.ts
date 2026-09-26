/**
 * Format a ratio as a percentage.
 *
 * @param numerator - the numerator
 * @param denominator - the denominator
 * @param decimals - number of decimal places (default 1)
 * @returns percentage string like "75.5%"
 */
export function formatPercentage(numerator: number, denominator: number, decimals = 1): string {
  if (denominator === 0) return "N/A";

  const percentage = (numerator / denominator) * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format a ratio as a fraction string.
 *
 * @param numerator - the numerator
 * @param denominator - the denominator
 * @returns ratio string like "3/4"
 */
export function formatRatio(numerator: number, denominator: number): string {
  return `${numerator}/${denominator}`;
}

/**
 * Format a ratio for human reading.
 *
 * Chooses between percentage and fraction based on the value.
 *
 * @param numerator - the numerator
 * @param denominator - the denominator
 * @returns human-readable string like "75%" or "3/4"
 */
export function formatRatioHuman(numerator: number, denominator: number): string {
  if (denominator === 0) return "N/A";

  // If denominator is 1 or numerator divides denominator evenly,
  // use percentage
  if (denominator === 100 || numerator === 0 || denominator === 1) {
    return formatPercentage(numerator, denominator);
  }

  // Otherwise, show both fraction and percentage
  const pct = formatPercentage(numerator, denominator, 1);
  return `${pct} (${formatRatio(numerator, denominator)})`;
}
