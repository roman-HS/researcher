import "server-only";

import { and, eq } from "drizzle-orm";

import type { PublishWorkflowResponse } from "@/contracts/workflows/responses";
import { getDb } from "@/db";
import { workflowVersions, workflows } from "@/db/schema/workflow";
import { AppError } from "@/lib/api/errors";
import type { WorkspaceAuthorizationContext } from "@/modules/workspace";

import { compileWorkflowDefinition } from "./compile-definition";
import {
  invalidWorkflowDefinitionError,
  WorkflowLifecycleError,
} from "./errors";
import {
  assertVersionCanPublish,
  assertWorkflowAllowsMutation,
  buildNewDraftVersionAfterPublish,
  createPublishVersionPatch,
  parseWorkflowStatus,
  parseWorkflowVersionState,
} from "./lifecycle";
import { validateWorkflowDefinition } from "./validate-definition";

/**
 * @see Story 4.3.5 — Implement publish workflow service
 */

export type PublishWorkflowContext = Pick<
  WorkspaceAuthorizationContext,
  "user" | "workspace"
>;

function workflowNotFoundError(): AppError {
  return new AppError("not_found", "Workflow not found.");
}

function noDraftToPublishError(): WorkflowLifecycleError {
  return new WorkflowLifecycleError(
    "No draft version is available to publish.",
    "no_draft_to_publish",
  );
}

function requireWorkspaceId(
  workspace: PublishWorkflowContext["workspace"],
): string {
  if (!workspace.id) {
    throw new Error("Workspace is missing an id.");
  }

  return workspace.id;
}

function requireUserId(user: PublishWorkflowContext["user"]): string {
  if (!user.id) {
    throw new Error("User is missing an id.");
  }

  return user.id;
}

function toIsoDateTime(value: Date): string {
  return value.toISOString();
}

function getMaxVersionNumber(
  versions: Array<Pick<typeof workflowVersions.$inferSelect, "versionNumber">>,
): number {
  return versions.reduce(
    (max, version) => Math.max(max, version.versionNumber),
    0,
  );
}

function toPublishWorkflowResponse(
  workflow: typeof workflows.$inferSelect,
  publishedVersion: typeof workflowVersions.$inferSelect,
  draftVersion: typeof workflowVersions.$inferSelect,
  warnings: PublishWorkflowResponse["validation"]["warnings"],
): PublishWorkflowResponse {
  if (!workflow.id || !publishedVersion.id || !draftVersion.id) {
    throw new Error("Published workflow records are missing identifiers.");
  }

  if (!workflow.updatedAt || !publishedVersion.publishedAt) {
    throw new Error("Published workflow records are missing timestamps.");
  }

  return {
    workflowId: workflow.id,
    publishedVersionId: publishedVersion.id,
    publishedVersionNumber: publishedVersion.versionNumber,
    publishedAt: toIsoDateTime(publishedVersion.publishedAt),
    draftVersionId: draftVersion.id,
    workflowUpdatedAt: toIsoDateTime(workflow.updatedAt),
    validation: {
      valid: true,
      warnings: [...warnings],
    },
  };
}

export async function publishWorkflow(
  workflowId: string,
  context: PublishWorkflowContext,
): Promise<PublishWorkflowResponse> {
  const db = getDb();
  const workspaceId = requireWorkspaceId(context.workspace);
  const createdByUserId = requireUserId(context.user);

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

    assertWorkflowAllowsMutation(parseWorkflowStatus(workflow.status));

    const draftVersion = await tx.query.workflowVersions.findFirst({
      where: and(
        eq(workflowVersions.workflowId, workflowId),
        eq(workflowVersions.state, "draft"),
      ),
    });

    if (!draftVersion) {
      throw noDraftToPublishError();
    }

    assertVersionCanPublish(parseWorkflowVersionState(draftVersion.state));

    const validationResult = validateWorkflowDefinition(
      draftVersion.definitionJson,
      "publish",
    );

    if (!validationResult.valid || !validationResult.definition) {
      throw invalidWorkflowDefinitionError(
        validationResult.errors,
        validationResult.warnings,
      );
    }

    const definition = validationResult.definition;
    const warnings = validationResult.warnings;
    const compiledPlan = compileWorkflowDefinition(definition);
    const now = new Date();
    const draftVersionId = draftVersion.id;

    if (!draftVersionId) {
      throw new Error("Workflow draft is missing an id.");
    }

    const [updatedWorkflow] = await tx
      .update(workflows)
      .set({ updatedAt: now })
      .where(eq(workflows.id, workflowId))
      .returning();

    if (!updatedWorkflow) {
      throw new Error("Failed to update workflow metadata.");
    }

    const [publishedVersion] = await tx
      .update(workflowVersions)
      .set({
        ...createPublishVersionPatch(compiledPlan, now),
        updatedAt: now,
      })
      .where(
        and(
          eq(workflowVersions.id, draftVersionId),
          eq(workflowVersions.state, "draft"),
        ),
      )
      .returning();

    if (!publishedVersion) {
      throw new Error("Failed to publish workflow draft version.");
    }

    const versionRows = await tx
      .select({ versionNumber: workflowVersions.versionNumber })
      .from(workflowVersions)
      .where(eq(workflowVersions.workflowId, workflowId));

    const [nextDraftVersion] = await tx
      .insert(workflowVersions)
      .values(
        buildNewDraftVersionAfterPublish({
          workflowId,
          latestPublishedDefinitionJson: definition,
          maxVersionNumber: getMaxVersionNumber(versionRows),
          createdByUserId,
        }),
      )
      .returning();

    if (!nextDraftVersion) {
      throw new Error("Failed to create the next workflow draft version.");
    }

    return toPublishWorkflowResponse(
      updatedWorkflow,
      publishedVersion,
      nextDraftVersion,
      warnings,
    );
  });
}
