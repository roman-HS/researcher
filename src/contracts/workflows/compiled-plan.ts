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

export const WORKFLOW_COMPILED_PLAN_VERSION = 1 as const;

export const workflowCompiledPlanStepSchema = z
  .object({
    nodeId: workflowNodeIdSchema,
    toolKey: toolKeySchema,
    config: workflowStepConfigSchema,
  })
  .strict();

export type WorkflowCompiledPlanStep = z.infer<
  typeof workflowCompiledPlanStepSchema
>;

export const workflowCompiledPlanSchema = z
  .object({
    planVersion: z.literal(WORKFLOW_COMPILED_PLAN_VERSION),
    trigger: workflowTriggerSchema,
    runtimeInputs: workflowRuntimeInputsSchema,
    executionOrder: z.array(workflowNodeIdSchema),
    steps: z.array(workflowCompiledPlanStepSchema),
  })
  .strict();

export type WorkflowCompiledPlan = z.infer<typeof workflowCompiledPlanSchema>;

export function parseWorkflowCompiledPlan(value: unknown): WorkflowCompiledPlan {
  return workflowCompiledPlanSchema.parse(value);
}
