import type { ZodError } from "zod";

import {
  apiErrorStatusByCode,
  type ApiErrorCode,
  type ApiErrorEnvelope,
  type ApiMeta,
  type ApiSuccessEnvelope,
  type ApiValidationIssue,
} from "@/contracts/api";

export type ApiErrorResponseOptions = {
  status?: number;
  details?: Record<string, unknown>;
  retryAfterSeconds?: number;
  requestId?: string;
};

export type ApiSuccessResponseOptions = {
  status?: number;
  meta?: ApiMeta;
};

function createRequestId(): string {
  return crypto.randomUUID();
}

export function formatZodValidationIssues(error: ZodError): ApiValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function apiErrorResponse(
  code: ApiErrorCode,
  message: string,
  options: ApiErrorResponseOptions = {},
): Response {
  const status = options.status ?? apiErrorStatusByCode[code];
  const requestId = options.requestId ?? createRequestId();
  const body: ApiErrorEnvelope = {
    error: {
      code,
      message,
      ...(options.details !== undefined && { details: options.details }),
      ...(options.retryAfterSeconds !== undefined && {
        retryAfterSeconds: options.retryAfterSeconds,
      }),
      requestId,
    },
  };

  const headers: HeadersInit = {};
  if (
    code === "provider_rate_limited" &&
    options.retryAfterSeconds !== undefined
  ) {
    headers["Retry-After"] = String(options.retryAfterSeconds);
  }

  return Response.json(body, { status, headers });
}

export function apiValidationErrorResponse(
  error: ZodError,
  options: Pick<ApiErrorResponseOptions, "requestId"> = {},
): Response {
  return apiErrorResponse("validation_error", "Validation failed", {
    details: { issues: formatZodValidationIssues(error) },
    ...options,
  });
}

export function apiSuccessResponse<T>(
  data: T,
  options: ApiSuccessResponseOptions = {},
): Response {
  const body: ApiSuccessEnvelope<T> = {
    data,
    ...(options.meta !== undefined && { meta: options.meta }),
  };

  return Response.json(body, { status: options.status ?? 200 });
}

export function apiNotImplementedResponse(): Response {
  return apiErrorResponse("internal_error", "Not implemented", { status: 501 });
}
