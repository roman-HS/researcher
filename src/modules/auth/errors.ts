export class UnauthorizedError extends Error {
  override readonly name = "UnauthorizedError";

  constructor(message = "Unauthorized") {
    super(message);
  }
}

export function isUnauthorizedError(
  error: unknown,
): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}
