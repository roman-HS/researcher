export type RunLifecycleErrorCode = "invalid_transition" | "invalid_status";

export class RunLifecycleError extends Error {
  override readonly name = "RunLifecycleError";

  readonly code: RunLifecycleErrorCode;

  constructor(message: string, code: RunLifecycleErrorCode) {
    super(message);
    this.code = code;
  }
}

export function isRunLifecycleError(error: unknown): error is RunLifecycleError {
  return error instanceof RunLifecycleError;
}
