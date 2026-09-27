/**
 * Coverage Checker - validates design.md coverage table against requirements.
 *
 * @see requirements.md Requirements 2.1, 2.2
 */

import type { QualityFinding } from "@vellum/protocol";
import { RULE_IDS } from "./rules";
import { parseCriteria } from "./patterns/criterion-parser";

/**
 * Coverage table row parsed from design.md.
 */
export interface CoverageRow {
  /** Criterion reference (e.g., "1.2") */
  criterion_reference: string;
  /** Property covering this criterion */
  property: string;
  /** Line number in design.md */
  line_number: number;
}

/**
 * Property definition from design.md.
 */
export interface PropertyDefinition {
  /** Property number (e.g., "1") */
  number: string;
  /** Property title */
  title: string;
  /** Validates line content */
  validates?: string[];
  /** Line number in design.md */
  line_number: number;
}

/**
 * Parse coverage table from design.md.
 *
 * @param designText - Full design.md text
 * @returns Array of coverage rows
 */
export function parseCoverageTable(designText: string): CoverageRow[] {
  const rows: CoverageRow[] = [];
  const lines = designText.split("\n");
  let inCoverageTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Detect coverage table section
    if (line.includes("Requirement coverage") || line.includes("Coverage Table")) {
      inCoverageTable = true;
      continue;
    }

    // End of table
    if (inCoverageTable && !line.trim().startsWith("|")) {
      break;
    }

    // Parse table row
    if (inCoverageTable && line.trim().startsWith("|")) {
      const match = line.match(/\|\s*([0-9.]+)\s*\|\s*(?:Property\s+)?(\d+)/);
      if (match?.[1] !== undefined && match[2] !== undefined) {
        rows.push({
          criterion_reference: match[1],
          property: match[2],
          line_number: i + 1,
        });
      }
    }
  }

  return rows;
}

/**
 * A property heading, in either form the protocol accepts:
 *   `**Property N: Title**`  (bold, as the design document was first written)
 *   `Property N: Title`      (plain, at the start of a line — the form the
 *                             method's design template and spec-design skill write)
 * The plain form is anchored to the start of the line so that prose and
 * table cells that mention "Property 1" are not read as definitions.
 */
const BOLD_PROPERTY = /\*\*Property\s+(\d+):\s*(.+?)\*\*/;
const PLAIN_PROPERTY = /^\s*Property\s+(\d+):\s*(\S.*?)\s*$/;

function matchProperty(line: string): { number: string; title: string } | null {
  const match = BOLD_PROPERTY.exec(line) ?? PLAIN_PROPERTY.exec(line);
  return match?.[1] !== undefined && match[2] !== undefined
    ? { number: match[1], title: match[2] }
    : null;
}

/**
 * Parse property definitions from design.md. Lines inside fenced code blocks
 * are examples, not definitions, and are skipped.
 *
 * @param designText - Full design.md text
 * @returns Array of property definitions
 */
export function parseProperties(designText: string): PropertyDefinition[] {
  const properties: PropertyDefinition[] = [];
  const lines = designText.split("\n");
  let fenced = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    const heading = matchProperty(line);
    if (heading !== null) {
      const prop: PropertyDefinition = {
        number: heading.number,
        title: heading.title,
        line_number: i + 1,
      };

      // Look for Validates line in following lines
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j];
        if (!nextLine) continue;
        const validatesMatch = nextLine.match(/\*\*Validates:\s*Requirements\s+([0-9.,\s]+)\*\*/i);
        if (validatesMatch?.[1] !== undefined) {
          prop.validates = validatesMatch[1].split(",").map((s) => s.trim());
          break;
        }
        if (matchProperty(nextLine) !== null) {
          break; // Next property
        }
      }

      properties.push(prop);
    }
  }

  return properties;
}

/**
 * Check coverage table completeness.
 *
 * @param requirementsText - Full requirements.md text
 * @param designText - Full design.md text
 * @param designPath - Path to design.md
 * @returns Array of quality findings
 */
export function checkCoverage(
  requirementsText: string,
  designText: string,
  designPath: string,
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const criteria = parseCriteria(requirementsText);
  const coverageRows = parseCoverageTable(designText);
  const properties = parseProperties(designText);

  const coveredCriteria = new Set(coverageRows.map((r) => r.criterion_reference));

  // Check that each criterion has a coverage row (criterion 2.1)
  for (const criterion of criteria) {
    if (!coveredCriteria.has(criterion.reference)) {
      findings.push({
        file_path: designPath,
        line_number: 1,
        rule_id: RULE_IDS.COVERAGE_TABLE_INCOMPLETE,
        code: RULE_IDS.COVERAGE_TABLE_INCOMPLETE,
        message: `Coverage table missing row for criterion ${criterion.reference}`,
        severity: "error",
        level: "error",
        criterion_reference: criterion.reference,
      });
    }
  }

  // Check that each property has a Validates line (criterion 2.2)
  for (const prop of properties) {
    if (!prop.validates || prop.validates.length === 0) {
      findings.push({
        file_path: designPath,
        line_number: prop.line_number,
        rule_id: RULE_IDS.PROPERTY_VALIDATES_MISSING,
        code: RULE_IDS.PROPERTY_VALIDATES_MISSING,
        message: `Property ${prop.number} missing Validates line`,
        severity: "error",
        level: "error",
      });
    }
  }

  // Check property numbering is contiguous (criterion 2.3)
  const propertyNumbers = properties.map((p) => parseInt(p.number, 10)).sort((a, b) => a - b);
  for (let i = 0; i < propertyNumbers.length; i++) {
    const propNum = propertyNumbers[i];
    if (propNum !== i + 1) {
      findings.push({
        file_path: designPath,
        line_number: 1,
        rule_id: RULE_IDS.PROPERTY_NUMBERING_GAP,
        code: RULE_IDS.PROPERTY_NUMBERING_GAP,
        message: `Property numbering gap: expected ${i + 1}, found ${propNum}`,
        severity: "error",
        level: "error",
      });
      break;
    }
  }

  return findings;
}
