import { z } from "zod";

import { domainEntityIdSchema } from "@/contracts/domain/primitives";
import {
  executionWorkingSetPatchSchema,
  executionWorkingSetSchema,
} from "@/contracts/runs/working-set";
import { toolKeySchema } from "@/contracts/tools/internal";
import { workflowNodeIdSchema } from "@/contracts/workflows/internal";

/**
 * Shared function contract for deterministic V1 tool executors.
 *
 * @see Story 6.2.1 — Define tool executor interface
 * @see Story 6.2.3 — Add executor registry
 * @see Story 7.2.4 — Implement parameter binding resolver
 * @see Story 7.2.5 — Implement execution context service
 * @see Story 7.4.1 — Implement sequential step dispatcher
 */

export const toolExecutorWarningSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    propertyKey: z.string().min(1).optional(),
  })
  .strict();

export type ToolExecutorWarning = z.infer<typeof toolExecutorWarningSchema>;

export const toolExecutorItemErrorSchema = z
  .object({
    code: z.string().min(1),
    userMessage: z.string().min(1),
    propertyKey: z.string().min(1).optional(),
    debug: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type ToolExecutorItemError = z.infer<typeof toolExecutorItemErrorSchema>;

export const toolExecutorFatalErrorSchema = z
  .object({
    code: z.string().min(1),
    userMessage: z.string().min(1),
    debug: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type ToolExecutorFatalError = z.infer<typeof toolExecutorFatalErrorSchema>;

/** Binding-free config values resolved before the executor runs. */
export const toolExecutorResolvedConfigSchema = z.record(
  z.string(),
  z.unknown(),
);

export type ToolExecutorResolvedConfig = z.infer<
  typeof toolExecutorResolvedConfigSchema
>;

export const toolExecutorRuntimeInputValuesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

export type ToolExecutorRuntimeInputValues = z.infer<
  typeof toolExecutorRuntimeInputValuesSchema
>;

export const toolExecutorRunContextSchema = z
  .object({
    runId: domainEntityIdSchema,
    nodeId: workflowNodeIdSchema,
    toolKey: toolKeySchema,
    workflowId: domainEntityIdSchema,
    workflowVersionId: domainEntityIdSchema,
    workspaceId: domainEntityIdSchema,
    userId: domainEntityIdSchema,
    runtimeInputValues: toolExecutorRuntimeInputValuesSchema,
  })
  .strict();

export type ToolExecutorRunContext = z.infer<typeof toolExecutorRunContextSchema>;

export const toolExecutorInputSchema = z
  .object({
    runContext: toolExecutorRunContextSchema,
    config: toolExecutorResolvedConfigSchema,
    workingSet: executionWorkingSetSchema,
  })
  .strict();

export type ToolExecutorInput = z.infer<typeof toolExecutorInputSchema>;

const toolExecutorResultBaseFields = {
  warnings: z.array(toolExecutorWarningSchema).default([]),
  itemErrors: z.array(toolExecutorItemErrorSchema).default([]),
} as const;

export const toolExecutorSuccessResultSchema = z
  .object({
    status: z.literal("success"),
    workingSetPatch: executionWorkingSetPatchSchema,
    ...toolExecutorResultBaseFields,
  })
  .strict();

export type ToolExecutorSuccessResult = z.infer<
  typeof toolExecutorSuccessResultSchema
>;

export const toolExecutorFailedResultSchema = z
  .object({
    status: z.literal("failed"),
    fatalError: toolExecutorFatalErrorSchema,
    workingSetPatch: executionWorkingSetPatchSchema.optional(),
    ...toolExecutorResultBaseFields,
  })
  .strict();

export type ToolExecutorFailedResult = z.infer<
  typeof toolExecutorFailedResultSchema
>;

export const toolExecutorResultSchema = z.discriminatedUnion("status", [
  toolExecutorSuccessResultSchema,
  toolExecutorFailedResultSchema,
]);

export type ToolExecutorResult = z.infer<typeof toolExecutorResultSchema>;

export type ToolExecutor = (
  input: ToolExecutorInput,
) => Promise<ToolExecutorResult>;

export function createToolExecutorWarning(
  code: string,
  message: string,
  options?: { propertyKey?: string },
): ToolExecutorWarning {
  return toolExecutorWarningSchema.parse({
    code,
    message,
    ...(options?.propertyKey ? { propertyKey: options.propertyKey } : {}),
  });
}

export function createToolExecutorItemError(
  code: string,
  userMessage: string,
  options?: { propertyKey?: string; debug?: Record<string, unknown> },
): ToolExecutorItemError {
  return toolExecutorItemErrorSchema.parse({
    code,
    userMessage,
    ...(options?.propertyKey ? { propertyKey: options.propertyKey } : {}),
    ...(options?.debug ? { debug: options.debug } : {}),
  });
}

export function createToolExecutorFatalError(
  code: string,
  userMessage: string,
  options?: { debug?: Record<string, unknown> },
): ToolExecutorFatalError {
  return toolExecutorFatalErrorSchema.parse({
    code,
    userMessage,
    ...(options?.debug ? { debug: options.debug } : {}),
  });
}

export function createToolExecutorSuccessResult(
  workingSetPatch: z.input<typeof executionWorkingSetPatchSchema>,
  options?: {
    warnings?: ToolExecutorWarning[];
    itemErrors?: ToolExecutorItemError[];
  },
): ToolExecutorSuccessResult {
  return toolExecutorSuccessResultSchema.parse({
    status: "success",
    workingSetPatch,
    warnings: options?.warnings ?? [],
    itemErrors: options?.itemErrors ?? [],
  });
}

export function createToolExecutorFailedResult(
  fatalError: ToolExecutorFatalError,
  options?: {
    workingSetPatch?: z.input<typeof executionWorkingSetPatchSchema>;
    warnings?: ToolExecutorWarning[];
    itemErrors?: ToolExecutorItemError[];
  },
): ToolExecutorFailedResult {
  return toolExecutorFailedResultSchema.parse({
    status: "failed",
    fatalError,
    ...(options?.workingSetPatch
      ? { workingSetPatch: options.workingSetPatch }
      : {}),
    warnings: options?.warnings ?? [],
    itemErrors: options?.itemErrors ?? [],
  });
}

export function parseToolExecutorInput(value: unknown): ToolExecutorInput {
  return toolExecutorInputSchema.parse(value);
}

export function parseToolExecutorResult(value: unknown): ToolExecutorResult {
  return toolExecutorResultSchema.parse(value);
}

export function isToolExecutorSuccessResult(
  result: ToolExecutorResult,
): result is ToolExecutorSuccessResult {
  return result.status === "success";
}

export function isToolExecutorFailedResult(
  result: ToolExecutorResult,
): result is ToolExecutorFailedResult {
  return result.status === "failed";
}
