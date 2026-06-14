import { z } from "zod";

import { domainEntityIdSchema, isoDateTimeSchema } from "@/contracts/domain/primitives";
import {
  toolExecutorRunContextSchema,
  toolExecutorRuntimeInputValuesSchema,
  type ToolExecutorRunContext,
  type ToolExecutorRuntimeInputValues,
} from "@/contracts/runs/executors";
import {
  createDefaultExecutionLimits,
  executionLimitsSchema,
  type ExecutionLimits,
} from "@/contracts/runs/execution-limits";
import { workflowRunStatusSchema, type WorkflowRunStatus } from "@/contracts/runs/lifecycle";
import {
  createEmptyExecutionWorkingSet,
  executionWorkingSetPatchSchema,
  executionWorkingSetSchema,
  mergeExecutionWorkingSet,
  type ExecutionWorkingSet,
  type ExecutionWorkingSetPatch,
} from "@/contracts/runs/working-set";
import {
  workflowCompiledPlanSchema,
  type WorkflowCompiledPlan,
  type WorkflowCompiledPlanStep,
} from "@/contracts/workflows/compiled-plan";

/**
 * Serializable runtime object passed through workflow execution.
 *
 * @see Story 7.2.5 — Implement execution context service
 */

export const workflowExecutionRunFrameSchema = z
  .object({
    runId: domainEntityIdSchema,
    workspaceId: domainEntityIdSchema,
    workflowId: domainEntityIdSchema,
    workflowVersionId: domainEntityIdSchema,
    userId: domainEntityIdSchema,
    createdAt: isoDateTimeSchema.optional(),
    startedAt: isoDateTimeSchema.optional(),
  })
  .strict();

export type WorkflowExecutionRunFrame = z.infer<
  typeof workflowExecutionRunFrameSchema
>;

export const workflowExecutionUsageSchema = z
  .object({
    providerCallsRun: z.number().int().nonnegative(),
    providerCallsStep: z.number().int().nonnegative(),
  })
  .strict();

export type WorkflowExecutionUsage = z.infer<typeof workflowExecutionUsageSchema>;

export const workflowExecutionStateSchema = z
  .object({
    status: workflowRunStatusSchema,
    currentStepIndex: z.number().int().nonnegative(),
    workingSet: executionWorkingSetSchema,
    usage: workflowExecutionUsageSchema,
  })
  .strict();

export type WorkflowExecutionState = z.infer<typeof workflowExecutionStateSchema>;

export const workflowExecutionContextSchema = z
  .object({
    run: workflowExecutionRunFrameSchema,
    compiledPlan: workflowCompiledPlanSchema,
    runtimeInputValues: toolExecutorRuntimeInputValuesSchema,
    limits: executionLimitsSchema,
    state: workflowExecutionStateSchema,
  })
  .strict();

export type WorkflowExecutionContext = z.infer<
  typeof workflowExecutionContextSchema
>;

export type CreateWorkflowExecutionContextInput = {
  run: {
    runId: string;
    workspaceId: string;
    workflowId: string;
    workflowVersionId: string;
    userId: string;
    createdAt?: string | Date;
    startedAt?: string | Date;
  };
  compiledPlan: WorkflowCompiledPlan;
  runtimeInputValues: ToolExecutorRuntimeInputValues;
  limits?: ExecutionLimits;
  status?: WorkflowRunStatus;
  currentStepIndex?: number;
  workingSet?: ExecutionWorkingSet;
  usage?: WorkflowExecutionUsage;
};

function toIsoDateTime(value: string | Date | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return isoDateTimeSchema.parse(value);
  }

  return value.toISOString();
}

function createEmptyUsage(): WorkflowExecutionUsage {
  return {
    providerCallsRun: 0,
    providerCallsStep: 0,
  };
}

export function createWorkflowExecutionContext(
  input: CreateWorkflowExecutionContextInput,
): WorkflowExecutionContext {
  return workflowExecutionContextSchema.parse({
    run: {
      runId: input.run.runId,
      workspaceId: input.run.workspaceId,
      workflowId: input.run.workflowId,
      workflowVersionId: input.run.workflowVersionId,
      userId: input.run.userId,
      ...(input.run.createdAt !== undefined
        ? { createdAt: toIsoDateTime(input.run.createdAt) }
        : {}),
      ...(input.run.startedAt !== undefined
        ? { startedAt: toIsoDateTime(input.run.startedAt) }
        : {}),
    },
    compiledPlan: input.compiledPlan,
    runtimeInputValues: input.runtimeInputValues,
    limits: input.limits ?? createDefaultExecutionLimits(),
    state: {
      status: input.status ?? "pending",
      currentStepIndex: input.currentStepIndex ?? 0,
      workingSet: input.workingSet ?? createEmptyExecutionWorkingSet(),
      usage: input.usage ?? createEmptyUsage(),
    },
  });
}

export function parseWorkflowExecutionContext(
  value: unknown,
): WorkflowExecutionContext {
  return workflowExecutionContextSchema.parse(value);
}

export function serializeWorkflowExecutionContext(
  context: WorkflowExecutionContext,
): string {
  return JSON.stringify(workflowExecutionContextSchema.parse(context));
}

export function deserializeWorkflowExecutionContext(
  serialized: string,
): WorkflowExecutionContext {
  return parseWorkflowExecutionContext(JSON.parse(serialized));
}

export function getCurrentExecutionStep(
  context: WorkflowExecutionContext,
): WorkflowCompiledPlanStep | undefined {
  return context.compiledPlan.steps[context.state.currentStepIndex];
}

export function buildToolExecutorRunContext(
  context: WorkflowExecutionContext,
  step: WorkflowCompiledPlanStep,
): ToolExecutorRunContext {
  return toolExecutorRunContextSchema.parse({
    runId: context.run.runId,
    nodeId: step.nodeId,
    toolKey: step.toolKey,
    workflowId: context.run.workflowId,
    workflowVersionId: context.run.workflowVersionId,
    workspaceId: context.run.workspaceId,
    userId: context.run.userId,
    runtimeInputValues: context.runtimeInputValues,
  });
}

export function withExecutionRunStatus(
  context: WorkflowExecutionContext,
  status: WorkflowRunStatus,
): WorkflowExecutionContext {
  return workflowExecutionContextSchema.parse({
    ...context,
    state: {
      ...context.state,
      status,
    },
  });
}

export function withCurrentStepIndex(
  context: WorkflowExecutionContext,
  currentStepIndex: number,
): WorkflowExecutionContext {
  return workflowExecutionContextSchema.parse({
    ...context,
    state: {
      ...context.state,
      currentStepIndex,
    },
  });
}

export function applyWorkingSetPatch(
  context: WorkflowExecutionContext,
  patch: ExecutionWorkingSetPatch,
): WorkflowExecutionContext {
  executionWorkingSetPatchSchema.parse(patch);

  return workflowExecutionContextSchema.parse({
    ...context,
    state: {
      ...context.state,
      workingSet: mergeExecutionWorkingSet(context.state.workingSet, patch),
    },
  });
}

export function resetStepUsageCounters(
  context: WorkflowExecutionContext,
): WorkflowExecutionContext {
  return workflowExecutionContextSchema.parse({
    ...context,
    state: {
      ...context.state,
      usage: {
        ...context.state.usage,
        providerCallsStep: 0,
      },
    },
  });
}

export function recordProviderCalls(
  context: WorkflowExecutionContext,
  count = 1,
): WorkflowExecutionContext {
  if (count < 0) {
    throw new Error("Provider call count must be non-negative.");
  }

  return workflowExecutionContextSchema.parse({
    ...context,
    state: {
      ...context.state,
      usage: {
        providerCallsRun: context.state.usage.providerCallsRun + count,
        providerCallsStep: context.state.usage.providerCallsStep + count,
      },
    },
  });
}
