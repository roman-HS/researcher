import { z } from "zod";

import {
  domainEntityIdSchema,
  isoDateTimeSchema,
} from "@/contracts/domain/primitives";
import { workflowNameSchema } from "@/contracts/workflows/requests";

import { workflowRunStatusSchema } from "./lifecycle";

/**
 * `/api/v1/runs` response DTO schemas.
 *
 * @see Story 7.3.3 — Implement run creation API route
 * @see Story 7.5.1 — Implement list runs service and API
 */

export const createRunResponseSchema = z.object({
  runId: domainEntityIdSchema,
  status: workflowRunStatusSchema,
  workflowVersionId: domainEntityIdSchema,
  pollAfterMs: z.number().int().positive(),
});

export type CreateRunResponse = z.infer<typeof createRunResponseSchema>;

export const runListItemSchema = z.object({
  runId: domainEntityIdSchema,
  status: workflowRunStatusSchema,
  workflowId: domainEntityIdSchema,
  workflowName: workflowNameSchema,
  workflowVersionId: domainEntityIdSchema,
  workflowVersionNumber: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
  startedAt: isoDateTimeSchema.nullable(),
  completedAt: isoDateTimeSchema.nullable(),
  propertyResultCount: z.number().int().nonnegative().nullable(),
});

export type RunListItem = z.infer<typeof runListItemSchema>;

export const listRunsResponseSchema = z.array(runListItemSchema);

export type ListRunsResponse = z.infer<typeof listRunsResponseSchema>;
