import "server-only";

import { and, eq, or } from "drizzle-orm";

import {
  parseWorkflowDefinition,
  type WorkflowDefinition,
} from "@/contracts/workflows/internal";
import type { DuplicateWorkflowRequest } from "@/contracts/workflows/requests";
import type { DuplicateWorkflowResponse } from "@/contracts/workflows/responses";
import { getDb } from "@/db";
import { workflowVersions, workflows } from "@/db/schema/workflow";
import { AppError } from "@/lib/api/errors";
import type { WorkspaceAuthorizationContext } from "@/modules/workspace";

import { WorkflowLifecycleError } from "./errors";
import { parseWorkflowStatus } from "./lifecycle";

/**
 * @see Story 4.3.6 — Implement duplicate workflow service
 */

export type DuplicateWorkflowContext = Pick<
  WorkspaceAuthorizationContext,
  "user" | "workspace"
>;

type WorkflowVersionRow = typeof workflowVersions.$inferSelect;

const WORKFLOW_NAME_MAX_LENGTH = 120;

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function workflowNotFoundError(): AppError {
  return new AppError("not_found", "Workflow not found.");
}

function noSourceDefinitionError(message: string): WorkflowLifecycleError {
  return new WorkflowLifecycleError(message, "no_source_definition");
}

function requireWorkspaceId(
  workspace: DuplicateWorkflowContext["workspace"],
): string {
  if (!workspace.id) {
    throw new Error("Workspace is missing an id.");
  }

  return workspace.id;
}

function requireUserId(user: DuplicateWorkflowContext["user"]): string {
  if (!user.id) {
    throw new Error("User is missing an id.");
  }

  return user.id;
}

function selectLatestPublishedVersion(
  versions: WorkflowVersionRow[],
): WorkflowVersionRow | null {
  let latest: WorkflowVersionRow | null = null;

  for (const version of versions) {
    if (version.state !== "published") {
      continue;
    }

    if (
      latest === null ||
      version.versionNumber > latest.versionNumber
    ) {
      latest = version;
    }
  }

  return latest;
}

function selectSourceVersion(
  versions: WorkflowVersionRow[],
  source: DuplicateWorkflowRequest["source"],
): WorkflowVersionRow {
  const draftVersion = versions.find((version) => version.state === "draft");
  const publishedVersion = selectLatestPublishedVersion(versions);

  if (source === "draft") {
    if (!draftVersion) {
      throw noSourceDefinitionError(
        "Cannot duplicate workflow because no draft version exists.",
      );
    }

    return draftVersion;
  }

  if (source === "published") {
    if (!publishedVersion) {
      throw noSourceDefinitionError(
        "Cannot duplicate workflow because no published version exists.",
      );
    }

    return publishedVersion;
  }

  if (draftVersion) {
    return draftVersion;
  }

  if (publishedVersion) {
    return publishedVersion;
  }

  throw noSourceDefinitionError(
    "Cannot duplicate workflow because no draft or published version exists.",
  );
}

function buildDefaultDuplicateName(sourceName: string): string {
  const prefix = "Copy of ";
  const availableLength = WORKFLOW_NAME_MAX_LENGTH - prefix.length;

  if (availableLength <= 0) {
    return prefix.slice(0, WORKFLOW_NAME_MAX_LENGTH);
  }

  return `${prefix}${sourceName.slice(0, availableLength)}`;
}

function resolveUniqueWorkflowName(
  baseName: string,
  existingNames: ReadonlySet<string>,
): string {
  const normalizedBase = baseName.trim().slice(0, WORKFLOW_NAME_MAX_LENGTH);

  if (!existingNames.has(normalizedBase)) {
    return normalizedBase;
  }

  for (let suffixNumber = 2; suffixNumber < 1000; suffixNumber += 1) {
    const suffix = ` (${suffixNumber})`;
    const candidate =
      baseName.trim().slice(0, WORKFLOW_NAME_MAX_LENGTH - suffix.length) +
      suffix;

    if (!existingNames.has(candidate)) {
      return candidate;
    }
  }

  throw new Error("Failed to resolve a unique workflow name.");
}

function toDuplicateWorkflowResponse(
  workflow: typeof workflows.$inferSelect,
  draftVersion: typeof workflowVersions.$inferSelect,
): DuplicateWorkflowResponse {
  if (!workflow.id || !draftVersion.id) {
    throw new Error("Duplicated workflow records are missing identifiers.");
  }

  if (!workflow.createdAt || !workflow.updatedAt) {
    throw new Error("Duplicated workflow records are missing timestamps.");
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

function parseSourceDefinition(
  sourceVersion: WorkflowVersionRow,
): WorkflowDefinition {
  return parseWorkflowDefinition(sourceVersion.definitionJson);
}

export async function duplicateWorkflow(
  sourceWorkflowId: string,
  input: DuplicateWorkflowRequest,
  context: DuplicateWorkflowContext,
): Promise<DuplicateWorkflowResponse> {
  const db = getDb();
  const workspaceId = requireWorkspaceId(context.workspace);
  const createdByUserId = requireUserId(context.user);

  try {
    return await db.transaction(async (tx) => {
      const sourceWorkflow = await tx.query.workflows.findFirst({
        where: and(
          eq(workflows.id, sourceWorkflowId),
          eq(workflows.workspaceId, workspaceId),
        ),
      });

      if (!sourceWorkflow) {
        throw workflowNotFoundError();
      }

      const sourceVersions = await tx
        .select()
        .from(workflowVersions)
        .where(
          and(
            eq(workflowVersions.workflowId, sourceWorkflowId),
            or(
              eq(workflowVersions.state, "draft"),
              eq(workflowVersions.state, "published"),
            ),
          ),
        );

      const sourceVersion = selectSourceVersion(sourceVersions, input.source);
      const definition = parseSourceDefinition(sourceVersion);

      const activeWorkflowNames = await tx
        .select({ name: workflows.name })
        .from(workflows)
        .where(
          and(
            eq(workflows.workspaceId, workspaceId),
            eq(workflows.status, "active"),
          ),
        );

      const existingNames = new Set(
        activeWorkflowNames.map((workflow) => workflow.name),
      );

      const baseName =
        input.name ?? buildDefaultDuplicateName(sourceWorkflow.name);
      const resolvedName = resolveUniqueWorkflowName(baseName, existingNames);
      const resolvedDescription =
        input.description !== undefined
          ? input.description
          : sourceWorkflow.description;

      const [workflow] = await tx
        .insert(workflows)
        .values({
          workspaceId,
          name: resolvedName,
          description: resolvedDescription ?? null,
          createdByUserId,
        })
        .returning();

      if (!workflow) {
        throw new Error("Failed to duplicate workflow.");
      }

      const workflowId = workflow.id;

      if (!workflowId) {
        throw new Error("Duplicated workflow is missing an id.");
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
        throw new Error("Failed to create duplicated workflow draft version.");
      }

      return toDuplicateWorkflowResponse(workflow, draftVersion);
    });
  } catch (error) {
    if (isPostgresUniqueViolation(error)) {
      throw new Error(
        "Failed to duplicate workflow due to a concurrent name conflict.",
      );
    }

    throw error;
  }
}
