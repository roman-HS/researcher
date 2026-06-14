import { z } from "zod";

import { domainEntityIdSchema, isoDateTimeSchema } from "@/contracts/domain/primitives";

import { workflowDefinitionSchema } from "./internal";
import { workflowStatusSchema } from "./lifecycle";
import { workflowNameSchema } from "./requests";

/**
 * `/api/v1/workflows` response DTO schemas.
 *
 * @see Story 4.3.1 — Implement create workflow service
 * @see Story 4.3.2 — Implement list workflows service
 * @see Story 4.3.3 — Implement get workflow detail service
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

export const workflowDraftVersionSummarySchema = z.object({
  versionId: domainEntityIdSchema,
  versionNumber: z.number().int().positive(),
  updatedAt: isoDateTimeSchema,
});

export type WorkflowDraftVersionSummary = z.infer<
  typeof workflowDraftVersionSummarySchema
>;

export const workflowPublishedVersionSummarySchema = z.object({
  versionId: domainEntityIdSchema,
  versionNumber: z.number().int().positive(),
  publishedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type WorkflowPublishedVersionSummary = z.infer<
  typeof workflowPublishedVersionSummarySchema
>;

export const workflowListItemSchema = z.object({
  workflowId: domainEntityIdSchema,
  name: workflowNameSchema,
  description: z.string().nullable(),
  status: workflowStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  archivedAt: isoDateTimeSchema.nullable(),
  draftVersion: workflowDraftVersionSummarySchema.nullable(),
  publishedVersion: workflowPublishedVersionSummarySchema.nullable(),
});

export type WorkflowListItem = z.infer<typeof workflowListItemSchema>;

export const listWorkflowsResponseSchema = z.array(workflowListItemSchema);

export type ListWorkflowsResponse = z.infer<typeof listWorkflowsResponseSchema>;

export const workflowDraftVersionDetailSchema =
  workflowDraftVersionSummarySchema.extend({
    definition: workflowDefinitionSchema,
  });

export type WorkflowDraftVersionDetail = z.infer<
  typeof workflowDraftVersionDetailSchema
>;

export const getWorkflowResponseSchema = z.object({
  workflowId: domainEntityIdSchema,
  name: workflowNameSchema,
  description: z.string().nullable(),
  status: workflowStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  archivedAt: isoDateTimeSchema.nullable(),
  draftVersion: workflowDraftVersionDetailSchema.nullable(),
  publishedVersion: workflowPublishedVersionSummarySchema.nullable(),
});

export type GetWorkflowResponse = z.infer<typeof getWorkflowResponseSchema>;
