import type { WorkflowDefinitionValidationIssue } from "@/contracts/workflows/validation";

export type WorkflowLifecycleErrorCode =
  | "invalid_transition"
  | "workflow_archived"
  | "invalid_status";

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
