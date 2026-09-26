/**
 * Clause order validator for complex EARS patterns.
 *
 * Valid clause order: WHERE → WHILE → WHEN|IF → THE → SHALL
 *
 * @see requirements.md criterion 1.2
 */

import { detectClauses } from "./ears-patterns";

/**
 * Clause position in text.
 */
interface ClausePosition {
  type: "WHERE" | "WHILE" | "WHEN" | "IF" | "THE" | "SHALL";
  position: number;
}

/**
 * Find clause positions in text.
 */
function findClausePositions(text: string): ClausePosition[] {
  const positions: ClausePosition[] = [];

  // Find each clause type
  const patterns: Array<{ type: ClausePosition["type"]; pattern: RegExp }> = [
    { type: "WHERE", pattern: /\bWHERE\b/i },
    { type: "WHILE", pattern: /\bWHILE\b/i },
    { type: "WHEN", pattern: /\bWHEN\b/i },
    { type: "IF", pattern: /\bIF\b/i },
    { type: "THE", pattern: /\bTHE\b/i },
    { type: "SHALL", pattern: /\bSHALL\b/i },
  ];

  for (const { type, pattern } of patterns) {
    const match = pattern.exec(text);
    if (match?.index !== undefined) {
      positions.push({ type, position: match.index });
    }
  }

  // Sort by position
  return positions.sort((a, b) => a.position - b.position);
}

/**
 * Validate clause order for complex patterns.
 * Returns true if valid, false if invalid.
 */
export function validateClauseOrder(text: string): {
  valid: boolean;
  error: string | null;
} {
  const clauses = detectClauses(text);

  // If not a complex pattern, it's valid
  const clauseCount = Object.values(clauses).filter(Boolean).length;
  if (clauseCount < 2) {
    return { valid: true, error: null };
  }

  // Check for both WHEN and IF (invalid)
  if (clauses.when && clauses.if) {
    return {
      valid: false,
      error: "Criterion uses both WHEN and IF clauses",
    };
  }

  const positions = findClausePositions(text);
  const order = positions.map((p) => p.type);

  // Expected order for complex: WHERE, WHILE, WHEN/IF, THE, SHALL
  const whereIndex = order.indexOf("WHERE");
  const whileIndex = order.indexOf("WHILE");
  const whenIndex = order.indexOf("WHEN");
  const ifIndex = order.indexOf("IF");
  const theIndex = order.indexOf("THE");
  const shallIndex = order.indexOf("SHALL");

  // THE and SHALL must be present
  if (theIndex === -1) {
    return { valid: false, error: "Missing THE clause" };
  }
  if (shallIndex === -1) {
    return { valid: false, error: "Missing SHALL clause" };
  }

  // THE must come before SHALL
  if (theIndex > shallIndex) {
    return { valid: false, error: "THE clause must come before SHALL" };
  }

  // WHERE must come before THE
  if (whereIndex !== -1 && whereIndex > theIndex) {
    return { valid: false, error: "WHERE clause must come before THE" };
  }

  // WHILE must come before THE
  if (whileIndex !== -1 && whileIndex > theIndex) {
    return { valid: false, error: "WHILE clause must come before THE" };
  }

  // WHEN/IF must come before THE
  if (whenIndex !== -1 && whenIndex > theIndex) {
    return { valid: false, error: "WHEN clause must come before THE" };
  }
  if (ifIndex !== -1 && ifIndex > theIndex) {
    return { valid: false, error: "IF clause must come before THE" };
  }

  // WHERE must come before WHILE
  if (whereIndex !== -1 && whileIndex !== -1 && whereIndex > whileIndex) {
    return { valid: false, error: "WHERE clause must come before WHILE" };
  }

  // WHILE must come before WHEN/IF
  if (whileIndex !== -1) {
    const triggerIndex = whenIndex !== -1 ? whenIndex : ifIndex;
    if (triggerIndex !== -1 && whileIndex > triggerIndex) {
      return { valid: false, error: "WHILE clause must come before WHEN/IF" };
    }
  }

  // WHERE must come before WHEN/IF
  if (whereIndex !== -1) {
    const triggerIndex = whenIndex !== -1 ? whenIndex : ifIndex;
    if (triggerIndex !== -1 && whereIndex > triggerIndex) {
      return { valid: false, error: "WHERE clause must come before WHEN/IF" };
    }
  }

  return { valid: true, error: null };
}

/**
 * Get the expected clause order string for complex patterns.
 */
export function getExpectedOrder(): string {
  return "WHERE → WHILE → WHEN|IF → THE → SHALL";
}
