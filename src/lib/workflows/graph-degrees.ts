import type {
  WorkflowDefinition,
  WorkflowToolNode,
} from "@/contracts/workflows/internal";

/**
 * Shared in/out degree indexes for V1 linear workflow graphs.
 */

export type WorkflowGraphDegrees = {
  inDegree: Map<string, number>;
  outDegree: Map<string, number>;
};

export function buildWorkflowGraphDegrees(
  definition: Pick<WorkflowDefinition, "nodes" | "edges">,
): WorkflowGraphDegrees {
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

function pickRightmostNode(
  nodes: readonly WorkflowToolNode[],
): WorkflowToolNode | null {
  if (nodes.length === 0) {
    return null;
  }

  return nodes.reduce((rightmost, node) =>
    node.position.x > rightmost.position.x ? node : rightmost,
  );
}

/**
 * Returns the node that should receive a new outgoing edge when appending a step
 * to the workflow chain. Returns null when auto-wiring would be ambiguous.
 */
export function findChainAppendSourceNodeId(
  definition: Pick<WorkflowDefinition, "nodes" | "edges">,
): string | null {
  if (definition.nodes.length === 0) {
    return null;
  }

  const { inDegree, outDegree } = buildWorkflowGraphDegrees(definition);

  const appendCandidates = definition.nodes.filter(
    (node) => (outDegree.get(node.id) ?? 0) === 0,
  );

  if (appendCandidates.length === 0) {
    return null;
  }

  if (appendCandidates.length === 1) {
    return appendCandidates[0]?.id ?? null;
  }

  const connectedAppendCandidates = appendCandidates.filter(
    (node) => (inDegree.get(node.id) ?? 0) > 0,
  );

  if (connectedAppendCandidates.length === 1) {
    return connectedAppendCandidates[0]?.id ?? null;
  }

  if (definition.edges.length === 0) {
    return pickRightmostNode(appendCandidates)?.id ?? null;
  }

  return null;
}
