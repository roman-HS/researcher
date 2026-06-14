import "server-only";

import { and, eq } from "drizzle-orm";

import type { ArchiveWorkflowResponse } from "@/contracts/workflows/responses";
import { getDb } from "@/db";
import { workflowVersions, workflows } from "@/db/schema/workflow";
import { AppError } from "@/lib/api/errors";
import type { WorkspaceAuthorizationContext } from "@/modules/workspace";

import {
  parseWorkflowStatus,
  parseWorkflowVersionState,
  planArchiveWorkflow,
} from "./lifecycle";

/**
 * @see Story 4.3.7 — Implement archive workflow service
 */

export type ArchiveWorkflowContext = Pick<
  WorkspaceAuthorizationContext,
  "workspace"
>;

function requireWorkspaceId(
  workspace: ArchiveWorkflowContext["workspace"],
): string {
  if (!workspace.id) {
    throw new Error("Workspace is missing an id.");
  }

  return workspace.id;
}

function workflowNotFoundError(): AppError {
  return new AppError("not_found", "Workflow not found.");
}

function toIsoDateTime(value: Date): string {
  return value.toISOString();
}

function toArchiveWorkflowResponse(
  workflow: typeof workflows.$inferSelect,
): ArchiveWorkflowResponse {
  if (!workflow.id || !workflow.updatedAt || !workflow.archivedAt) {
    throw new Error("Archived workflow row is missing required fields.");
  }

  const status = parseWorkflowStatus(workflow.status);

  if (status !== "archived") {
    throw new Error("Archived workflow row has unexpected status.");
  }

  return {
    workflowId: workflow.id,
    name: workflow.name,
    description: workflow.description,
    status,
    archivedAt: toIsoDateTime(workflow.archivedAt),
    updatedAt: toIsoDateTime(workflow.updatedAt),
  };
}

export async function archiveWorkflow(
  workflowId: string,
  context: ArchiveWorkflowContext,
): Promise<ArchiveWorkflowResponse> {
  const db = getDb();
  const workspaceId = requireWorkspaceId(context.workspace);

  return db.transaction(async (tx) => {
    const workflow = await tx.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId),
        eq(workflows.workspaceId, workspaceId),
      ),
    });

    if (!workflow) {
      throw workflowNotFoundError();
    }

    const activeDraft = await tx.query.workflowVersions.findFirst({
      where: and(
        eq(workflowVersions.workflowId, workflowId),
        eq(workflowVersions.state, "draft"),
      ),
    });

    const now = new Date();
    const archivePlan = planArchiveWorkflow(
      parseWorkflowStatus(workflow.status),
      activeDraft ? parseWorkflowVersionState(activeDraft.state) : null,
      now,
    );

    const [archivedWorkflow] = await tx
      .update(workflows)
      .set({
        ...archivePlan.workflowPatch,
        updatedAt: now,
      })
      .where(eq(workflows.id, workflowId))
      .returning();

    if (!archivedWorkflow) {
      throw new Error("Failed to archive workflow.");
    }

    if (archivePlan.draftVersionPatch && activeDraft?.id) {
      const [archivedDraft] = await tx
        .update(workflowVersions)
        .set({
          ...archivePlan.draftVersionPatch,
          updatedAt: now,
        })
        .where(
          and(
            eq(workflowVersions.id, activeDraft.id),
            eq(workflowVersions.state, "draft"),
          ),
        )
        .returning();

      if (!archivedDraft) {
        throw new Error("Failed to archive workflow draft version.");
      }
    }

    return toArchiveWorkflowResponse(archivedWorkflow);
  });
}
