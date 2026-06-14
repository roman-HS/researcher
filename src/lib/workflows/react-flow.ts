import type { Edge, Node } from "@xyflow/react";

import type {
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowToolNode,
} from "@/contracts/workflows/internal";

import type { WorkflowBuilderToolMetadata } from "./builder-tool-metadata";
import {
  resolveNodeValidationStatus,
  type WorkflowNodeValidationStatus,
} from "./node-validation-status";

/**
 * React Flow shapes for the workflow builder canvas.
 *
 * @see Story 5.2.1 — Add React Flow to the builder route
 * @see Story 5.2.2 — Implement custom workflow node component
 */

export type WorkflowNodeHandleRole =
  | "root"
  | "terminal"
  | "middle"
  | "disconnected";

export type WorkflowFlowNodeData = {
  workflowNode: WorkflowToolNode;
  toolMetadata: WorkflowBuilderToolMetadata | null;
  handleRole: WorkflowNodeHandleRole;
  validationStatus: WorkflowNodeValidationStatus;
};

export type WorkflowFlowNode = Node<WorkflowFlowNodeData, "workflowTool">;
export type WorkflowFlowEdge = Edge;

export type WorkflowDefinitionToFlowOptions = {
  toolMetadataByKey: Record<string, WorkflowBuilderToolMetadata>;
  nodeValidationStatusByNodeId?: Record<string, WorkflowNodeValidationStatus>;
};

function toFlowEdgeId(edge: WorkflowEdge): string {
  return edge.id ?? `${edge.source}->${edge.target}`;
}

function buildNodeHandleRoles(
  definition: WorkflowDefinition,
): Map<string, WorkflowNodeHandleRole> {
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();

  for (const node of definition.nodes) {
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  }

  for (const edge of definition.edges) {
    outDegree.set(edge.source, (outDegree.get(edge.source) ?? 0) + 1);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const roles = new Map<string, WorkflowNodeHandleRole>();

  for (const node of definition.nodes) {
    const incoming = inDegree.get(node.id) ?? 0;
    const outgoing = outDegree.get(node.id) ?? 0;

    if (incoming === 0 && outgoing === 0) {
      roles.set(node.id, "disconnected");
    } else if (incoming === 0) {
      roles.set(node.id, "root");
    } else if (outgoing === 0) {
      roles.set(node.id, "terminal");
    } else {
      roles.set(node.id, "middle");
    }
  }

  return roles;
}

export function workflowDefinitionToFlow(
  definition: WorkflowDefinition,
  options: WorkflowDefinitionToFlowOptions,
): {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
} {
  const handleRoles = buildNodeHandleRoles(definition);
  const nodeValidationStatusByNodeId =
    options.nodeValidationStatusByNodeId ?? {};

  const nodes: WorkflowFlowNode[] = definition.nodes.map((node) => ({
    id: node.id,
    type: "workflowTool",
    position: node.position,
    data: {
      workflowNode: node,
      toolMetadata: options.toolMetadataByKey[node.toolKey] ?? null,
      handleRole: handleRoles.get(node.id) ?? "disconnected",
      validationStatus: resolveNodeValidationStatus(
        node.id,
        nodeValidationStatusByNodeId,
      ),
    },
  }));

  const edges: WorkflowFlowEdge[] = definition.edges.map((edge) => ({
    id: toFlowEdgeId(edge),
    source: edge.source,
    target: edge.target,
  }));

  return { nodes, edges };
}
