import { z } from "zod";

import { domainEntityIdSchema } from "@/contracts/domain/primitives";

import { workflowDefinitionSchema } from "./internal";

/**
 * `/api/v1/workflows` request body and query schemas.
 *
 * @see Story 4.3.1 — Implement create workflow service
 * @see Story 4.3.2 — Implement list workflows service
 * @see Story 4.3.3 — Implement get workflow detail service
 * @see Story 4.3.4 — Implement update draft workflow service
 */

export const workflowNameSchema = z.string().trim().min(1).max(120);

export type WorkflowName = z.infer<typeof workflowNameSchema>;

const workflowDescriptionInputSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length === 0 ? null : value))
    .optional()
);

export const createWorkflowRequestSchema = z
  .object({
    name: workflowNameSchema,
    description: workflowDescriptionInputSchema,
  })
  .strict();

export type CreateWorkflowRequest = z.infer<typeof createWorkflowRequestSchema>;

export const listWorkflowsStatusFilters = [
  "active",
  "archived",
  "all",
] as const;

export type ListWorkflowsStatusFilter =
  (typeof listWorkflowsStatusFilters)[number];

export const listWorkflowsQuerySchema = z.object({
  status: z.enum(listWorkflowsStatusFilters).default("active"),
});

export type ListWorkflowsQuery = z.infer<typeof listWorkflowsQuerySchema>;

export const updateWorkflowDraftRequestSchema = z
  .object({
    definition: workflowDefinitionSchema,
    name: workflowNameSchema.optional(),
    description: workflowDescriptionInputSchema,
  })
  .strict();

export type UpdateWorkflowDraftRequest = z.infer<
  typeof updateWorkflowDraftRequestSchema
>;

export const getWorkflowParamsSchema = z.object({
  workflowId: domainEntityIdSchema,
});

export type GetWorkflowParams = z.infer<typeof getWorkflowParamsSchema>;

export const updateWorkflowDraftParamsSchema = getWorkflowParamsSchema;

export type UpdateWorkflowDraftParams = GetWorkflowParams;
