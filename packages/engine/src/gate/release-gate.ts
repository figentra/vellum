/**
 * Release Gate - evaluates release gate requirements.
 *
 * @see requirements.md Requirements 7.1-7.6
 */

import type { GateEvaluationResult, GateRunnerOptions } from "./index";
import { GateOutcome } from "./gate-outcome.js";
import { isVersionIncrementCorrect, validateVersion } from "./validation/version-correctness";
import { verifyRollbackPath } from "./validation/rollback-verifier";
import {
  checkObservability,
  type ObservabilityEndpoint,
  type ObservabilityProbe,
} from "./validation/observability-checker";
import { checkChangeset, type ChangesetFile } from "./validation/changeset-checker";
import {
  validateReleaseConfirmation,
  type ReleaseConfirmation,
} from "./confirmation/release-presenter";
import { compareReleaseValues, formatMismatches } from "./confirmation/value-comparator";

/** What the release gate evaluates, as the caller read it from the repository and the release. */
export interface ReleaseGateInputs {
  /** The version being released, the previous release's, and the declared bump */
  readonly version?: {
    readonly next: string;
    readonly previous?: string;
    readonly bump?: "major" | "minor" | "patch";
  };
  /** Whether the Policy requires a changeset, and the changeset files */
  readonly changesets?: { readonly required: boolean; readonly files?: readonly ChangesetFile[] };
  /** The rollback path the release declares; null when it declares none (criterion 7.5) */
  readonly rollbackPath?: string | null;
  /** Observability endpoints and what probing each observed */
  readonly observability?: {
    readonly endpoints: readonly ObservabilityEndpoint[];
    readonly probes: ReadonlyMap<string, ObservabilityProbe>;
  };
  /** The exact values the Release Confirmation will show (criterion 7.2) */
  readonly confirmation?: ReleaseConfirmation;
}

/** Release checks of criterion 7.1 this engine version does not implement. */
const NOT_IMPLEMENTED = [
  "migration safety",
  "deployment readiness",
  "security posture",
  "post-release verification plan",
] as const;

/**
 * Release gate evaluation.
 */
export class ReleaseGate {
  constructor(
    private readonly options: GateRunnerOptions,
    private readonly inputs: ReleaseGateInputs = {},
  ) {}

  /**
   * Evaluate the release gate (criteria 7.1, 7.2, 7.5).
   */
  evaluate(): GateEvaluationResult {
    const outcome = new GateOutcome(`.agents/specs/${this.options.spec_slug}/`);

    // Version correctness (criterion 7.1)
    const version = this.inputs.version;
    if (!version) {
      outcome.skip("version correctness (criterion 7.1)", "the release version was not supplied");
    } else {
      const parsed = validateVersion(version.next);
      for (const error of parsed.errors) {
        outcome.finding(
          "RELEASE_GATE_VERSION_INVALID",
          `Invalid version ${version.next}: ${error}`,
        );
      }
      if (parsed.valid) {
        if (version.previous === undefined || version.bump === undefined) {
          outcome.skip(
            "version increment (criterion 7.1)",
            "the previous version or the declared bump was not supplied",
          );
        } else if (!isVersionIncrementCorrect(version.previous, version.next, version.bump)) {
          outcome.finding(
            "RELEASE_GATE_VERSION_INVALID",
            `${version.previous} → ${version.next} is not a ${version.bump} increment`,
          );
        }
      }
    }

    // Changesets (criterion 7.1)
    if (!this.inputs.changesets) {
      outcome.skip(
        "changesets (criterion 7.1)",
        "whether the Policy requires a changeset was not supplied",
      );
    } else {
      outcome.record(
        "changesets (criterion 7.1)",
        "RELEASE_GATE_CHANGESET_INVALID",
        checkChangeset(this.inputs.changesets.required, this.inputs.changesets.files),
      );
    }

    // Rollback path (criterion 7.5)
    outcome.record(
      "rollback path (criterion 7.5)",
      "RELEASE_GATE_NO_ROLLBACK",
      verifyRollbackPath(this.options.risk_class, this.inputs.rollbackPath),
    );

    // Observability (criterion 7.1)
    if (!this.inputs.observability) {
      outcome.skip(
        "observability (criterion 7.1)",
        "observability endpoints and probe results were not supplied",
      );
    } else {
      const observability = checkObservability(
        this.inputs.observability.endpoints,
        this.inputs.observability.probes,
      );
      outcome.record(
        "observability (criterion 7.1)",
        "RELEASE_GATE_OBSERVABILITY_FAIL",
        observability.outcome,
      );
    }

    for (const check of NOT_IMPLEMENTED) {
      outcome.skip(`${check} (criterion 7.1)`, "not implemented in this engine version");
    }

    // Release Confirmation values (criterion 7.2)
    if (!this.inputs.confirmation) {
      outcome.skip(
        "release confirmation (criterion 7.2)",
        "the release confirmation values were not supplied",
      );
    } else {
      for (const error of validateReleaseConfirmation(this.inputs.confirmation)) {
        outcome.finding("RELEASE_GATE_CONFIRMATION_INVALID", error);
      }
      if (version && this.inputs.confirmation.version !== version.next) {
        outcome.finding(
          "RELEASE_GATE_CONFIRMATION_INVALID",
          `Confirmation shows version ${this.inputs.confirmation.version}, but ${version.next} is being released`,
        );
      }
    }

    return {
      gate_id: "release-gate",
      status: outcome.status(),
      findings: outcome.findings,
      not_checked: outcome.notChecked,
      artifact_version: null,
      artifact_checksum: null,
    };
  }

  /**
   * Decide whether a confirmed release may execute (criteria 7.3, 7.4).
   *
   * @param shown - The values the Release Confirmation showed
   * @param executing - The values about to be executed, collected independently
   * @param session - The session that answered the confirmation
   * @returns Whether release should proceed, and why not
   */
  executeRelease(
    shown: ReleaseConfirmation,
    executing: ReleaseConfirmation,
    session: { readonly isAssistant: boolean },
  ): { proceed: boolean; reason?: string } {
    if (session.isAssistant) {
      return { proceed: false, reason: "Release confirmation requires a human session" };
    }
    const comparison = compareReleaseValues(shown, executing);
    if (!comparison.match) {
      return { proceed: false, reason: formatMismatches(comparison) };
    }
    return { proceed: true };
  }
}
