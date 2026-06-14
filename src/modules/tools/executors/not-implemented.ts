import {
  createToolExecutorFailedResult,
  createToolExecutorFatalError,
  type ToolExecutor,
} from "@/contracts/runs";
import type { ToolKey } from "@/contracts/tools";

export const EXECUTOR_NOT_IMPLEMENTED_CODE = "executor_not_implemented" as const;

export function createNotImplementedToolExecutor(toolKey: ToolKey): ToolExecutor {
  return async () =>
    createToolExecutorFailedResult(
      createToolExecutorFatalError(
        EXECUTOR_NOT_IMPLEMENTED_CODE,
        `The "${toolKey}" tool executor is not implemented yet.`,
      ),
    );
}
