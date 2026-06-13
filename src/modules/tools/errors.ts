import type { ToolKey } from "@/contracts/tools";

export class ToolNotFoundError extends Error {
  override readonly name = "ToolNotFoundError";

  constructor(public readonly toolKey: ToolKey | string) {
    super(`Tool not found: ${toolKey}`);
  }
}

export function isToolNotFoundError(error: unknown): error is ToolNotFoundError {
  return error instanceof ToolNotFoundError;
}
