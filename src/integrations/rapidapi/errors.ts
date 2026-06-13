export class RapidApiConfigurationError extends Error {
  override readonly name = "RapidApiConfigurationError";

  constructor(message: string) {
    super(message);
  }
}

export function isRapidApiConfigurationError(
  error: unknown,
): error is RapidApiConfigurationError {
  return error instanceof RapidApiConfigurationError;
}
