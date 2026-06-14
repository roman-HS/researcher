import { z } from "zod";

import { domainEntityIdSchema } from "@/contracts/domain/primitives";

/**
 * `/api/v1/runs` request body and query schemas.
 *
 * @see Story 7.3.2 — Implement idempotent run creation service
 * @see Story 7.3.3 — Implement run creation API route
 * @see Story 7.5.1 — Implement list runs service and API
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

export const listRunsQuerySchema = z.object({
  workflowId: domainEntityIdSchema.optional(),
});

export type ListRunsQuery = z.infer<typeof listRunsQuerySchema>;
