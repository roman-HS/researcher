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
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
