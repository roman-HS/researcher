"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { domainEntityIdSchema } from "@/contracts/domain/primitives";
import {
  createWorkflowRequestSchema,
  updateWorkflowDraftRequestSchema,
} from "@/contracts/workflows/requests";
import type {
  WorkflowDraftVersionSummary,
  WorkflowPublishedVersionSummary,
} from "@/contracts/workflows/responses";
import type { WorkflowDefinition } from "@/contracts/workflows/internal";
import type { WorkflowDefinitionValidationIssue } from "@/contracts/workflows/validation";
import { AppError, isAppError } from "@/lib/api/errors";
import { requireUser } from "@/modules/auth/session";
import { requireCurrentWorkspace } from "@/modules/workspace";

import { archiveWorkflow } from "./archive-workflow";
import { createWorkflow } from "./create-workflow";
import { duplicateWorkflow } from "./duplicate-workflow";
import {
  isWorkflowDefinitionValidationError,
  isWorkflowLifecycleError,
} from "./errors";
import { getWorkflow } from "./get-workflow";
import { formatWorkflowFieldErrors } from "./schemas";
import { publishWorkflow } from "./publish-workflow";
import { updateWorkflowDraft } from "./update-draft-workflow";

export type CreateWorkflowActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export type ArchiveWorkflowActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type DuplicateWorkflowActionResult = { ok: false; error: string };

export type UpdateWorkflowDraftActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      validationErrors?: WorkflowDefinitionValidationIssue[];
    };

export type PublishWorkflowActionResult =
  | {
      ok: true;
      draftVersionId: string;
      draftDefinition: WorkflowDefinition;
      draftVersion: WorkflowDraftVersionSummary;
      publishedVersion: WorkflowPublishedVersionSummary;
      publishedVersionNumber: number;
      publishedAt: string;
    }
  | {
      ok: false;
      error: string;
      validationErrors?: WorkflowDefinitionValidationIssue[];
    };

const CREATE_WORKFLOW_FAILURE_MESSAGE = "Could not create workflow.";
const ARCHIVE_WORKFLOW_FAILURE_MESSAGE = "Could not archive workflow.";
const DUPLICATE_WORKFLOW_FAILURE_MESSAGE = "Could not duplicate workflow.";
const UPDATE_DRAFT_FAILURE_MESSAGE = "Could not save draft.";
const PUBLISH_WORKFLOW_FAILURE_MESSAGE = "Could not publish workflow.";

function extractAppErrorFieldErrors(
  error: AppError,
): Record<string, string> | undefined {
  const issues = error.details?.issues;

  if (!Array.isArray(issues)) {
    return undefined;
  }

  const fieldErrors: Record<string, string> = {};

  for (const issue of issues) {
    if (
      typeof issue === "object" &&
      issue !== null &&
      "path" in issue &&
      "message" in issue &&
      typeof issue.path === "string" &&
      typeof issue.message === "string" &&
      !(issue.path in fieldErrors)
    ) {
      fieldErrors[issue.path] = issue.message;
    }
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

function toArchiveActionError(error: unknown): string {
  if (isAppError(error) || isWorkflowLifecycleError(error)) {
    return error.message;
  }

  return ARCHIVE_WORKFLOW_FAILURE_MESSAGE;
}

function toDuplicateActionError(error: unknown): string {
  if (isAppError(error) || isWorkflowLifecycleError(error)) {
    return error.message;
  }

  return DUPLICATE_WORKFLOW_FAILURE_MESSAGE;
}

function extractWorkflowDefinitionValidationIssues(
  error: AppError,
): WorkflowDefinitionValidationIssue[] | undefined {
  const errors = error.details?.errors;

  if (!Array.isArray(errors) || errors.length === 0) {
    return undefined;
  }

  const parsed: WorkflowDefinitionValidationIssue[] = [];

  for (const issue of errors) {
    if (
      typeof issue === "object" &&
      issue !== null &&
      "severity" in issue &&
      "code" in issue &&
      "message" in issue &&
      (issue.severity === "error" || issue.severity === "warning") &&
      typeof issue.code === "string" &&
      typeof issue.message === "string"
    ) {
      parsed.push({
        severity: issue.severity,
        code: issue.code,
        message: issue.message,
        ...(typeof issue.path === "string" && { path: issue.path }),
        ...(typeof issue.nodeId === "string" && { nodeId: issue.nodeId }),
      });
    }
  }

  return parsed.length > 0 ? parsed : undefined;
}

function toPublishActionError(error: unknown): PublishWorkflowActionResult {
  if (isWorkflowDefinitionValidationError(error)) {
    return {
      ok: false,
      error: error.message,
      validationErrors: [...error.errors],
    };
  }

  if (isAppError(error)) {
    if (error.code === "invalid_workflow_definition") {
      return {
        ok: false,
        error: error.message,
        validationErrors: extractWorkflowDefinitionValidationIssues(error),
      };
    }

    return { ok: false, error: error.message };
  }

  if (isWorkflowLifecycleError(error)) {
    return { ok: false, error: error.message };
  }

  return { ok: false, error: PUBLISH_WORKFLOW_FAILURE_MESSAGE };
}

export async function archiveWorkflowAction(
  workflowId: string,
): Promise<ArchiveWorkflowActionResult> {
  const parsedWorkflowId = domainEntityIdSchema.safeParse(workflowId);

  if (!parsedWorkflowId.success) {
    return { ok: false, error: "Invalid workflow." };
  }

  try {
    const workspace = await requireCurrentWorkspace();
    await archiveWorkflow(parsedWorkflowId.data, { workspace });
  } catch (error) {
    return { ok: false, error: toArchiveActionError(error) };
  }

  revalidatePath("/workflows");
  return { ok: true };
}

export async function createWorkflowAction(
  _prevState: CreateWorkflowActionState,
  formData: FormData,
): Promise<CreateWorkflowActionState> {
  const parsed = createWorkflowRequestSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { fieldErrors: formatWorkflowFieldErrors(parsed.error) };
  }

  let workflowId: string;

  try {
    const user = await requireUser();
    const workspace = await requireCurrentWorkspace();
    const result = await createWorkflow(parsed.data, { user, workspace });
    workflowId = result.workflowId;
  } catch (error) {
    if (isAppError(error) && error.code === "validation_error") {
      const fieldErrors = extractAppErrorFieldErrors(error);

      if (fieldErrors) {
        return { fieldErrors };
      }

      return { error: error.message };
    }

    return { error: CREATE_WORKFLOW_FAILURE_MESSAGE };
  }

  redirect(`/workflows/${workflowId}`);
}

export async function duplicateWorkflowAction(
  workflowId: string,
): Promise<DuplicateWorkflowActionResult> {
  const parsedWorkflowId = domainEntityIdSchema.safeParse(workflowId);

  if (!parsedWorkflowId.success) {
    return { ok: false, error: "Invalid workflow." };
  }

  let newWorkflowId: string;

  try {
    const user = await requireUser();
    const workspace = await requireCurrentWorkspace();
    const result = await duplicateWorkflow(parsedWorkflowId.data, {}, { user, workspace });
    newWorkflowId = result.workflowId;
  } catch (error) {
    return { ok: false, error: toDuplicateActionError(error) };
  }

  revalidatePath("/workflows");
  redirect(`/workflows/${newWorkflowId}`);
}

export async function updateWorkflowDraftAction(
  workflowId: string,
  definition: unknown,
): Promise<UpdateWorkflowDraftActionResult> {
  const parsedWorkflowId = domainEntityIdSchema.safeParse(workflowId);

  if (!parsedWorkflowId.success) {
    return { ok: false, error: "Invalid workflow." };
  }

  const parsedRequest = updateWorkflowDraftRequestSchema.safeParse({
    definition,
  });

  if (!parsedRequest.success) {
    return { ok: false, error: "Invalid workflow definition." };
  }

  try {
    const user = await requireUser();
    const workspace = await requireCurrentWorkspace();
    await updateWorkflowDraft(parsedWorkflowId.data, parsedRequest.data, {
      user,
      workspace,
    });
  } catch (error) {
    if (isWorkflowDefinitionValidationError(error)) {
      return {
        ok: false,
        error: error.message,
        validationErrors: [...error.errors],
      };
    }

    if (isAppError(error) || isWorkflowLifecycleError(error)) {
      return { ok: false, error: error.message };
    }

    return { ok: false, error: UPDATE_DRAFT_FAILURE_MESSAGE };
  }

  revalidatePath(`/workflows/${parsedWorkflowId.data}`);
  revalidatePath("/workflows");
  return { ok: true };
}

export async function publishWorkflowAction(
  workflowId: string,
): Promise<PublishWorkflowActionResult> {
  const parsedWorkflowId = domainEntityIdSchema.safeParse(workflowId);

  if (!parsedWorkflowId.success) {
    return { ok: false, error: "Invalid workflow." };
  }

  try {
    const user = await requireUser();
    const workspace = await requireCurrentWorkspace();
    const publishResult = await publishWorkflow(parsedWorkflowId.data, {
      user,
      workspace,
    });
    const workflow = await getWorkflow(parsedWorkflowId.data, { workspace });

    if (!workflow.draftVersion || !workflow.publishedVersion) {
      throw new Error("Published workflow is missing version summaries.");
    }

    revalidatePath(`/workflows/${parsedWorkflowId.data}`);
    revalidatePath("/workflows");

    return {
      ok: true,
      draftVersionId: publishResult.draftVersionId,
      draftDefinition: workflow.draftVersion.definition,
      draftVersion: {
        versionId: workflow.draftVersion.versionId,
        versionNumber: workflow.draftVersion.versionNumber,
        updatedAt: workflow.draftVersion.updatedAt,
      },
      publishedVersion: workflow.publishedVersion,
      publishedVersionNumber: publishResult.publishedVersionNumber,
      publishedAt: publishResult.publishedAt,
    };
  } catch (error) {
    return toPublishActionError(error);
  }
}
