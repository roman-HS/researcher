import type { ToolKey } from "@/contracts/tools";

export class ExecutorNotFoundError extends Error {
  override readonly name = "ExecutorNotFoundError";

  constructor(public readonly toolKey: ToolKey | string) {
    super(`Executor not found for tool: ${toolKey}`);
  }
}

export function isExecutorNotFoundError(
  error: unknown,
): error is ExecutorNotFoundError {
  return error instanceof ExecutorNotFoundError;
}
