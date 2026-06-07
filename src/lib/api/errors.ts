import type { ApiErrorCode } from "@/contracts/api";

export type AppErrorOptions = {
  details?: Record<string, unknown>;
  retryAfterSeconds?: number;
  cause?: unknown;
};

export class AppError extends Error {
  override readonly name = "AppError";

  readonly code: ApiErrorCode;
  readonly details?: Record<string, unknown>;
  readonly retryAfterSeconds?: number;

  constructor(code: ApiErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.code = code;
    this.details = options.details;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
