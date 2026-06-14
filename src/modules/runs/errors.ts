import type { StepConfigResolutionIssue } from "@/lib/workflows/resolve-step-config";
import type { RuntimeInputValidationIssue } from "@/lib/workflows/validate-runtime-inputs";

export type RunLifecycleErrorCode = "invalid_transition" | "invalid_status";

export type ExecutionTransportStartErrorCode =
  | "transport_unavailable"
  | "transport_start_failed";

export type RunInputValidationIssue = RuntimeInputValidationIssue;

export type RunStepConfigResolutionIssue = StepConfigResolutionIssue;

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

export class RunStepConfigResolutionError extends Error {
  override readonly name = "RunStepConfigResolutionError";

  readonly issues: readonly RunStepConfigResolutionIssue[];

  constructor(issues: readonly RunStepConfigResolutionIssue[]) {
    const summary = issues.map((entry) => entry.message).join("; ");

    super(
      issues.length === 1
        ? `Step config resolution failed: ${summary}`
        : `Step config resolution failed with ${issues.length} errors: ${summary}`,
    );

    this.issues = issues;
  }
}

export function isRunStepConfigResolutionError(
  error: unknown,
): error is RunStepConfigResolutionError {
  return error instanceof RunStepConfigResolutionError;
}

export class ExecutionTransportStartError extends Error {
  override readonly name = "ExecutionTransportStartError";

  readonly code: ExecutionTransportStartErrorCode;

  readonly userMessage: string;

  readonly debug?: Record<string, unknown>;

  constructor(options: {
    message: string;
    code: ExecutionTransportStartErrorCode;
    userMessage: string;
    debug?: Record<string, unknown>;
  }) {
    super(options.message);
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.debug = options.debug;
  }
}

export function isExecutionTransportStartError(
  error: unknown,
): error is ExecutionTransportStartError {
  return error instanceof ExecutionTransportStartError;
}
