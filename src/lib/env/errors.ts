import type { ZodError } from "zod";

export function formatEnvValidationError(
  scope: "server" | "client",
  error: ZodError
): string {
  const fields = [
    ...new Set(error.issues.map((issue) => issue.path.join("."))),
  ].join(", ");

  return `Invalid ${scope} environment variables: ${fields}`;
}
