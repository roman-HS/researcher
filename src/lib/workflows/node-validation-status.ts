import type { WorkflowDefinitionValidationIssue } from "@/contracts/workflows/validation";

/**
 * Per-node validation status for the workflow builder canvas.
 *
 * @see Story 5.2.2 — Implement custom workflow node component
 */

export type WorkflowNodeValidationStatus = "ok" | "warning" | "error";

export function buildNodeValidationStatusByNodeId(
  issues: readonly WorkflowDefinitionValidationIssue[],
): Record<string, WorkflowNodeValidationStatus> {
  const statusByNodeId: Record<string, WorkflowNodeValidationStatus> = {};

  for (const issue of issues) {
    if (!issue.nodeId) {
      continue;
    }

    const current = statusByNodeId[issue.nodeId];

    if (issue.severity === "error") {
      statusByNodeId[issue.nodeId] = "error";
      continue;
    }

    if (current !== "error") {
      statusByNodeId[issue.nodeId] = "warning";
    }
  }

  return statusByNodeId;
}

export function resolveNodeValidationStatus(
  nodeId: string,
  statusByNodeId: Record<string, WorkflowNodeValidationStatus>,
): WorkflowNodeValidationStatus {
  return statusByNodeId[nodeId] ?? "ok";
}
