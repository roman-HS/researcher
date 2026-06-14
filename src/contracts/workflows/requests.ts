import { z } from "zod";

/**
 * `/api/v1/workflows` request body and query schemas.
 *
 * @see Story 4.3.1 — Implement create workflow service
 * @see Story 4.3.2 — Implement list workflows service
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
    .optional(),
);

export const createWorkflowRequestSchema = z
  .object({
    name: workflowNameSchema,
    description: workflowDescriptionInputSchema,
  })
  .strict();

export type CreateWorkflowRequest = z.infer<typeof createWorkflowRequestSchema>;

export const listWorkflowsStatusFilters = ["active", "archived", "all"] as const;

export type ListWorkflowsStatusFilter =
  (typeof listWorkflowsStatusFilters)[number];

export const listWorkflowsQuerySchema = z.object({
  status: z.enum(listWorkflowsStatusFilters).default("active"),
});

export type ListWorkflowsQuery = z.infer<typeof listWorkflowsQuerySchema>;
