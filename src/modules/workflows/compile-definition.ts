import "server-only";

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

import { invalidWorkflowDefinitionError } from "./errors";

/**
 * @see Story 4.3.5 — Implement publish workflow service
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

    return {
      nodeId: node.id,
      toolKey: node.toolKey,
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
