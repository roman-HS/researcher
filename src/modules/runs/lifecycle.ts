import type { RunErrorJson, RunStepErrorJson } from "@/contracts/runs/run-error";
import {
  isTerminalRunStatus,
  isTerminalStepStatus,
  workflowRunStatusSchema,
  workflowRunStepStatusSchema,
  type WorkflowRunStatus,
  type WorkflowRunStepStatus,
} from "@/contracts/runs/lifecycle";

import { RunLifecycleError } from "./errors";

/**
 * @see Story 7.2.2 — Define run status lifecycle
 */

const WORKFLOW_RUN_STATUS_TRANSITIONS: Record<
  WorkflowRunStatus,
  readonly WorkflowRunStatus[]
> = {
  pending: ["running", "failed"],
  running: ["succeeded", "partial", "failed", "canceled"],
  succeeded: [],
  partial: [],
  failed: [],
  canceled: [],
};

const WORKFLOW_RUN_STEP_STATUS_TRANSITIONS: Record<
  WorkflowRunStepStatus,
  readonly WorkflowRunStepStatus[]
> = {
  pending: ["running", "skipped"],
  running: ["succeeded", "failed"],
  succeeded: [],
  failed: [],
  skipped: [],
};

export type RunStatusPatch = {
  status: WorkflowRunStatus;
  startedAt?: Date;
  completedAt?: Date;
  errorJson?: RunErrorJson | null;
};

export type RunStepStatusPatch = {
  status: WorkflowRunStepStatus;
  startedAt?: Date;
  completedAt?: Date;
  errorJson?: RunStepErrorJson | null;
};

function formatRunTransitionError(from: string, to: string): string {
  return `Invalid run lifecycle transition from "${from}" to "${to}".`;
}

function formatStepTransitionError(from: string, to: string): string {
  return `Invalid run step lifecycle transition from "${from}" to "${to}".`;
}

export function parseWorkflowRunStatus(value: unknown): WorkflowRunStatus {
  const result = workflowRunStatusSchema.safeParse(value);

  if (!result.success) {
    throw new RunLifecycleError("Invalid run status value.", "invalid_status");
  }

  return result.data;
}

export function parseWorkflowRunStepStatus(
  value: unknown,
): WorkflowRunStepStatus {
  const result = workflowRunStepStatusSchema.safeParse(value);

  if (!result.success) {
    throw new RunLifecycleError(
      "Invalid run step status value.",
      "invalid_status",
    );
  }

  return result.data;
}

export function assertRunStatusTransition(
  from: WorkflowRunStatus,
  to: WorkflowRunStatus,
): void {
  if (from === to) {
    return;
  }

  if (!WORKFLOW_RUN_STATUS_TRANSITIONS[from].includes(to)) {
    throw new RunLifecycleError(
      formatRunTransitionError(from, to),
      "invalid_transition",
    );
  }
}

export function assertRunStepStatusTransition(
  from: WorkflowRunStepStatus,
  to: WorkflowRunStepStatus,
): void {
  if (from === to) {
    return;
  }

  if (!WORKFLOW_RUN_STEP_STATUS_TRANSITIONS[from].includes(to)) {
    throw new RunLifecycleError(
      formatStepTransitionError(from, to),
      "invalid_transition",
    );
  }
}

export type PlanRunStatusTransitionInput = {
  now?: Date;
  error?: RunErrorJson;
  startedAt?: Date | null;
};

/**
 * Plans a run status update. Returns `null` for idempotent same-state updates.
 */
export function planRunStatusTransition(
  from: WorkflowRunStatus,
  to: WorkflowRunStatus,
  options: PlanRunStatusTransitionInput = {},
): RunStatusPatch | null {
  if (from === to) {
    return null;
  }

  assertRunStatusTransition(from, to);

  const now = options.now ?? new Date();
  const patch: RunStatusPatch = { status: to };

  if (to === "running" && options.startedAt == null) {
    patch.startedAt = now;
  }

  if (isTerminalRunStatus(to)) {
    patch.completedAt = now;
  }

  if (to === "failed" && options.error) {
    patch.errorJson = options.error;
  }

  return patch;
}

export type PlanRunStepStatusTransitionInput = {
  now?: Date;
  error?: RunStepErrorJson;
  startedAt?: Date | null;
};

/**
 * Plans a step status update. Returns `null` for idempotent same-state updates.
 */
export function planRunStepStatusTransition(
  from: WorkflowRunStepStatus,
  to: WorkflowRunStepStatus,
  options: PlanRunStepStatusTransitionInput = {},
): RunStepStatusPatch | null {
  if (from === to) {
    return null;
  }

  assertRunStepStatusTransition(from, to);

  const now = options.now ?? new Date();
  const patch: RunStepStatusPatch = { status: to };

  if (to === "running" && options.startedAt == null) {
    patch.startedAt = now;
  }

  if (isTerminalStepStatus(to)) {
    patch.completedAt = now;
  }

  if (to === "failed" && options.error) {
    patch.errorJson = options.error;
  }

  return patch;
}

export function createRunStatusPatch(
  from: WorkflowRunStatus,
  to: WorkflowRunStatus,
  options: PlanRunStatusTransitionInput = {},
): RunStatusPatch | null {
  return planRunStatusTransition(from, to, options);
}

export function createRunStepStatusPatch(
  from: WorkflowRunStepStatus,
  to: WorkflowRunStepStatus,
  options: PlanRunStepStatusTransitionInput = {},
): RunStepStatusPatch | null {
  return planRunStepStatusTransition(from, to, options);
}
