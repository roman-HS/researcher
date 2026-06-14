"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { domainEntityIdSchema } from "@/contracts/domain/primitives";
import {
  createWorkflowRequestSchema,
  updateWorkflowDraftRequestSchema,
} from "@/contracts/workflows/requests";
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
import { formatWorkflowFieldErrors } from "./schemas";
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

const CREATE_WORKFLOW_FAILURE_MESSAGE = "Could not create workflow.";
const ARCHIVE_WORKFLOW_FAILURE_MESSAGE = "Could not archive workflow.";
const DUPLICATE_WORKFLOW_FAILURE_MESSAGE = "Could not duplicate workflow.";
const UPDATE_DRAFT_FAILURE_MESSAGE = "Could not save draft.";

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
