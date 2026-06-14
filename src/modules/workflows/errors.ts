import { AppError } from "@/lib/api/errors";

import type { WorkflowDefinitionValidationIssue } from "@/contracts/workflows/validation";

export type WorkflowLifecycleErrorCode =
  | "invalid_transition"
  | "workflow_archived"
  | "invalid_status"
  | "no_draft_to_publish";

export class WorkflowLifecycleError extends Error {
  override readonly name = "WorkflowLifecycleError";

  readonly code: WorkflowLifecycleErrorCode;

  constructor(message: string, code: WorkflowLifecycleErrorCode) {
    super(message);
    this.code = code;
  }
}

export function isWorkflowLifecycleError(
  error: unknown,
): error is WorkflowLifecycleError {
  return error instanceof WorkflowLifecycleError;
}

export class WorkflowDefinitionValidationError extends Error {
  override readonly name = "WorkflowDefinitionValidationError";

  readonly errors: readonly WorkflowDefinitionValidationIssue[];

  readonly warnings: readonly WorkflowDefinitionValidationIssue[];

  constructor(
    errors: readonly WorkflowDefinitionValidationIssue[],
    warnings: readonly WorkflowDefinitionValidationIssue[] = [],
  ) {
    const summary = errors.map((issue) => issue.message).join("; ");

    super(
      errors.length === 1
        ? `Workflow definition validation failed: ${summary}`
        : `Workflow definition validation failed with ${errors.length} errors: ${summary}`,
    );

    this.errors = errors;
    this.warnings = warnings;
  }
}

export function isWorkflowDefinitionValidationError(
  error: unknown,
): error is WorkflowDefinitionValidationError {
  return error instanceof WorkflowDefinitionValidationError;
}

export function invalidWorkflowDefinitionError(
  errors: readonly WorkflowDefinitionValidationIssue[],
  warnings: readonly WorkflowDefinitionValidationIssue[] = [],
): AppError {
  const message =
    errors.length === 1
      ? errors[0]?.message ?? "Workflow definition validation failed."
      : `Workflow definition validation failed with ${errors.length} errors.`;

  return new AppError("invalid_workflow_definition", message, {
    details: {
      errors: [...errors],
      warnings: [...warnings],
    },
  });
}
