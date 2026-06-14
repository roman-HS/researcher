import type { Edge, Node } from "@xyflow/react";

import type {
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowToolNode,
} from "@/contracts/workflows/internal";

/**
 * React Flow shapes for the workflow builder canvas.
 *
 * @see Story 5.2.1 — Add React Flow to the builder route
 */

export type WorkflowFlowNodeData = {
  label: string;
  workflowNode: WorkflowToolNode;
};

export type WorkflowFlowNode = Node<WorkflowFlowNodeData, "default">;
export type WorkflowFlowEdge = Edge;

function toFlowEdgeId(edge: WorkflowEdge): string {
  return edge.id ?? `${edge.source}->${edge.target}`;
}

export function workflowDefinitionToFlow(definition: WorkflowDefinition): {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
} {
  const nodes: WorkflowFlowNode[] = definition.nodes.map((node) => ({
    id: node.id,
    type: "default",
    position: node.position,
    data: {
      label: node.title,
      workflowNode: node,
    },
  }));

  const edges: WorkflowFlowEdge[] = definition.edges.map((edge) => ({
    id: toFlowEdgeId(edge),
    source: edge.source,
    target: edge.target,
  }));

  return { nodes, edges };
}
