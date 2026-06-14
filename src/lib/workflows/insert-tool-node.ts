import type { ToolDiscoveryItem } from "@/contracts/tools/responses";
import type {
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowToolNode,
} from "@/contracts/workflows/internal";
import type { WorkflowStepConfig } from "@/contracts/workflows/bindings";

import { findChainAppendSourceNodeId } from "@/lib/workflows/graph-degrees";
import { isValidWorkflowConnection } from "@/lib/workflows/graph-connection";

/**
 * Insert a tool from the palette into a workflow definition.
 *
 * @see Story 5.3.2 — Implement step insertion behavior
 */

export const INSERT_NODE_ORIGIN = { x: 60, y: 80 } as const;
/** Space between node origins; sized for w-52 (~208px) cards plus margin. */
export const INSERT_NODE_HORIZONTAL_GAP = 240;

function toolKeyToNodeIdBase(toolKey: string): string {
  const withoutVersion = toolKey.split("@")[0] ?? toolKey;
  const lastSegment = withoutVersion.split(".").pop() ?? withoutVersion;

  return lastSegment
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateWorkflowNodeId(
  toolKey: string,
  existingIds: ReadonlySet<string>,
): string {
  const base = toolKeyToNodeIdBase(toolKey);

  if (!existingIds.has(base)) {
    return base;
  }

  let counter = 2;

  while (existingIds.has(`${base}-${counter}`)) {
    counter += 1;
  }

  return `${base}-${counter}`;
}

export function computeNextNodePosition(
  definition: WorkflowDefinition,
): { x: number; y: number } {
  if (definition.nodes.length === 0) {
    return { ...INSERT_NODE_ORIGIN };
  }

  const rightmostNode = definition.nodes.reduce((rightmost, node) =>
    node.position.x > rightmost.position.x ? node : rightmost,
  );

  return {
    x: rightmostNode.position.x + INSERT_NODE_HORIZONTAL_GAP,
    y: rightmostNode.position.y,
  };
}

export function insertToolNodeIntoDefinition(
  definition: WorkflowDefinition,
  tool: Pick<ToolDiscoveryItem, "key" | "name" | "defaultConfig">,
): { definition: WorkflowDefinition; nodeId: string } {
  const existingIds = new Set(definition.nodes.map((node) => node.id));
  const nodeId = generateWorkflowNodeId(tool.key, existingIds);
  const position = computeNextNodePosition(definition);

  const newNode: WorkflowToolNode = {
    id: nodeId,
    kind: "tool",
    toolKey: tool.key,
    title: tool.name,
    config: tool.defaultConfig as WorkflowStepConfig,
    position,
  };

  const appendSourceNodeId = findChainAppendSourceNodeId(definition);
  const provisionalDefinition: WorkflowDefinition = {
    ...definition,
    nodes: [...definition.nodes, newNode],
  };
  const nextEdges: WorkflowEdge[] = [...definition.edges];

  if (
    appendSourceNodeId &&
    isValidWorkflowConnection(
      { source: appendSourceNodeId, target: nodeId },
      provisionalDefinition,
    )
  ) {
    nextEdges.push({
      source: appendSourceNodeId,
      target: nodeId,
    });
  }

  return {
    definition: {
      ...provisionalDefinition,
      edges: nextEdges,
    },
    nodeId,
  };
}
