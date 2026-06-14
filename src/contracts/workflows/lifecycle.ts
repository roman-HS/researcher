import { z } from "zod";

/**
 * Application source of truth for workflow lifecycle values.
 * Postgres enums in `src/db/schema/workflow.ts` must use the same literals.
 */

export const workflowStatuses = ["active", "archived"] as const;

export type WorkflowStatus = (typeof workflowStatuses)[number];

export const workflowStatusSchema = z.enum(workflowStatuses);

export const workflowVersionStates = [
  "draft",
  "published",
  "archived",
] as const;

export type WorkflowVersionState = (typeof workflowVersionStates)[number];

export const workflowVersionStateSchema = z.enum(workflowVersionStates);

export const workflowStatusLabels: Record<WorkflowStatus, string> = {
  active: "Active",
  archived: "Archived",
};

export const workflowVersionStateLabels: Record<WorkflowVersionState, string> =
  {
    draft: "Draft",
    published: "Published",
    archived: "Archived",
  };
