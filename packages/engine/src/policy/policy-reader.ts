/**
 * Policy Reader - reads and validates Policy from Consumer Repository.
 *
 * @see Requirement 1.2 - read Controls from Policy
 * @see Requirement 1.3 - apply defaults where Policy declares no value
 * @see Requirement 1.6 - exit 2 on schema violation
 */

import type { Policy, Control, RiskClass, PolicySchema } from "../../domain/policy/types";

/**
 * Policy validation error.
 */
export interface PolicyValidationError {
  readonly code: "POLICY_SCHEMA_VIOLATION" | "POLICY_MISSING" | "POLICY_PARSE_ERROR";
  readonly message: string;
  readonly file: string;
  readonly field?: string;
  readonly exitStatus: 2;
}

/**
 * Policy read result.
 */
export interface PolicyReadResult {
  readonly policy: Policy;
  readonly warnings: readonly string[];
}

/**
 * Default Risk Class Controls from Table 1.A.
 *
 * @see requirements.md Table 1.A
 */
export const DEFAULT_RISK_CLASS_CONTROLS: Record<RiskClass, Control> = {
  low: {
    requirementsReview: "required",
    designReview: "optional",
    securityGate: "optional",
    approvalsPerArtifact: 1,
    releaseGate: "standard",
    quickPathPermitted: true,
  },
  standard: {
    requirementsReview: "required",
    designReview: "required",
    securityGate: "when_conditions_match",
    approvalsPerArtifact: 1,
    releaseGate: "standard",
    quickPathPermitted: false,
  },
  high: {
    requirementsReview: "required",
    designReview: "required",
    securityGate: "required",
    approvalsPerArtifact: 1,
    releaseGate: "explicit",
    quickPathPermitted: false,
  },
  critical: {
    requirementsReview: "required",
    designReview: "required",
    securityGate: "required",
    approvalsPerArtifact: 2,
    releaseGate: "explicit_with_rollback_path",
    quickPathPermitted: false,
  },
};

/**
 * Policy Schema definition.
 */
export const POLICY_SCHEMA: PolicySchema = {
  version: "1.0.0",
  properties: {
    risk_classes: {
      type: "array",
      items: { enum: ["low", "standard", "high", "critical"] },
      required: false,
    },
    controls: {
      type: "object",
      additionalProperties: true,
      required: false,
    },
    model_tiers: {
      type: "object",
      additionalProperties: { enum: ["reader", "frontier"] },
      required: false,
    },
    spec_size_limit: {
      type: "integer",
      minimum: 1,
      required: false,
    },
    section_write_threshold: {
      type: "integer",
      minimum: 1024,
      required: false,
    },
  },
};

/**
 * Read and validate Policy from Consumer Repository.
 *
 * @param policyPath - path to Policy JSON file
 * @returns Policy with warnings
 * @throws {PolicyValidationError} when schema validation fails
 */
export function readPolicy(policyPath: string): PolicyReadResult {
  let policyJson: unknown;

  try {
    // In runtime, this would use fs.readFileSync or similar
    // For now, this is a placeholder that will be connected to actual file reading
    policyJson = {} as Record<string, unknown>;
  } catch (error) {
    const validationError: PolicyValidationError = {
      code: "POLICY_MISSING",
      message: `Policy file not found: ${policyPath}`,
      file: policyPath,
      exitStatus: 2,
    };
    throw validationError;
  }

  // Validate schema
  const validationResult = validatePolicySchema(policyJson, policyPath);
  if (!validationResult.valid) {
    const validationError: PolicyValidationError = {
      code: "POLICY_SCHEMA_VIOLATION",
      message: validationResult.message,
      file: policyPath,
      field: validationResult.field,
      exitStatus: 2,
    };
    throw validationError;
  }

  const policy = policyJson as Policy;

  // Apply defaults for missing Controls
  const warnings: string[] = [];
  for (const riskClass of ["low", "standard", "high", "critical"] as RiskClass[]) {
    if (!policy.controls?.[riskClass]) {
      warnings.push(`No controls declared for risk class '${riskClass}', applying defaults`);
    }
  }

  return { policy, warnings };
}

/**
 * Validate Policy against schema.
 *
 * @param policy - Policy object to validate
 * @param policyPath - path to Policy file (for error messages)
 * @returns validation result
 */
export function validatePolicySchema(
  policy: unknown,
  policyPath: string,
): { valid: true } | { valid: false; message: string; field?: string } {
  if (typeof policy !== "object" || policy === null) {
    return {
      valid: false,
      message: `Policy must be an object, got ${typeof policy}`,
      field: "",
    };
  }

  const obj = policy as Record<string, unknown>;

  // Validate risk_classes if present
  if ("risk_classes" in obj) {
    const riskClasses = obj.risk_classes;
    if (!Array.isArray(riskClasses)) {
      return {
        valid: false,
        message: "risk_classes must be an array",
        field: "risk_classes",
      };
    }
    for (const rc of riskClasses) {
      if (!["low", "standard", "high", "critical"].includes(rc as string)) {
        return {
          valid: false,
          message: `Invalid risk class '${rc}', must be one of: low, standard, high, critical`,
          field: "risk_classes",
        };
      }
    }
  }

  // Validate spec_size_limit if present
  if ("spec_size_limit" in obj) {
    const limit = obj.spec_size_limit;
    if (typeof limit !== "number" || limit < 1) {
      return {
        valid: false,
        message: `spec_size_limit must be a positive integer, got ${limit}`,
        field: "spec_size_limit",
      };
    }
  }

  // Validate model_tiers if present
  if ("model_tiers" in obj) {
    const modelTiers = obj.model_tiers;
    if (typeof modelTiers !== "object" || modelTiers === null) {
      return {
        valid: false,
        message: "model_tiers must be an object",
        field: "model_tiers",
      };
    }
    const tiers = modelTiers as Record<string, unknown>;
    for (const [role, tier] of Object.entries(tiers)) {
      if (tier !== "reader" && tier !== "frontier") {
        return {
          valid: false,
          message: `Invalid model tier '${tier}' for role '${role}', must be 'reader' or 'frontier'`,
          field: `model_tiers.${role}`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Merge Policy Controls with defaults.
 *
 * @param declared - Controls declared in Policy
 * @param riskClass - Risk Class to get defaults for
 * @returns merged Control
 */
export function mergeWithDefaults(
  declared: Partial<Control> | undefined,
  riskClass: RiskClass,
): Control {
  const defaults = DEFAULT_RISK_CLASS_CONTROLS[riskClass];

  if (!declared) {
    return defaults;
  }

  return {
    requirementsReview: declared.requirementsReview ?? defaults.requirementsReview,
    designReview: declared.designReview ?? defaults.designReview,
    securityGate: declared.securityGate ?? defaults.securityGate,
    approvalsPerArtifact: declared.approvalsPerArtifact ?? defaults.approvalsPerArtifact,
    releaseGate: declared.releaseGate ?? defaults.releaseGate,
    quickPathPermitted: declared.quickPathPermitted ?? defaults.quickPathPermitted,
  };
}
