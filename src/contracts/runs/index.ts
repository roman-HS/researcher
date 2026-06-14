/**
 * Run contracts: `/api/v1/runs` I/O and run-internal shapes.
 *
 * @see Naming and import rules in `src/contracts/index.ts`
 */

export type { RunId } from "@/contracts/domain";
export {
  createEmptyExecutionWorkingSet,
  createToolExecutorFailedResult,
  createToolExecutorFatalError,
  createToolExecutorItemError,
  createToolExecutorSuccessResult,
  createToolExecutorWarning,
  EXECUTION_WORKING_SET_VERSION,
  executionWorkingSetPatchSchema,
  executionWorkingSetSchema,
  isToolExecutorFailedResult,
  isToolExecutorSuccessResult,
  parseExecutionWorkingSet,
  parseExecutionWorkingSetPatch,
  parseToolExecutorInput,
  parseToolExecutorResult,
  toolExecutorFailedResultSchema,
  toolExecutorFatalErrorSchema,
  toolExecutorInputSchema,
  toolExecutorItemErrorSchema,
  toolExecutorResolvedConfigSchema,
  toolExecutorResultSchema,
  toolExecutorRunContextSchema,
  toolExecutorRuntimeInputValuesSchema,
  toolExecutorSuccessResultSchema,
  toolExecutorWarningSchema,
  type ExecutionWorkingSet,
  type ExecutionWorkingSetPatch,
  type ToolExecutor,
  type ToolExecutorFailedResult,
  type ToolExecutorFatalError,
  type ToolExecutorInput,
  type ToolExecutorItemError,
  type ToolExecutorResolvedConfig,
  type ToolExecutorResult,
  type ToolExecutorRunContext,
  type ToolExecutorRuntimeInputValues,
  type ToolExecutorSuccessResult,
  type ToolExecutorWarning,
} from "@/contracts/runs/internal";
