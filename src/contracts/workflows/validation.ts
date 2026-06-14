import { z } from "zod";

import type { WorkflowDefinition } from "./internal";

/**
 * Workflow definition validation result shapes.
 *
 * @see Story 4.2.5 — Implement workflow definition validation service
 */

export const workflowDefinitionValidationSeverities = [
  "error",
  "warning",
] as const;

export type WorkflowDefinitionValidationSeverity =
  (typeof workflowDefinitionValidationSeverities)[number];

export const workflowDefinitionValidationIssueSchema = z.object({
  severity: z.enum(workflowDefinitionValidationSeverities),
  code: z.string().min(1),
  message: z.string().min(1),
  path: z.string().optional(),
  nodeId: z.string().optional(),
});

export type WorkflowDefinitionValidationIssue = z.infer<
  typeof workflowDefinitionValidationIssueSchema
>;

export const workflowDefinitionValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(workflowDefinitionValidationIssueSchema),
  warnings: z.array(workflowDefinitionValidationIssueSchema),
});

export type WorkflowDefinitionValidationResult =
  z.infer<typeof workflowDefinitionValidationResultSchema> & {
    definition?: WorkflowDefinition;
  };
