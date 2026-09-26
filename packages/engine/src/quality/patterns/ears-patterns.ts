/**
 * EARS Pattern recognizers for the Quality Checker.
 *
 * The six EARS (Easy Approach to Requirements Syntax) patterns:
 * 1. Ubiquitous: THE <subject> SHALL <behavior>
 * 2. Event-driven: WHEN <trigger>, THE <subject> SHALL <behavior>
 * 3. State-driven: WHILE <state>, THE <subject> SHALL <behavior>
 * 4. Optional: IF <condition>, THEN THE <subject> SHALL <behavior>
 * 5. Scope: WHERE <scope>, THE <subject> SHALL <behavior>
 * 6. Complex: Combining multiple clauses in fixed order
 *
 * @see requirements.md Requirements 1.1, 1.2, 1.3
 */

/**
 * Match result for an EARS pattern.
 */
export interface EarsMatchResult {
  /** Whether the text matches an EARS pattern */
  matches: boolean;
  /** Which pattern matched */
  pattern: EarsPattern | null;
  /** Extracted subject (THE clause) */
  subject: string | null;
  /** Whether it's a complex pattern */
  isComplex: boolean;
}

/**
 * EARS pattern types.
 */
export type EarsPattern =
  | "ubiquitous"
  | "event-driven"
  | "state-driven"
  | "optional"
  | "scope"
  | "complex";

/**
 * Regex patterns for EARS recognition.
 * These patterns are case-insensitive and handle flexible whitespace.
 */
const PATTERNS = {
  // Ubiquitous: THE <subject> SHALL <behavior>
  ubiquitous: /\bTHE\s+([A-Z][A-Z0-9_\s]*?)\s+SHALL\b/i,

  // Event-driven: WHEN <trigger>, THE <subject> SHALL <behavior>
  eventDriven: /\bWHEN\s+(.+?),\s*THE\s+([A-Z][A-Z0-9_\s]*?)\s+SHALL\b/i,

  // State-driven: WHILE <state>, THE <subject> SHALL <behavior>
  stateDriven: /\bWHILE\s+(.+?),\s*THE\s+([A-Z][A-Z0-9_\s]*?)\s+SHALL\b/i,

  // Optional: IF <condition>, THEN THE <subject> SHALL <behavior>
  optional: /\bIF\s+(.+?),\s+THEN\s+THE\s+([A-Z][A-Z0-9_\s]*?)\s+SHALL\b/i,

  // Scope: WHERE <scope>, THE <subject> SHALL <behavior>
  scope: /\bWHERE\s+(.+?),\s*THE\s+([A-Z][A-Z0-9_\s]*?)\s+SHALL\b/i,
} as const;

/**
 * Check if text matches the ubiquitous pattern.
 */
function matchUbiquitous(text: string): EarsMatchResult {
  const match = text.match(PATTERNS.ubiquitous);
  if (match) {
    return {
      matches: true,
      pattern: "ubiquitous",
      subject: match[1]?.trim() ?? null,
      isComplex: false,
    };
  }
  return { matches: false, pattern: null, subject: null, isComplex: false };
}

/**
 * Check if text matches the event-driven pattern.
 */
function matchEventDriven(text: string): EarsMatchResult {
  const match = text.match(PATTERNS.eventDriven);
  if (match) {
    return {
      matches: true,
      pattern: "event-driven",
      subject: match[2]?.trim() ?? null,
      isComplex: false,
    };
  }
  return { matches: false, pattern: null, subject: null, isComplex: false };
}

/**
 * Check if text matches the state-driven pattern.
 */
function matchStateDriven(text: string): EarsMatchResult {
  const match = text.match(PATTERNS.stateDriven);
  if (match) {
    return {
      matches: true,
      pattern: "state-driven",
      subject: match[2]?.trim() ?? null,
      isComplex: false,
    };
  }
  return { matches: false, pattern: null, subject: null, isComplex: false };
}

/**
 * Check if text matches the optional pattern.
 */
function matchOptional(text: string): EarsMatchResult {
  const match = text.match(PATTERNS.optional);
  if (match) {
    return {
      matches: true,
      pattern: "optional",
      subject: match[2]?.trim() ?? null,
      isComplex: false,
    };
  }
  return { matches: false, pattern: null, subject: null, isComplex: false };
}

/**
 * Check if text matches the scope pattern.
 */
function matchScope(text: string): EarsMatchResult {
  const match = text.match(PATTERNS.scope);
  if (match) {
    return {
      matches: true,
      pattern: "scope",
      subject: match[2]?.trim() ?? null,
      isComplex: false,
    };
  }
  return { matches: false, pattern: null, subject: null, isComplex: false };
}

/**
 * Detect clauses present in text.
 */
export function detectClauses(
  text: string,
): { when: boolean; while: boolean; if: boolean; where: boolean } {
  return {
    when: /\bWHEN\b/i.test(text),
    while: /\bWHILE\b/i.test(text),
    if: /\bIF\b/i.test(text),
    where: /\bWHERE\b/i.test(text),
  };
}

/**
 * Check if a criterion is a complex pattern (uses multiple clauses).
 */
export function isComplexPattern(text: string): boolean {
  const clauses = detectClauses(text);
  const clauseCount = Object.values(clauses).filter(Boolean).length;
  return clauseCount >= 2;
}

/**
 * Check if text contains both WHEN and IF (invalid).
 */
export function hasBothWhenAndIf(text: string): boolean {
  const clauses = detectClauses(text);
  return clauses.when && clauses.if;
}

/**
 * Extract THE subject from text.
 */
export function extractSubject(text: string): string | null {
  const match = text.match(/\bTHE\s+([A-Z][A-Z0-9_\s]*?)\s+SHALL\b/i);
  return match?.[1]?.trim() ?? null;
}

/**
 * Match text against all EARS patterns.
 * Returns the first pattern that matches.
 */
export function matchEarsPattern(text: string): EarsMatchResult {
  // Check for complex pattern first (multiple clauses)
  if (isComplexPattern(text)) {
    const subject = extractSubject(text);
    return {
      matches: !!subject,
      pattern: subject ? "complex" : null,
      subject,
      isComplex: true,
    };
  }

  // Check single-clause patterns
  // Order matters: check more specific patterns first

  const eventDriven = matchEventDriven(text);
  if (eventDriven.matches) return eventDriven;

  const stateDriven = matchStateDriven(text);
  if (stateDriven.matches) return stateDriven;

  const optional = matchOptional(text);
  if (optional.matches) return optional;

  const scope = matchScope(text);
  if (scope.matches) return scope;

  const ubiquitous = matchUbiquitous(text);
  if (ubiquitous.matches) return ubiquitous;

  return { matches: false, pattern: null, subject: null, isComplex: false };
}

/**
 * Check if text is a valid EARS pattern.
 */
export function isValidEarsPattern(text: string): boolean {
  return matchEarsPattern(text).matches;
}
