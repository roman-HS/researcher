import { z } from "zod";

import { domainEntityIdSchema, isoDateTimeSchema } from "@/contracts/domain/primitives";

import { workflowStatusSchema } from "./lifecycle";
import { workflowNameSchema } from "./requests";

/**
 * `/api/v1/workflows` response DTO schemas.
 *
 * @see Story 4.3.1 — Implement create workflow service
 */

export const createWorkflowResponseSchema = z.object({
  workflowId: domainEntityIdSchema,
  draftVersionId: domainEntityIdSchema,
  name: workflowNameSchema,
  description: z.string().nullable(),
  status: workflowStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type CreateWorkflowResponse = z.infer<typeof createWorkflowResponseSchema>;
