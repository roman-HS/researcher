import { z } from "zod";

import { toolKeySchema } from "@/contracts/tools/internal";

import { workflowStepConfigSchema } from "./bindings";
import { workflowNodeIdSchema, workflowTriggerSchema } from "./internal";
import { workflowRuntimeInputsSchema } from "./runtime-inputs";

/**
 * Persisted execution plan produced at publish time.
 *
 * @see Story 4.3.5 — Implement publish workflow service
 * @see Story 7.2.1 — Implement published workflow compiler
 */

export const LEGACY_WORKFLOW_COMPILED_PLAN_VERSION = 1 as const;

export const WORKFLOW_COMPILED_PLAN_VERSION = 2 as const;

const compiledPlanBaseFields = {
  trigger: workflowTriggerSchema,
  runtimeInputs: workflowRuntimeInputsSchema,
  executionOrder: z.array(workflowNodeIdSchema),
} as const;

export const legacyWorkflowCompiledPlanStepSchema = z
  .object({
    nodeId: workflowNodeIdSchema,
    toolKey: toolKeySchema,
    config: workflowStepConfigSchema,
  })
  .strict();

export type LegacyWorkflowCompiledPlanStep = z.infer<
  typeof legacyWorkflowCompiledPlanStepSchema
>;

export const legacyWorkflowCompiledPlanSchema = z
  .object({
    planVersion: z.literal(LEGACY_WORKFLOW_COMPILED_PLAN_VERSION),
    ...compiledPlanBaseFields,
    steps: z.array(legacyWorkflowCompiledPlanStepSchema),
  })
  .strict();

export type LegacyWorkflowCompiledPlan = z.infer<
  typeof legacyWorkflowCompiledPlanSchema
>;

export const workflowCompiledPlanStepSchema = z
  .object({
    nodeId: workflowNodeIdSchema,
    title: z.string().min(1),
    toolKey: toolKeySchema,
    executorKey: toolKeySchema,
    config: workflowStepConfigSchema,
  })
  .strict();

export type WorkflowCompiledPlanStep = z.infer<
  typeof workflowCompiledPlanStepSchema
>;

export const workflowCompiledPlanSchema = z
  .object({
    planVersion: z.literal(WORKFLOW_COMPILED_PLAN_VERSION),
    ...compiledPlanBaseFields,
    steps: z.array(workflowCompiledPlanStepSchema),
  })
  .strict();

export type WorkflowCompiledPlan = z.infer<typeof workflowCompiledPlanSchema>;

export function parseWorkflowCompiledPlan(value: unknown): WorkflowCompiledPlan {
  return workflowCompiledPlanSchema.parse(value);
}

export function parseLegacyWorkflowCompiledPlan(
  value: unknown,
): LegacyWorkflowCompiledPlan {
  return legacyWorkflowCompiledPlanSchema.parse(value);
}

export function isLegacyWorkflowCompiledPlan(
  value: unknown,
): value is LegacyWorkflowCompiledPlan {
  return legacyWorkflowCompiledPlanSchema.safeParse(value).success;
}

export type WorkflowCompiledPlanIntegrityIssue = {
  code:
    | "invalid_execution_order"
    | "step_order_mismatch"
    | "missing_executor";
  message: string;
  nodeId?: string;
};

export function findWorkflowCompiledPlanIntegrityIssues(
  plan: WorkflowCompiledPlan,
  options: {
    hasExecutor: (executorKey: string) => boolean;
  },
): WorkflowCompiledPlanIntegrityIssue[] {
  const issues: WorkflowCompiledPlanIntegrityIssue[] = [];

  if (plan.executionOrder.length !== plan.steps.length) {
    issues.push({
      code: "invalid_execution_order",
      message:
        "Compiled plan execution order length does not match the number of steps.",
    });
  }

  for (let index = 0; index < plan.steps.length; index += 1) {
    const step = plan.steps[index];
    const orderedNodeId = plan.executionOrder[index];

    if (!step) {
      continue;
    }

    if (orderedNodeId !== step.nodeId) {
      issues.push({
        code: "step_order_mismatch",
        message: `Compiled plan step "${step.nodeId}" does not match execution order at index ${index}.`,
        nodeId: step.nodeId,
      });
    }

    if (!options.hasExecutor(step.executorKey)) {
      issues.push({
        code: "missing_executor",
        message: `Compiled plan step "${step.nodeId}" references missing executor "${step.executorKey}".`,
        nodeId: step.nodeId,
      });
    }
  }

  return issues;
}

export function areWorkflowCompiledPlansEquivalent(
  left: WorkflowCompiledPlan,
  right: WorkflowCompiledPlan,
): boolean {
  if (left.planVersion !== right.planVersion) {
    return false;
  }

  if (left.executionOrder.join("\0") !== right.executionOrder.join("\0")) {
    return false;
  }

  if (JSON.stringify(left.trigger) !== JSON.stringify(right.trigger)) {
    return false;
  }

  if (JSON.stringify(left.runtimeInputs) !== JSON.stringify(right.runtimeInputs)) {
    return false;
  }

  if (left.steps.length !== right.steps.length) {
    return false;
  }

  for (let index = 0; index < left.steps.length; index += 1) {
    const leftStep = left.steps[index];
    const rightStep = right.steps[index];

    if (!leftStep || !rightStep) {
      return false;
    }

    if (
      leftStep.nodeId !== rightStep.nodeId ||
      leftStep.title !== rightStep.title ||
      leftStep.toolKey !== rightStep.toolKey ||
      leftStep.executorKey !== rightStep.executorKey
    ) {
      return false;
    }

    if (JSON.stringify(leftStep.config) !== JSON.stringify(rightStep.config)) {
      return false;
    }
  }

  return true;
}
