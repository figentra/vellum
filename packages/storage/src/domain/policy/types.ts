/**
 * @vellum/storage — Policy Domain Types
 *
 * Type definitions for policy configuration.
 */

/** Consumer configuration for approval policy */
export interface ConsumerConfiguration {
  readonly schema: string;
  readonly consumers: readonly ConsumerConfig[];
}

/** Consumer configuration */
export interface ConsumerConfig {
  readonly email: string;
  readonly riskClasses?: readonly string[];
  readonly artifacts?: readonly string[];
}

/** Policy validation error */
export interface PolicyError {
  readonly path: string;
  readonly message: string;
}
