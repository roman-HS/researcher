import { z } from "zod";

import { domainEntityIdSchema } from "@/contracts/domain/primitives";

/**
 * `/api/v1/runs` request body and query schemas.
 *
 * @see Story 7.3.2 — Implement idempotent run creation service
 * @see Story 7.3.3 — Implement run creation API route
 */

export const runIdempotencyKeySchema = z.string().trim().min(1).max(128);

export type RunIdempotencyKey = z.infer<typeof runIdempotencyKeySchema>;

export const createRunRequestSchema = z
  .object({
    workflowId: domainEntityIdSchema,
    inputs: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .strict();

export type CreateRunRequest = z.infer<typeof createRunRequestSchema>;

export function parseCreateRunRequest(value: unknown): CreateRunRequest {
  return createRunRequestSchema.parse(value);
}

export function parseRunIdempotencyKey(value: unknown): RunIdempotencyKey {
  return runIdempotencyKeySchema.parse(value);
}
