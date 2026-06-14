import type { WorkflowDefinition } from "@/contracts/workflows/internal";

/**
 * @see Story 5.2.3 — Implement canvas state synchronization
 */

export function definitionsEqual(
  left: WorkflowDefinition,
  right: WorkflowDefinition,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
