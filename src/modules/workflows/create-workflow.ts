import "server-only";

import { createEmptyWorkflowDefinition } from "@/contracts/workflows/internal";
import type { CreateWorkflowRequest } from "@/contracts/workflows/requests";
import type { CreateWorkflowResponse } from "@/contracts/workflows/responses";
import { getDb } from "@/db";
import { workflowVersions, workflows } from "@/db/schema/workflow";
import { AppError } from "@/lib/api/errors";
import type { WorkspaceAuthorizationContext } from "@/modules/workspace";

import { parseWorkflowStatus } from "./lifecycle";

/**
 * @see Story 4.3.1 — Implement create workflow service
 */

export type CreateWorkflowContext = Pick<
  WorkspaceAuthorizationContext,
  "user" | "workspace"
>;

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function duplicateWorkflowNameError(): AppError {
  return new AppError("validation_error", "Validation failed", {
    details: {
      issues: [
        {
          path: "name",
          message:
            "An active workflow with this name already exists in the workspace.",
        },
      ],
    },
  });
}

function requireWorkspaceId(
  workspace: CreateWorkflowContext["workspace"],
): string {
  if (!workspace.id) {
    throw new Error("Workspace is missing an id.");
  }

  return workspace.id;
}

function requireUserId(user: CreateWorkflowContext["user"]): string {
  if (!user.id) {
    throw new Error("User is missing an id.");
  }

  return user.id;
}

function toCreateWorkflowResponse(
  workflow: typeof workflows.$inferSelect,
  draftVersion: typeof workflowVersions.$inferSelect,
): CreateWorkflowResponse {
  if (!workflow.id || !draftVersion.id) {
    throw new Error("Created workflow records are missing identifiers.");
  }

  if (!workflow.createdAt || !workflow.updatedAt) {
    throw new Error("Created workflow records are missing timestamps.");
  }

  return {
    workflowId: workflow.id,
    draftVersionId: draftVersion.id,
    name: workflow.name,
    description: workflow.description,
    status: parseWorkflowStatus(workflow.status),
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  };
}

export async function createWorkflow(
  input: CreateWorkflowRequest,
  context: CreateWorkflowContext,
): Promise<CreateWorkflowResponse> {
  const db = getDb();
  const workspaceId = requireWorkspaceId(context.workspace);
  const createdByUserId = requireUserId(context.user);
  const definition = createEmptyWorkflowDefinition();

  try {
    return await db.transaction(async (tx) => {
      const [workflow] = await tx
        .insert(workflows)
        .values({
          workspaceId,
          name: input.name,
          description: input.description ?? null,
          createdByUserId,
        })
        .returning();

      if (!workflow) {
        throw new Error("Failed to create workflow.");
      }

      const workflowId = workflow.id;

      if (!workflowId) {
        throw new Error("Created workflow is missing an id.");
      }

      const [draftVersion] = await tx
        .insert(workflowVersions)
        .values({
          workflowId,
          versionNumber: 1,
          state: "draft",
          definitionJson: definition,
          compiledPlanJson: null,
          createdByUserId,
        })
        .returning();

      if (!draftVersion) {
        throw new Error("Failed to create workflow draft version.");
      }

      return toCreateWorkflowResponse(workflow, draftVersion);
    });
  } catch (error) {
    if (isPostgresUniqueViolation(error)) {
      throw duplicateWorkflowNameError();
    }

    throw error;
  }
}
