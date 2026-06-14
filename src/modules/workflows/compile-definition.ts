import "server-only";

import { resolveExecutorKey } from "@/contracts/tools";
import {
  WORKFLOW_COMPILED_PLAN_VERSION,
  workflowCompiledPlanSchema,
  type WorkflowCompiledPlan,
} from "@/contracts/workflows/compiled-plan";
import {
  resolveWorkflowExecutionOrder,
  WorkflowGraphExecutionOrderError,
} from "@/contracts/workflows/graph-validation";
import type { WorkflowDefinition } from "@/contracts/workflows/internal";
import { hasExecutor } from "@/modules/tools/executors/registry";
import { getToolDefinition, hasToolKey } from "@/modules/tools/registry";

import { invalidWorkflowDefinitionError } from "./errors";
import { assertWorkflowDefinitionValid } from "./validate-definition";

/**
 * @see Story 4.3.5 — Implement publish workflow service
 * @see Story 7.2.1 — Implement published workflow compiler
 */

export function compileWorkflowDefinition(
  definition: WorkflowDefinition,
): WorkflowCompiledPlan {
  let executionOrder: string[];

  try {
    executionOrder = resolveWorkflowExecutionOrder(definition);
  } catch (error) {
    if (error instanceof WorkflowGraphExecutionOrderError) {
      throw invalidWorkflowDefinitionError(
        [
          {
            severity: "error",
            code: "invalid_execution_order",
            message: error.message,
          },
        ],
        [],
      );
    }

    throw error;
  }

  const nodesById = new Map(
    definition.nodes.map((node) => [node.id, node] as const),
  );

  const steps = executionOrder.map((nodeId) => {
    const node = nodesById.get(nodeId);

    if (!node) {
      throw invalidWorkflowDefinitionError(
        [
          {
            severity: "error",
            code: "invalid_execution_order",
            message: `Cannot compile workflow because node "${nodeId}" is missing from the definition.`,
            nodeId,
          },
        ],
        [],
      );
    }

    if (!hasToolKey(node.toolKey)) {
      throw invalidWorkflowDefinitionError(
        [
          {
            severity: "error",
            code: "unknown_tool_key",
            message: `Cannot compile workflow because node "${node.id}" references unknown tool key "${node.toolKey}".`,
            nodeId: node.id,
            path: `nodes.${node.id}.toolKey`,
          },
        ],
        [],
      );
    }

    const tool = getToolDefinition(node.toolKey);
    const executorKey = resolveExecutorKey(tool);

    if (!hasExecutor(executorKey)) {
      throw invalidWorkflowDefinitionError(
        [
          {
            severity: "error",
            code: "missing_executor",
            message: `Cannot compile workflow because node "${node.id}" has no registered executor for "${executorKey}".`,
            nodeId: node.id,
            path: `nodes.${node.id}.toolKey`,
          },
        ],
        [],
      );
    }

    return {
      nodeId: node.id,
      title: node.title,
      toolKey: node.toolKey,
      executorKey,
      config: node.config,
    };
  });

  return workflowCompiledPlanSchema.parse({
    planVersion: WORKFLOW_COMPILED_PLAN_VERSION,
    trigger: definition.trigger,
    runtimeInputs: definition.runtimeInputs,
    executionOrder,
    steps,
  });
}

export function compileValidatedWorkflowDefinition(
  input: unknown,
): WorkflowCompiledPlan {
  const definition = assertWorkflowDefinitionValid(input, "publish");
  return compileWorkflowDefinition(definition);
}
