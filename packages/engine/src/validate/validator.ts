/**
 * Finding construction from the rule catalogue.
 *
 * Artifact validation itself is validateProtocol (protocol-validator.ts),
 * which works on parsed Artifacts; the engine reads no files.
 *
 * @module vellum/protocol-validator/validator
 */

import type { Finding } from "./finding";
import { RuleIdentifier, RULE_MESSAGES } from "./rules";

/**
 * Create a finding with a formatted message.
 *
 * @param file - File path
 * @param line - Line number
 * @param rule - Rule identifier
 * @param substitutions - Optional substitutions for message template
 */
export function createFinding(
  file: string,
  line: number,
  rule: RuleIdentifier,
  substitutions?: Record<string, string>,
): Finding {
  let message = RULE_MESSAGES[rule];

  if (substitutions) {
    for (const [key, value] of Object.entries(substitutions)) {
      message = message.replace(`{${key}}`, value);
    }
  }

  return { file, line, rule, message };
}
