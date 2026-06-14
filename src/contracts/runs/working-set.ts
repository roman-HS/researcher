import { z } from "zod";

/**
 * In-memory workflow execution state passed between tool executors.
 *
 * Placeholder until Story 6.2.2 defines listings, details, comparables, and
 * analysis fields. Keep `EXECUTION_WORKING_SET_VERSION` stable across schema
 * expansions so merge logic can evolve safely.
 *
 * @see Story 6.2.2 — Create execution working-set model
 */

export const EXECUTION_WORKING_SET_VERSION = 1 as const;

export const executionWorkingSetSchema = z
  .object({
    version: z.literal(EXECUTION_WORKING_SET_VERSION),
  })
  .strict();

export type ExecutionWorkingSet = z.infer<typeof executionWorkingSetSchema>;

/** Partial update merged into the current working set by the step dispatcher. */
export const executionWorkingSetPatchSchema =
  executionWorkingSetSchema.partial().strict();

export type ExecutionWorkingSetPatch = z.infer<
  typeof executionWorkingSetPatchSchema
>;

export function createEmptyExecutionWorkingSet(): ExecutionWorkingSet {
  return executionWorkingSetSchema.parse({
    version: EXECUTION_WORKING_SET_VERSION,
  });
}

export function parseExecutionWorkingSet(value: unknown): ExecutionWorkingSet {
  return executionWorkingSetSchema.parse(value);
}

export function parseExecutionWorkingSetPatch(
  value: unknown,
): ExecutionWorkingSetPatch {
  return executionWorkingSetPatchSchema.parse(value);
}
