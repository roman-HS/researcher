import type { JsonObject } from "@/db/schema/helpers/columns";
import {
  workflowStatusSchema,
  workflowVersionStateSchema,
  type WorkflowStatus,
  type WorkflowVersionState,
} from "@/contracts/workflows/lifecycle";

import { WorkflowLifecycleError } from "./errors";

const WORKFLOW_STATUS_TRANSITIONS: Record<
  WorkflowStatus,
  readonly WorkflowStatus[]
> = {
  active: ["archived"],
  archived: [],
};

const WORKFLOW_VERSION_STATE_TRANSITIONS: Record<
  WorkflowVersionState,
  readonly WorkflowVersionState[]
> = {
  draft: ["published", "archived"],
  published: [],
  archived: [],
};

function formatTransitionError(
  entity: "workflow" | "workflow version",
  from: string,
  to: string,
): string {
  return `Invalid ${entity} lifecycle transition from "${from}" to "${to}".`;
}

export function parseWorkflowStatus(value: unknown): WorkflowStatus {
  const result = workflowStatusSchema.safeParse(value);
  if (!result.success) {
    throw new WorkflowLifecycleError(
      "Invalid workflow status value.",
      "invalid_status",
    );
  }

  return result.data;
}

export function parseWorkflowVersionState(
  value: unknown,
): WorkflowVersionState {
  const result = workflowVersionStateSchema.safeParse(value);
  if (!result.success) {
    throw new WorkflowLifecycleError(
      "Invalid workflow version state value.",
      "invalid_status",
    );
  }

  return result.data;
}

export function assertWorkflowStatusTransition(
  from: WorkflowStatus,
  to: WorkflowStatus,
): void {
  if (!WORKFLOW_STATUS_TRANSITIONS[from].includes(to)) {
    throw new WorkflowLifecycleError(
      formatTransitionError("workflow", from, to),
      "invalid_transition",
    );
  }
}

export function assertVersionStateTransition(
  from: WorkflowVersionState,
  to: WorkflowVersionState,
): void {
  if (!WORKFLOW_VERSION_STATE_TRANSITIONS[from].includes(to)) {
    throw new WorkflowLifecycleError(
      formatTransitionError("workflow version", from, to),
      "invalid_transition",
    );
  }
}

export function assertWorkflowAllowsMutation(status: WorkflowStatus): void {
  if (status === "archived") {
    throw new WorkflowLifecycleError(
      "Archived workflows cannot be modified.",
      "workflow_archived",
    );
  }
}

export function assertWorkflowAllowsRun(status: WorkflowStatus): void {
  if (status === "archived") {
    throw new WorkflowLifecycleError(
      "Archived workflows cannot be run.",
      "workflow_archived",
    );
  }
}

export function assertVersionCanPublish(state: WorkflowVersionState): void {
  assertVersionStateTransition(state, "published");
}

export function createArchiveWorkflowPatch(now = new Date()) {
  return {
    status: "archived" as const,
    archivedAt: now,
  };
}

export function createArchiveDraftVersionPatch() {
  return {
    state: "archived" as const,
  };
}

export function createPublishVersionPatch(
  compiledPlanJson: JsonObject,
  now = new Date(),
) {
  return {
    state: "published" as const,
    publishedAt: now,
    compiledPlanJson,
  };
}

export type NewDraftAfterPublishInput = {
  workflowId: string;
  latestPublishedDefinitionJson: JsonObject;
  maxVersionNumber: number;
  createdByUserId: string;
};

/**
 * Lazily creates the next draft after publish: copies the latest published
 * definition into a new version row with the next version number.
 */
export function buildNewDraftVersionAfterPublish(input: NewDraftAfterPublishInput) {
  return {
    workflowId: input.workflowId,
    versionNumber: input.maxVersionNumber + 1,
    state: "draft" as const,
    definitionJson: input.latestPublishedDefinitionJson,
    compiledPlanJson: null,
    publishedAt: null,
    createdByUserId: input.createdByUserId,
  };
}

export type ArchiveWorkflowPlan = {
  workflowPatch: ReturnType<typeof createArchiveWorkflowPatch>;
  draftVersionPatch: ReturnType<typeof createArchiveDraftVersionPatch> | null;
};

/**
 * Plans workflow archive side effects. Archiving also archives an active draft
 * version row so the one-draft-per-workflow constraint stays consistent.
 */
export function planArchiveWorkflow(
  workflowStatus: WorkflowStatus,
  activeDraftState: WorkflowVersionState | null,
  now = new Date(),
): ArchiveWorkflowPlan {
  assertWorkflowStatusTransition(workflowStatus, "archived");

  return {
    workflowPatch: createArchiveWorkflowPatch(now),
    draftVersionPatch:
      activeDraftState === "draft" ? createArchiveDraftVersionPatch() : null,
  };
}
