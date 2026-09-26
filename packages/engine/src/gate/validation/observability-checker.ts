/**
 * Observability Checker - judges observability endpoint probes.
 *
 * The engine makes no network calls: the caller probes each endpoint and
 * supplies what it observed. An endpoint with no probe is not checked, never
 * assumed healthy.
 *
 * @see requirements.md Requirement 7.1
 */

import type { CheckOutcome } from "./outcome.js";

/**
 * Observability endpoint configuration.
 */
export interface ObservabilityEndpoint {
  /** Endpoint name */
  name: string;
  /** Endpoint URL */
  url: string;
  /** Expected status code */
  expectedStatus: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

/** What probing one endpoint observed. */
export type ObservabilityProbe =
  | { readonly kind: "response"; readonly status: number; readonly responseTimeMs: number }
  | { readonly kind: "error"; readonly message: string };

/**
 * Observability check result.
 */
export interface ObservabilityCheckResult {
  /** pass: every endpoint probed healthy; fail: one was not; not_checked: one was not probed */
  outcome: CheckOutcome;
  /** Checked endpoints; `healthy` is null for an endpoint with no probe */
  endpoints: {
    name: string;
    healthy: boolean | null;
    responseTime?: number;
  }[];
}

/**
 * Judge observability endpoints from the caller's probes.
 *
 * @param endpoints - Endpoints to check
 * @param probes - What probing each endpoint observed, keyed by endpoint name
 * @returns Observability check result
 */
export function checkObservability(
  endpoints: readonly ObservabilityEndpoint[],
  probes: ReadonlyMap<string, ObservabilityProbe>,
): ObservabilityCheckResult {
  const errors: string[] = [];
  const unprobed: string[] = [];
  const checked: ObservabilityCheckResult["endpoints"] = [];

  for (const endpoint of endpoints) {
    const probe = probes.get(endpoint.name);
    if (!probe) {
      unprobed.push(endpoint.name);
      checked.push({ name: endpoint.name, healthy: null });
      continue;
    }
    if (probe.kind === "error") {
      errors.push(`Observability endpoint ${endpoint.name} unhealthy: ${probe.message}`);
      checked.push({ name: endpoint.name, healthy: false });
      continue;
    }
    const inTime = endpoint.timeout === undefined || probe.responseTimeMs <= endpoint.timeout;
    const healthy = probe.status === endpoint.expectedStatus && inTime;
    if (!healthy) {
      errors.push(
        probe.status !== endpoint.expectedStatus
          ? `Observability endpoint ${endpoint.name} returned ${probe.status}, expected ${endpoint.expectedStatus}`
          : `Observability endpoint ${endpoint.name} took ${probe.responseTimeMs} ms, over its ${endpoint.timeout} ms timeout`,
      );
    }
    checked.push({ name: endpoint.name, healthy, responseTime: probe.responseTimeMs });
  }

  const outcome: CheckOutcome =
    errors.length > 0
      ? { status: "fail", errors }
      : unprobed.length > 0
        ? { status: "not_checked", reason: `no probe result for ${unprobed.join(", ")}` }
        : endpoints.length === 0
          ? { status: "not_checked", reason: "no observability endpoints were declared" }
          : { status: "pass" };

  return { outcome, endpoints: checked };
}

/**
 * Get default observability endpoints for a service.
 *
 * @param serviceName - Service name
 * @returns Default endpoints
 */
export function getDefaultObservabilityEndpoints(serviceName: string): ObservabilityEndpoint[] {
  return [
    { name: "health", url: `/${serviceName}/health`, expectedStatus: 200 },
    { name: "metrics", url: `/${serviceName}/metrics`, expectedStatus: 200 },
    { name: "ready", url: `/${serviceName}/ready`, expectedStatus: 200 },
  ];
}
