import type { Connection } from "@xyflow/react";

import type { WorkflowDefinition } from "@/contracts/workflows/internal";

/**
 * @see Story 5.2.3 — Implement canvas state synchronization
 */

type ConnectionLike = Pick<Connection, "source" | "target">;

function buildGraphDegrees(definition: WorkflowDefinition): {
  inDegree: Map<string, number>;
  outDegree: Map<string, number>;
} {
  const inDegree = new Map(
    definition.nodes.map((node) => [node.id, 0]),
  );
  const outDegree = new Map(
    definition.nodes.map((node) => [node.id, 0]),
  );

  for (const edge of definition.edges) {
    outDegree.set(edge.source, (outDegree.get(edge.source) ?? 0) + 1);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  return { inDegree, outDegree };
}

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

  const { inDegree, outDegree } = buildGraphDegrees(definition);

  if ((outDegree.get(source) ?? 0) >= 1) {
    return false;
  }

  if ((inDegree.get(target) ?? 0) >= 1) {
    return false;
  }

  return true;
}
