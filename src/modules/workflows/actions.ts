"use server";

import { redirect } from "next/navigation";

import { createWorkflowRequestSchema } from "@/contracts/workflows/requests";
import { AppError, isAppError } from "@/lib/api/errors";
import { requireUser } from "@/modules/auth/session";
import { requireCurrentWorkspace } from "@/modules/workspace";

import { createWorkflow } from "./create-workflow";
import { formatWorkflowFieldErrors } from "./schemas";

export type CreateWorkflowActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const CREATE_WORKFLOW_FAILURE_MESSAGE = "Could not create workflow.";

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
