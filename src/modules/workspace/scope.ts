import type { RunId } from "@/contracts/runs";
import type { WorkflowId } from "@/contracts/workflows";

import { ForbiddenError } from "./errors";

export type WorkspaceScopedResource = {
  workspaceId: string;
};

export type WorkspaceScopedWorkflow = WorkspaceScopedResource & {
  id: WorkflowId;
};

export type WorkspaceScopedRun = WorkspaceScopedResource & {
  id: RunId;
};

export function assertWorkflowInWorkspace(
  workflow: WorkspaceScopedResource,
  workspaceId: string,
): void {
  if (workflow.workspaceId !== workspaceId) {
    throw new ForbiddenError();
  }
}

export function assertRunInWorkspace(
  run: WorkspaceScopedResource,
  workspaceId: string,
): void {
  if (run.workspaceId !== workspaceId) {
    throw new ForbiddenError();
  }
}
