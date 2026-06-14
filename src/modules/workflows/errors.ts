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
