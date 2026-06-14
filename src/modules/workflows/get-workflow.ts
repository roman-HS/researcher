import "server-only";

import { and, eq, or } from "drizzle-orm";

import { parseWorkflowDefinition } from "@/contracts/workflows/internal";
import type {
  GetWorkflowResponse,
  WorkflowPublishedVersionSummary,
} from "@/contracts/workflows/responses";
import { getDb } from "@/db";
import { workflowVersions, workflows } from "@/db/schema/workflow";
import { AppError } from "@/lib/api/errors";
import type { WorkspaceAuthorizationContext } from "@/modules/workspace";

import { parseWorkflowStatus } from "./lifecycle";

/**
 * @see Story 4.3.3 — Implement get workflow detail service
 */

export type GetWorkflowContext = Pick<
  WorkspaceAuthorizationContext,
  "workspace"
>;

type WorkflowVersionRow = typeof workflowVersions.$inferSelect;

function requireWorkspaceId(
  workspace: GetWorkflowContext["workspace"],
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

function toPublishedVersionSummary(
  version: WorkflowVersionRow,
): WorkflowPublishedVersionSummary | null {
  if (!version.id || !version.updatedAt || !version.publishedAt) {
    return null;
  }

  return {
    versionId: version.id,
    versionNumber: version.versionNumber,
    publishedAt: toIsoDateTime(version.publishedAt),
    updatedAt: toIsoDateTime(version.updatedAt),
  };
}

function selectLatestPublishedVersion(
  versions: WorkflowVersionRow[],
): WorkflowPublishedVersionSummary | null {
  let latest: WorkflowPublishedVersionSummary | null = null;

  for (const version of versions) {
    if (version.state !== "published") {
      continue;
    }

    const candidate = toPublishedVersionSummary(version);

    if (
      candidate &&
      (latest === null || candidate.versionNumber > latest.versionNumber)
    ) {
      latest = candidate;
    }
  }

  return latest;
}

function toGetWorkflowResponse(
  workflow: typeof workflows.$inferSelect,
  versions: WorkflowVersionRow[],
): GetWorkflowResponse {
  if (!workflow.id || !workflow.createdAt || !workflow.updatedAt) {
    throw new Error("Workflow detail row is missing required fields.");
  }

  const draftRow = versions.find((version) => version.state === "draft");
  const publishedVersion = selectLatestPublishedVersion(versions);

  return {
    workflowId: workflow.id,
    name: workflow.name,
    description: workflow.description,
    status: parseWorkflowStatus(workflow.status),
    createdAt: toIsoDateTime(workflow.createdAt),
    updatedAt: toIsoDateTime(workflow.updatedAt),
    archivedAt: workflow.archivedAt
      ? toIsoDateTime(workflow.archivedAt)
      : null,
    draftVersion:
      draftRow?.id && draftRow.updatedAt
        ? {
            versionId: draftRow.id,
            versionNumber: draftRow.versionNumber,
            updatedAt: toIsoDateTime(draftRow.updatedAt),
            definition: parseWorkflowDefinition(draftRow.definitionJson),
          }
        : null,
    publishedVersion,
  };
}

export async function getWorkflow(
  workflowId: string,
  context: GetWorkflowContext,
): Promise<GetWorkflowResponse> {
  const db = getDb();
  const workspaceId = requireWorkspaceId(context.workspace);

  const workflow = await db.query.workflows.findFirst({
    where: and(
      eq(workflows.id, workflowId),
      eq(workflows.workspaceId, workspaceId),
    ),
  });

  if (!workflow) {
    throw workflowNotFoundError();
  }

  const versions = await db
    .select()
    .from(workflowVersions)
    .where(
      and(
        eq(workflowVersions.workflowId, workflowId),
        or(
          eq(workflowVersions.state, "draft"),
          eq(workflowVersions.state, "published"),
        ),
      ),
    );

  return toGetWorkflowResponse(workflow, versions);
}
