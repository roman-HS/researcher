import { z } from "zod";

import { domainEntityIdSchema } from "@/contracts/domain/primitives";

import { workflowRunStatusSchema } from "./lifecycle";

/**
 * `/api/v1/runs` response DTO schemas.
 *
 * @see Story 7.3.3 — Implement run creation API route
 */

export const createRunResponseSchema = z.object({
  runId: domainEntityIdSchema,
  status: workflowRunStatusSchema,
  workflowVersionId: domainEntityIdSchema,
  pollAfterMs: z.number().int().positive(),
});

export type CreateRunResponse = z.infer<typeof createRunResponseSchema>;
