import "server-only";

import { and, eq } from "drizzle-orm";

import type { WorkflowRuntimeInputs } from "@/contracts/workflows/runtime-inputs";
import { getDb } from "@/db";
import { workflowVersions, workflows } from "@/db/schema/workflow";
import { AppError } from "@/lib/api/errors";

import type { WorkspaceAuthorizationContext } from "@/modules/workspace";

import { assertWorkflowAllowsRun, parseWorkflowStatus } from "./lifecycle";
import { loadCompiledPlanForPublishedVersion } from "./load-compiled-plan";

/**
 * @see Story 8.1.1 — Build workflow run form
 */

export type GetWorkflowRunFormContextInput = {
  workflowId: string;
};

export type GetWorkflowRunFormContextContext = Pick<
  WorkspaceAuthorizationContext,
  "workspace"
>;

export type WorkflowRunFormContext = {
  workflowId: string;
  workflowName: string;
  workflowDescription: string | null;
  publishedVersionNumber: number;
  runtimeInputs: WorkflowRuntimeInputs;
};

function workflowNotFoundError(): AppError {
  return new AppError("not_found", "Workflow not found.");
}

function noPublishedVersionError(): AppError {
  return new AppError(
    "conflict",
    "Workflow has no published version to run.",
  );
}

function requireWorkspaceId(
  workspace: GetWorkflowRunFormContextContext["workspace"],
): string {
  if (!workspace.id) {
    throw new Error("Workspace is missing an id.");
  }

  return workspace.id;
}

export async function getWorkflowRunFormContext(
  input: GetWorkflowRunFormContextInput,
  context: GetWorkflowRunFormContextContext,
): Promise<WorkflowRunFormContext> {
  const db = getDb();
  const workspaceId = requireWorkspaceId(context.workspace);

  const workflow = await db.query.workflows.findFirst({
    where: and(
      eq(workflows.id, input.workflowId),
      eq(workflows.workspaceId, workspaceId),
    ),
  });

  if (!workflow?.id) {
    throw workflowNotFoundError();
  }

  assertWorkflowAllowsRun(parseWorkflowStatus(workflow.status));

  const publishedVersions = await db
    .select()
    .from(workflowVersions)
    .where(
      and(
        eq(workflowVersions.workflowId, input.workflowId),
        eq(workflowVersions.state, "published"),
      ),
    );

  let latestPublished: (typeof publishedVersions)[number] | null = null;

  for (const version of publishedVersions) {
    if (
      latestPublished === null ||
      version.versionNumber > latestPublished.versionNumber
    ) {
      latestPublished = version;
    }
  }

  if (!latestPublished?.id) {
    throw noPublishedVersionError();
  }

  const compiledPlan = loadCompiledPlanForPublishedVersion({
    state: "published",
    definitionJson: latestPublished.definitionJson,
    compiledPlanJson: latestPublished.compiledPlanJson,
  });

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    workflowDescription: workflow.description,
    publishedVersionNumber: latestPublished.versionNumber,
    runtimeInputs: compiledPlan.runtimeInputs,
  };
}
