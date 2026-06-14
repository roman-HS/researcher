import type { Connection } from "@xyflow/react";

import type { WorkflowDefinition } from "@/contracts/workflows/internal";

import { buildWorkflowGraphDegrees } from "@/lib/workflows/graph-degrees";

/**
 * @see Story 5.2.3 — Implement canvas state synchronization
 */

type ConnectionLike = Pick<Connection, "source" | "target">;

export function isValidWorkflowConnection(
  connection: ConnectionLike,
  definition: WorkflowDefinition,
): boolean {
  const { source, target } = connection;

  if (!source || !target) {
    return false;
  }

  if (source === target) {
    return false;
  }

  const nodeIds = new Set(definition.nodes.map((node) => node.id));

  if (!nodeIds.has(source) || !nodeIds.has(target)) {
    return false;
  }

  if (
    definition.edges.some(
      (edge) => edge.source === source && edge.target === target,
    )
  ) {
    return false;
  }

  const { inDegree, outDegree } = buildWorkflowGraphDegrees(definition);

  if ((outDegree.get(source) ?? 0) >= 1) {
    return false;
  }

  if ((inDegree.get(target) ?? 0) >= 1) {
    return false;
  }

  return true;
}
