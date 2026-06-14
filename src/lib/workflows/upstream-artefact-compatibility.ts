import type { ToolArtefactType } from "@/contracts/tools/internal";
import type { WorkflowDefinition } from "@/contracts/workflows/internal";
import { resolveWorkflowExecutionOrder } from "@/contracts/workflows/graph-validation";
import { formatArtefactList } from "@/lib/workflows/tool-display";
import {
  propertyDetailConfigSchema,
  propertyDetailTool,
} from "@/modules/tools/definitions/property-detail";
import { getToolDefinition, hasToolKey } from "@/modules/tools/registry";

/**
 * Client-safe upstream artefact compatibility checks for the workflow builder.
 *
 * @see Story 5.3.5 — Build Property Detail inspector form
 */

export function nodeHasCompatibleUpstreamArtefact(
  definition: WorkflowDefinition,
  nodeId: string,
): boolean {
  const node = definition.nodes.find((item) => item.id === nodeId);

  if (!node || !hasToolKey(node.toolKey)) {
    return true;
  }

  const tool = getToolDefinition(node.toolKey);

  if (tool.accepts.length === 0) {
    return true;
  }

  let executionOrder: string[];

  try {
    executionOrder = resolveWorkflowExecutionOrder(definition);
  } catch {
    return true;
  }

  const nodesById = new Map(
    definition.nodes.map((item) => [item.id, item] as const),
  );
  const producedArtefacts = new Set<ToolArtefactType>();

  for (const currentNodeId of executionOrder) {
    const currentNode = nodesById.get(currentNodeId);

    if (!currentNode || !hasToolKey(currentNode.toolKey)) {
      continue;
    }

    const currentTool = getToolDefinition(currentNode.toolKey);

    if (currentNodeId === nodeId) {
      return currentTool.accepts.some((artefact) =>
        producedArtefacts.has(artefact),
      );
    }

    for (const artefact of currentTool.produces) {
      producedArtefacts.add(artefact);
    }
  }

  return true;
}

export function getMissingUpstreamArtefactMessage(
  definition: WorkflowDefinition,
  nodeId: string,
): string | null {
  const node = definition.nodes.find((item) => item.id === nodeId);

  if (!node || !hasToolKey(node.toolKey)) {
    return null;
  }

  const tool = getToolDefinition(node.toolKey);

  if (tool.accepts.length === 0) {
    return null;
  }

  if (nodeHasCompatibleUpstreamArtefact(definition, nodeId)) {
    return null;
  }

  return `This step requires ${formatArtefactList(tool.accepts).toLowerCase()} from an upstream step, but none were found on this path.`;
}

export function getMissingRentEstimatesUpstreamMessage(
  definition: WorkflowDefinition,
  nodeId: string,
): string | null {
  const node = definition.nodes.find((item) => item.id === nodeId);

  if (!node || !hasToolKey(node.toolKey)) {
    return null;
  }

  const tool = getToolDefinition(node.toolKey);

  if (!tool.accepts.includes("rentEstimates")) {
    return null;
  }

  let executionOrder: string[];

  try {
    executionOrder = resolveWorkflowExecutionOrder(definition);
  } catch {
    return null;
  }

  const nodesById = new Map(
    definition.nodes.map((item) => [item.id, item] as const),
  );
  const producedArtefacts = new Set<ToolArtefactType>();

  for (const currentNodeId of executionOrder) {
    if (currentNodeId === nodeId) {
      break;
    }

    const currentNode = nodesById.get(currentNodeId);

    if (!currentNode || !hasToolKey(currentNode.toolKey)) {
      continue;
    }

    const currentTool = getToolDefinition(currentNode.toolKey);

    for (const artefact of currentTool.produces) {
      producedArtefacts.add(artefact);
    }
  }

  if (
    producedArtefacts.has("propertyDetails") &&
    !producedArtefacts.has("rentEstimates")
  ) {
    return "Property details are available upstream, but no rent estimates were found. Rent-dependent metrics such as cash flow and cap rate may be missing.";
  }

  return null;
}

export function getUpstreamMaxPropertiesLimit(
  definition: WorkflowDefinition,
  nodeId: string,
): number | null {
  let executionOrder: string[];

  try {
    executionOrder = resolveWorkflowExecutionOrder(definition);
  } catch {
    return null;
  }

  const nodesById = new Map(
    definition.nodes.map((item) => [item.id, item] as const),
  );
  let limit: number | null = null;

  for (const currentNodeId of executionOrder) {
    if (currentNodeId === nodeId) {
      break;
    }

    const currentNode = nodesById.get(currentNodeId);

    if (!currentNode || currentNode.toolKey !== propertyDetailTool.key) {
      continue;
    }

    const parsedConfig = propertyDetailConfigSchema.safeParse(currentNode.config);
    const maxProperties = parsedConfig.success
      ? parsedConfig.data.maxProperties
      : 50;

    limit = limit === null ? maxProperties : Math.min(limit, maxProperties);
  }

  return limit;
}

export function getInsufficientUpstreamPropertyCountMessage(
  definition: WorkflowDefinition,
  nodeId: string,
  minimumSampleSize: number,
): string | null {
  const upstreamLimit = getUpstreamMaxPropertiesLimit(definition, nodeId);

  if (upstreamLimit === null || minimumSampleSize <= upstreamLimit) {
    return null;
  }

  return `Minimum sample size (${minimumSampleSize}) exceeds the upstream Property Detail limit of ${upstreamLimit} properties. Area summaries may never meet the sample threshold.`;
}
