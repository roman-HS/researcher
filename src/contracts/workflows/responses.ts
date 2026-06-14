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
 * @see Story 4.3.4 — Implement update draft workflow service
 * @see Story 4.3.5 — Implement publish workflow service
 * @see Story 4.3.6 — Implement duplicate workflow service
 * @see Story 4.3.7 — Implement archive workflow service
 */

import { workflowDefinitionValidationIssueSchema } from "./validation";

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

export const updateWorkflowDraftValidationSchema = z.object({
  valid: z.literal(true),
  warnings: z.array(workflowDefinitionValidationIssueSchema),
});

export type UpdateWorkflowDraftValidation = z.infer<
  typeof updateWorkflowDraftValidationSchema
>;

export const updateWorkflowDraftResponseSchema = z.object({
  workflowId: domainEntityIdSchema,
  draftVersionId: domainEntityIdSchema,
  name: workflowNameSchema,
  description: z.string().nullable(),
  status: workflowStatusSchema,
  updatedAt: isoDateTimeSchema,
  draftVersionUpdatedAt: isoDateTimeSchema,
  validation: updateWorkflowDraftValidationSchema,
});

export type UpdateWorkflowDraftResponse = z.infer<
  typeof updateWorkflowDraftResponseSchema
>;

export const publishWorkflowValidationSchema = updateWorkflowDraftValidationSchema;

export type PublishWorkflowValidation = UpdateWorkflowDraftValidation;

export const publishWorkflowResponseSchema = z.object({
  workflowId: domainEntityIdSchema,
  publishedVersionId: domainEntityIdSchema,
  publishedVersionNumber: z.number().int().positive(),
  publishedAt: isoDateTimeSchema,
  draftVersionId: domainEntityIdSchema,
  workflowUpdatedAt: isoDateTimeSchema,
  validation: publishWorkflowValidationSchema,
});

export type PublishWorkflowResponse = z.infer<
  typeof publishWorkflowResponseSchema
>;

export const duplicateWorkflowResponseSchema = createWorkflowResponseSchema;

export type DuplicateWorkflowResponse = CreateWorkflowResponse;

export const archiveWorkflowResponseSchema = z.object({
  workflowId: domainEntityIdSchema,
  name: workflowNameSchema,
  description: z.string().nullable(),
  status: z.literal("archived"),
  archivedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type ArchiveWorkflowResponse = z.infer<typeof archiveWorkflowResponseSchema>;
