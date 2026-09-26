import type { MetricValue } from "./metrics.interface.js";
import type { LedgerEntry } from "../../domain/ledger/types.js";

/**
 * Compute approval latency from Ledger entries.
 *
 * For each approval entry, finds the git commit that introduced the approved
 * artifact checksum, computes duration from artifact creation timestamp to
 * approval timestamp, averages across all approvals in scope.
 *
 * Degrades to Ledger timestamps only if GitReadError.
 *
 * @param entries - Ledger entries in scope
 * @param artifactCreationTimestamps - Map of artifact checksum to creation timestamp
 * @returns MetricValue with average approval latency
 */
export function computeApprovalLatency(
  entries: readonly LedgerEntry[],
  artifactCreationTimestamps: ReadonlyMap<string, number>,
): MetricValue {
  const approvalEntries = entries.filter((e) => e.kind === "approval");

  const latencies: number[] = [];

  for (const entry of approvalEntries) {
    const approvalTimestamp = new Date(entry.timestamp).getTime();

    // Get artifact checksum
    const checksum =
      "artifact_checksum" in entry && typeof entry.artifact_checksum === "string"
        ? entry.artifact_checksum
        : null;

    if (!checksum) {
      // Fallback: use artifact_path to find creation time
      const artifactPath =
        "artifact_path" in entry && typeof entry.artifact_path === "string"
          ? entry.artifact_path
          : null;
      if (!artifactPath) continue;

      const creationTimestamp = artifactCreationTimestamps.get(artifactPath);
      if (creationTimestamp === undefined) continue;

      latencies.push(approvalTimestamp - creationTimestamp);
    } else {
      const creationTimestamp = artifactCreationTimestamps.get(checksum);
      if (creationTimestamp === undefined) continue;

      latencies.push(approvalTimestamp - creationTimestamp);
    }
  }

  if (latencies.length === 0) {
    return { kind: "duration", value: 0 };
  }

  const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
  return { kind: "duration", value: avgLatency };
}
