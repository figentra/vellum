/**
 * Criterion parser for extracting criterion number, text, and line from requirements.
 *
 * Parses acceptance criteria from requirements.md files.
 *
 * @see requirements.md Requirement 1
 */

/**
 * Parsed criterion.
 */
export interface ParsedCriterion {
  /** Criterion reference (e.g., "1.2", "15.3") */
  reference: string;
  /** Criterion text (the full criterion content) */
  text: string;
  /** Line number in the file (1-based) */
  line_number: number;
  /** The requirement number (e.g., "1", "15") */
  requirement_number: string;
  /** The criterion number within the requirement (e.g., "2", "3") */
  criterion_number: string;
}

/**
 * Parse criteria from requirements.md content.
 */
export function parseCriteria(content: string): ParsedCriterion[] {
  const lines = content.split("\n");
  const criteria: ParsedCriterion[] = [];

  let currentRequirement = "";
  let inAcceptanceCriteria = false;
  let currentCriterionText = "";
  let currentCriterionRef = "";
  let currentCriterionLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Match requirement header: ### Requirement N:
    const reqMatch = line.match(/^### Requirement (\d+):/);
    if (reqMatch) {
      inAcceptanceCriteria = false;
      // Save the previous requirement's pending criterion under its own number
      if (currentCriterionText && currentCriterionRef) {
        criteria.push({
          reference: currentCriterionRef,
          text: currentCriterionText.trim(),
          line_number: currentCriterionLine,
          requirement_number: currentRequirement,
          criterion_number: currentCriterionRef.split(".")[1] ?? "",
        });
      }
      currentRequirement = reqMatch[1] ?? "";
      currentCriterionText = "";
      currentCriterionRef = "";
      continue;
    }

    // Match acceptance criteria section
    if (line.match(/^#### Acceptance Criteria$/)) {
      inAcceptanceCriteria = true;
      continue;
    }

    // Match criterion start: N.M, or a numbered list item "M." under
    // Requirement N (the form the specs are written in)
    const qualified = line.match(/^\s*(?:-\s+)?(\d+)\.(\d+)\s*(.*)$/);
    const listed = qualified || !currentRequirement ? null : line.match(/^\s*(\d+)\.\s+(.*)$/);
    const criterionMatch = qualified
      ? qualified
      : listed
        ? [listed[0], currentRequirement, listed[1], listed[2]]
        : null;
    if (criterionMatch && inAcceptanceCriteria) {
      // Save previous criterion if any
      if (currentCriterionText && currentCriterionRef) {
        criteria.push({
          reference: currentCriterionRef,
          text: currentCriterionText.trim(),
          line_number: currentCriterionLine,
          requirement_number: currentRequirement,
          criterion_number: currentCriterionRef.split(".")[1] ?? "",
        });
      }

      // Start new criterion
      const reqNum = criterionMatch[1];
      const critNum = criterionMatch[2];
      const restOfLine = criterionMatch[3] ?? "";
      currentCriterionRef = `${reqNum}.${critNum}`;
      currentCriterionText = restOfLine;
      currentCriterionLine = i + 1; // 1-based line number
      continue;
    }

    // Continue accumulating criterion text
    if (currentCriterionRef && inAcceptanceCriteria) {
      // Stop if we hit a new section
      if (line.match(/^#{1,4}\s/)) {
        // Save current criterion
        if (currentCriterionText) {
          criteria.push({
            reference: currentCriterionRef,
            text: currentCriterionText.trim(),
            line_number: currentCriterionLine,
            requirement_number: currentRequirement,
            criterion_number: currentCriterionRef.split(".")[1] ?? "",
          });
        }
        currentCriterionRef = "";
        currentCriterionText = "";
        inAcceptanceCriteria = false;
        continue;
      }

      // Append to current criterion text
      currentCriterionText += " " + line.trim();
    }
  }

  // Save any remaining criterion
  if (currentCriterionText && currentCriterionRef) {
    criteria.push({
      reference: currentCriterionRef,
      text: currentCriterionText.trim(),
      line_number: currentCriterionLine,
      requirement_number: currentRequirement,
      criterion_number: currentCriterionRef.split(".")[1] ?? "",
    });
  }

  return criteria;
}

/**
 * Normalize criterion text for comparison.
 * Removes extra whitespace and normalizes to lowercase.
 */
export function normalizeCriterionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]/g, "")
    .trim();
}

/**
 * Extract criterion references from text.
 * Matches patterns like "1.2", "15.3", "Requirements 1.2", etc.
 */
export function extractCriterionReferences(text: string): string[] {
  const refs: string[] = [];

  // Match "Requirements N.M" or "criterion N.M" or "N.M"
  const patterns = [
    /\bRequirements?\s+(\d+\.\d+)/gi,
    /\bcriterion\s+(\d+\.\d+)/gi,
    /\b(\d+\.\d+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const ref = match[1];
      if (ref && !refs.includes(ref)) {
        refs.push(ref);
      }
    }
  }

  return refs;
}

/**
 * Extract all THE subjects from a list of criteria.
 */
export function extractTheSubjects(criteria: ParsedCriterion[]): string[] {
  const subjects: string[] = [];
  const subjectPattern = /\bTHE\s+([A-Z][A-Z0-9_\s]*?)\s+SHALL\b/gi;

  for (const criterion of criteria) {
    let match;
    while ((match = subjectPattern.exec(criterion.text)) !== null) {
      const subject = match[1]?.trim();
      if (subject && !subjects.includes(subject)) {
        subjects.push(subject);
      }
    }
  }

  return subjects;
}
