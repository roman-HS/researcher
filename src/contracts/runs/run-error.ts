import { z } from "zod";

import { toolExecutorFatalErrorSchema } from "@/contracts/runs/executors";

/**
 * Persisted fatal error payloads for run and step rows.
 *
 * @see Story 7.2.2 — Define run status lifecycle
 * @see Story 7.4.6 — Implement run failure handling
 */

export const runStepErrorJsonSchema = toolExecutorFatalErrorSchema;

export type RunStepErrorJson = z.infer<typeof runStepErrorJsonSchema>;

export const runErrorJsonSchema = toolExecutorFatalErrorSchema
  .extend({
    stepNodeId: z.string().min(1).optional(),
    toolKey: z.string().min(1).optional(),
  })
  .strict();

export type RunErrorJson = z.infer<typeof runErrorJsonSchema>;

export function parseRunStepErrorJson(value: unknown): RunStepErrorJson {
  return runStepErrorJsonSchema.parse(value);
}

export function parseRunErrorJson(value: unknown): RunErrorJson {
  return runErrorJsonSchema.parse(value);
}
