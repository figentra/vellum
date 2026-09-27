/**
 * Decision domain types for the Vellum Platform.
 *
 * @see requirements.md Requirement 6.1, 6.2
 */

/**
 * Interaction types for decisions.
 *
 * @see Requirement 6.2 - Supported Interaction Types
 */
export type InteractionType =
  | "decision"
  | "checklist"
  | "confirmation"
  | "input"
  | "approval"
  | "automatic gate";

/**
 * A decision option.
 *
 * @see Requirement 6.2 - Options (2-4 for decision/checklist)
 */
export interface DecisionOption {
  /** Option identifier */
  readonly id: string;
  /** Display text */
  readonly text: string;
  /** Effects to apply when selected */
  readonly effects: DecisionEffect[];
}

/**
 * An effect applied when a decision option is selected.
 *
 * @see Requirement 6.8 - Effects application
 */
export interface DecisionEffect {
  /** Effect type */
  readonly type: "transition" | "record" | "block" | "command";
  /** Effect parameters */
  readonly params: Record<string, unknown>;
}

/**
 * A decision contract for human interaction.
 *
 * @see Requirement 6.1 - Decision Contract representation
 */
export interface DecisionContract {
  /** Decision identifier (UUID) */
  readonly id: string;
  /** Interaction type */
  readonly interactionType: InteractionType;
  /** Stage this decision belongs to */
  readonly stage: string;
  /** Trigger condition */
  readonly trigger: string;
  /** Question text */
  readonly question: string;
  /** Available options */
  readonly options: readonly DecisionOption[];
  /** Recommended option ID */
  readonly recommendedOption: string;
  /** Required lifecycle states */
  readonly requiredStates: readonly string[];
}

/**
 * A recorded decision answer.
 *
 * @see Requirement 6.3 - Decision recording
 */
export interface DecisionRecord {
  /** Record identifier (UUID) */
  readonly id: string;
  /** Decision contract ID */
  readonly decisionId: string;
  /** Actor who made the decision */
  readonly actor: string;
  /** Timestamp (ISO 8601) */
  readonly timestamp: string;
  /** Selected option ID */
  readonly selection: string;
  /** Rationale text */
  readonly rationale: string;
}
