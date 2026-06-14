import type { RuntimeInputValidationIssue } from "@/lib/workflows/validate-runtime-inputs";

export type RunLifecycleErrorCode = "invalid_transition" | "invalid_status";

export type RunInputValidationIssue = RuntimeInputValidationIssue;

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

export class RunInputValidationError extends Error {
  override readonly name = "RunInputValidationError";

  readonly issues: readonly RunInputValidationIssue[];

  constructor(issues: readonly RunInputValidationIssue[]) {
    const summary = issues.map((issue) => issue.message).join("; ");

    super(
      issues.length === 1
        ? `Run input validation failed: ${summary}`
        : `Run input validation failed with ${issues.length} errors: ${summary}`,
    );

    this.issues = issues;
  }
}

export function isRunInputValidationError(
  error: unknown,
): error is RunInputValidationError {
  return error instanceof RunInputValidationError;
}
