import { z } from "zod";

/**
 * Application source of truth for run lifecycle values.
 * Postgres enums in `src/db/schema/run.ts` must use the same literals.
 *
 * @see Story 7.1.1 — Create workflow_runs table
 * @see Story 7.2.2 — Define run status lifecycle
 */

export const workflowRunStatuses = [
  "pending",
  "running",
  "succeeded",
  "partial",
  "failed",
  "canceled",
] as const;

export type WorkflowRunStatus = (typeof workflowRunStatuses)[number];

export const workflowRunStatusSchema = z.enum(workflowRunStatuses);

export const workflowRunStepStatuses = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "skipped",
] as const;

export type WorkflowRunStepStatus = (typeof workflowRunStepStatuses)[number];

export const workflowRunStepStatusSchema = z.enum(workflowRunStepStatuses);

export const workflowRunStatusLabels: Record<WorkflowRunStatus, string> = {
  pending: "Pending",
  running: "Running",
  succeeded: "Succeeded",
  partial: "Partial",
  failed: "Failed",
  canceled: "Canceled",
};

export const workflowRunStepStatusLabels: Record<
  WorkflowRunStepStatus,
  string
> = {
  pending: "Pending",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  skipped: "Skipped",
};

const TERMINAL_RUN_STATUSES = [
  "succeeded",
  "partial",
  "failed",
  "canceled",
] as const satisfies readonly WorkflowRunStatus[];

const SUCCESSFUL_RUN_STATUSES = [
  "succeeded",
  "partial",
] as const satisfies readonly WorkflowRunStatus[];

const TERMINAL_STEP_STATUSES = [
  "succeeded",
  "failed",
  "skipped",
] as const satisfies readonly WorkflowRunStepStatus[];

export function isTerminalRunStatus(
  status: WorkflowRunStatus,
): status is (typeof TERMINAL_RUN_STATUSES)[number] {
  return (TERMINAL_RUN_STATUSES as readonly WorkflowRunStatus[]).includes(
    status,
  );
}

export function isSuccessfulRunStatus(
  status: WorkflowRunStatus,
): status is (typeof SUCCESSFUL_RUN_STATUSES)[number] {
  return (SUCCESSFUL_RUN_STATUSES as readonly WorkflowRunStatus[]).includes(
    status,
  );
}

export function isTerminalStepStatus(
  status: WorkflowRunStepStatus,
): status is (typeof TERMINAL_STEP_STATUSES)[number] {
  return (TERMINAL_STEP_STATUSES as readonly WorkflowRunStepStatus[]).includes(
    status,
  );
}
