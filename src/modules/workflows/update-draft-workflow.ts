import "server-only";

import { and, eq } from "drizzle-orm";

import type { UpdateWorkflowDraftRequest } from "@/contracts/workflows/requests";
import type { UpdateWorkflowDraftResponse } from "@/contracts/workflows/responses";
import { getDb } from "@/db";
import { workflowVersions, workflows } from "@/db/schema/workflow";
import { AppError } from "@/lib/api/errors";
import type { WorkspaceAuthorizationContext } from "@/modules/workspace";

import { WorkflowDefinitionValidationError } from "./errors";
import {
  assertWorkflowAllowsMutation,
  parseWorkflowStatus,
} from "./lifecycle";
import { validateWorkflowDefinition } from "./validate-definition";

/**
 * @see Story 4.3.4 — Implement update draft workflow service
 */

export type UpdateWorkflowDraftContext = Pick<
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

function workflowNotFoundError(): AppError {
  return new AppError("not_found", "Workflow not found.");
}

function requireWorkspaceId(
  workspace: UpdateWorkflowDraftContext["workspace"],
): string {
  if (!workspace.id) {
    throw new Error("Workspace is missing an id.");
  }

  return workspace.id;
}

function requireUserId(user: UpdateWorkflowDraftContext["user"]): string {
  if (!user.id) {
    throw new Error("User is missing an id.");
  }

  return user.id;
}

function toIsoDateTime(value: Date): string {
  return value.toISOString();
}

function buildWorkflowMetadataPatch(
  input: UpdateWorkflowDraftRequest,
): Partial<Pick<typeof workflows.$inferInsert, "name" | "description">> {
  const patch: Partial<Pick<typeof workflows.$inferInsert, "name" | "description">> =
    {};

  if (input.name !== undefined) {
    patch.name = input.name;
  }

  if (input.description !== undefined) {
    patch.description = input.description;
  }

  return patch;
}

function getMaxVersionNumber(
  versions: Array<Pick<typeof workflowVersions.$inferSelect, "versionNumber">>,
): number {
  return versions.reduce(
    (max, version) => Math.max(max, version.versionNumber),
    0,
  );
}

function toUpdateWorkflowDraftResponse(
  workflow: typeof workflows.$inferSelect,
  draftVersion: typeof workflowVersions.$inferSelect,
  warnings: UpdateWorkflowDraftResponse["validation"]["warnings"],
): UpdateWorkflowDraftResponse {
  if (!workflow.id || !draftVersion.id) {
    throw new Error("Updated workflow records are missing identifiers.");
  }

  if (!workflow.updatedAt || !draftVersion.updatedAt) {
    throw new Error("Updated workflow records are missing timestamps.");
  }

  return {
    workflowId: workflow.id,
    draftVersionId: draftVersion.id,
    name: workflow.name,
    description: workflow.description,
    status: parseWorkflowStatus(workflow.status),
    updatedAt: toIsoDateTime(workflow.updatedAt),
    draftVersionUpdatedAt: toIsoDateTime(draftVersion.updatedAt),
    validation: {
      valid: true,
      warnings: [...warnings],
    },
  };
}

export async function updateWorkflowDraft(
  workflowId: string,
  input: UpdateWorkflowDraftRequest,
  context: UpdateWorkflowDraftContext,
): Promise<UpdateWorkflowDraftResponse> {
  const db = getDb();
  const workspaceId = requireWorkspaceId(context.workspace);
  const createdByUserId = requireUserId(context.user);
  const validationResult = validateWorkflowDefinition(input.definition, "draft");

  if (!validationResult.valid || !validationResult.definition) {
    throw new WorkflowDefinitionValidationError(
      validationResult.errors,
      validationResult.warnings,
    );
  }

  const definition = validationResult.definition;
  const warnings = validationResult.warnings;

  try {
    return await db.transaction(async (tx) => {
      const workflow = await tx.query.workflows.findFirst({
        where: and(
          eq(workflows.id, workflowId),
          eq(workflows.workspaceId, workspaceId),
        ),
      });

      if (!workflow) {
        throw workflowNotFoundError();
      }

      assertWorkflowAllowsMutation(parseWorkflowStatus(workflow.status));

      const metadataPatch = buildWorkflowMetadataPatch(input);
      const now = new Date();

      const [updatedWorkflow] =
        Object.keys(metadataPatch).length > 0
          ? await tx
              .update(workflows)
              .set({
                ...metadataPatch,
                updatedAt: now,
              })
              .where(eq(workflows.id, workflowId))
              .returning()
          : await tx
              .update(workflows)
              .set({ updatedAt: now })
              .where(eq(workflows.id, workflowId))
              .returning();

      if (!updatedWorkflow) {
        throw new Error("Failed to update workflow metadata.");
      }

      const existingDraft = await tx.query.workflowVersions.findFirst({
        where: and(
          eq(workflowVersions.workflowId, workflowId),
          eq(workflowVersions.state, "draft"),
        ),
      });

      let draftVersion = existingDraft;

      if (!draftVersion) {
        const versionRows = await tx
          .select({ versionNumber: workflowVersions.versionNumber })
          .from(workflowVersions)
          .where(eq(workflowVersions.workflowId, workflowId));

        const [insertedDraft] = await tx
          .insert(workflowVersions)
          .values({
            workflowId,
            versionNumber: getMaxVersionNumber(versionRows) + 1,
            state: "draft",
            definitionJson: definition,
            compiledPlanJson: null,
            createdByUserId,
          })
          .returning();

        if (!insertedDraft) {
          throw new Error("Failed to create workflow draft version.");
        }

        draftVersion = insertedDraft;
      } else {
        const draftVersionId = draftVersion.id;

        if (!draftVersionId) {
          throw new Error("Existing workflow draft is missing an id.");
        }

        const [updatedDraft] = await tx
          .update(workflowVersions)
          .set({
            definitionJson: definition,
            updatedAt: now,
          })
          .where(
            and(
              eq(workflowVersions.id, draftVersionId),
              eq(workflowVersions.state, "draft"),
            ),
          )
          .returning();

        if (!updatedDraft) {
          throw new Error("Failed to update workflow draft version.");
        }

        draftVersion = updatedDraft;
      }

      return toUpdateWorkflowDraftResponse(
        updatedWorkflow,
        draftVersion,
        warnings,
      );
    });
  } catch (error) {
    if (isPostgresUniqueViolation(error)) {
      throw duplicateWorkflowNameError();
    }

    throw error;
  }
}
