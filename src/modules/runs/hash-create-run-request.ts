import { createHash } from "node:crypto";

import type { ToolExecutorRuntimeInputValues } from "@/contracts/runs/executors";

/**
 * Stable request fingerprint for run creation idempotency.
 *
 * @see Story 7.3.2 — Implement idempotent run creation service
 */

function sortRuntimeInputValues(
  inputs: ToolExecutorRuntimeInputValues,
): ToolExecutorRuntimeInputValues {
  const sortedKeys = Object.keys(inputs).sort();
  const sorted: ToolExecutorRuntimeInputValues = {};

  for (const key of sortedKeys) {
    sorted[key] = inputs[key] ?? null;
  }

  return sorted;
}

export function hashCreateRunRequest(
  workflowId: string,
  inputs: ToolExecutorRuntimeInputValues,
): string {
  const payload = {
    workflowId,
    inputs: sortRuntimeInputValues(inputs),
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
