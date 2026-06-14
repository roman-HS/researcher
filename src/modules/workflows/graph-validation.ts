import { getToolCategoryDefinition } from "@/contracts/tools/categories";
import type { ToolCategory } from "@/contracts/tools";
import {
  findWorkflowGraphIssues,
  resolveWorkflowExecutionOrder,
  WorkflowGraphValidationError,
  type WorkflowGraphIssue,
  type WorkflowGraphValidationProfile,
} from "@/contracts/workflows/graph-validation";
import type { WorkflowDefinition } from "@/contracts/workflows";
import { getToolDefinition, hasToolKey } from "@/modules/tools/registry";

/**
 * Tool-aware workflow graph validation rules.
 *
 * @see Story 4.2.4 — Define graph validation rules
 */

export type WorkflowToolGraphIssueCode =
  | WorkflowGraphIssue["code"]
  | "invalid_root_tool"
  | "invalid_terminal_tool"
  | "invalid_category_order";

export type WorkflowToolGraphIssue = {
  code: WorkflowToolGraphIssueCode;
  message: string;
  nodeId?: string;
  edgeSource?: string;
  edgeTarget?: string;
};

function isRootAcquisitionCategory(category: ToolCategory): boolean {
  return category === "search";
}

function isValidTerminalCategory(category: ToolCategory): boolean {
  return category === "analyze" || category === "summarize";
}

function findToolAwareGraphIssues(
  definition: WorkflowDefinition,
): WorkflowToolGraphIssue[] {
  const issues: WorkflowToolGraphIssue[] = [];

  let executionOrder: string[] = [];

  try {
    executionOrder = resolveWorkflowExecutionOrder(definition);
  } catch {
    return issues;
  }

  const nodesById = new Map(
    definition.nodes.map((node) => [node.id, node] as const),
  );

  const rootNodeId = executionOrder[0];
  const terminalNodeId = executionOrder.at(-1);

  if (!rootNodeId || !terminalNodeId) {
    return issues;
  }

  const rootNode = nodesById.get(rootNodeId);
  const terminalNode = nodesById.get(terminalNodeId);

  if (rootNode && hasToolKey(rootNode.toolKey)) {
    const rootTool = getToolDefinition(rootNode.toolKey);

    if (
      !isRootAcquisitionCategory(rootTool.category) ||
      rootTool.accepts.length > 0
    ) {
      issues.push({
        code: "invalid_root_tool",
        message: `Root node "${rootNode.id}" must use a search acquisition tool with no upstream artefact requirements.`,
        nodeId: rootNode.id,
      });
    }
  }

  if (terminalNode && hasToolKey(terminalNode.toolKey)) {
    const terminalTool = getToolDefinition(terminalNode.toolKey);

    if (!isValidTerminalCategory(terminalTool.category)) {
      issues.push({
        code: "invalid_terminal_tool",
        message: `Terminal node "${terminalNode.id}" must use an analyze or summarize tool.`,
        nodeId: terminalNode.id,
      });
    }
  }

  let previousSortOrder: number | null = null;

  for (const nodeId of executionOrder) {
    const node = nodesById.get(nodeId);

    if (!node || !hasToolKey(node.toolKey)) {
      continue;
    }

    const tool = getToolDefinition(node.toolKey);
    const sortOrder = getToolCategoryDefinition(tool.category).sortOrder;

    if (previousSortOrder !== null && sortOrder < previousSortOrder) {
      issues.push({
        code: "invalid_category_order",
        message: `Node "${node.id}" uses tool category "${tool.category}", which cannot appear before an earlier step in the workflow path.`,
        nodeId: node.id,
      });
    }

    previousSortOrder = sortOrder;
  }

  return issues;
}

export function findWorkflowGraphValidationIssues(
  definition: WorkflowDefinition,
  profile: WorkflowGraphValidationProfile,
): WorkflowToolGraphIssue[] {
  const issues: WorkflowToolGraphIssue[] = [
    ...findWorkflowGraphIssues(definition, profile),
  ];

  if (profile === "publish") {
    issues.push(...findToolAwareGraphIssues(definition));
  }

  return issues;
}

export function validateWorkflowGraph(
  definition: WorkflowDefinition,
  profile: WorkflowGraphValidationProfile,
): void {
  const issues = findWorkflowGraphValidationIssues(definition, profile);

  if (issues.length > 0) {
    throw new WorkflowGraphValidationError(issues);
  }
}
