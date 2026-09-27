/**
 * Format a duration in milliseconds to human-readable string.
 *
 * Converts milliseconds to days, hours, minutes, seconds, milliseconds,
 * showing only non-zero units.
 *
 * @param ms - duration in milliseconds
 * @returns human-readable string like "2d 3h 45m" or "1.5s"
 */
export function formatDuration(ms: number): string {
  if (ms === 0) return "0ms";

  const abs = Math.abs(ms);
  const sign = ms < 0 ? "-" : "";

  const days = Math.floor(abs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((abs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((abs % (60 * 1000)) / 1000);
  const milliseconds = abs % 1000;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  if (milliseconds > 0 && parts.length === 0) parts.push(`${milliseconds}ms`);

  return sign + parts.join(" ");
}

/**
 * Format a duration in milliseconds to ISO 8601 duration.
 *
 * @param ms - duration in milliseconds
 * @returns ISO 8601 duration like "P1DT2H30M"
 */
export function formatDurationISO(ms: number): string {
  if (ms === 0) return "PT0S";

  const abs = Math.abs(ms);

  const days = Math.floor(abs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((abs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((abs % (60 * 1000)) / 1000);

  let result = "P";

  if (days > 0) result += `${days}D`;

  if (hours > 0 || minutes > 0 || seconds > 0) {
    result += "T";
    if (hours > 0) result += `${hours}H`;
    if (minutes > 0) result += `${minutes}M`;
    if (seconds > 0) result += `${seconds}S`;
  }

  return result === "P" ? "PT0S" : result;
}
