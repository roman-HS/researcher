import { apiErrorResponse } from "@/lib/api/responses";

export class ForbiddenError extends Error {
  override readonly name = "ForbiddenError";

  constructor(message = "Forbidden") {
    super(message);
  }
}

export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError;
}

export function forbiddenResponse(): Response {
  return apiErrorResponse("forbidden", "Forbidden");
}
