/**
 * Non-HTTP run shapes (execution state, step outputs, events).
 *
 * @see Story 6.2.1 — Define tool executor interface
 * @see Story 6.2.2 — Create execution working-set model
 */

export {
  workflowRunStatuses,
  workflowRunStatusLabels,
  workflowRunStatusSchema,
  workflowRunStepStatuses,
  workflowRunStepStatusLabels,
  workflowRunStepStatusSchema,
  type WorkflowRunStatus,
  type WorkflowRunStepStatus,
} from "@/contracts/runs/lifecycle";
export {
  buildPropertyKeyFromAddressFallback,
  buildPropertyKeyFromProviderId,
  buildPropertyKeyFromSource,
  derivePropertyKey,
  propertyKeySchema,
  withPropertyKey,
  type PropertyKey,
} from "@/contracts/runs/property-key";
export {
  createEmptyExecutionWorkingSet,
  EXECUTION_WORKING_SET_VERSION,
  executionWorkingSetPatchSchema,
  executionWorkingSetSchema,
  mergeExecutionWorkingSet,
  parseExecutionWorkingSet,
  parseExecutionWorkingSetPatch,
  type ExecutionWorkingSet,
  type ExecutionWorkingSetPatch,
} from "@/contracts/runs/working-set";
export {
  createToolExecutorFailedResult,
  createToolExecutorFatalError,
  createToolExecutorItemError,
  createToolExecutorSuccessResult,
  createToolExecutorWarning,
  isToolExecutorFailedResult,
  isToolExecutorSuccessResult,
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
} from "@/contracts/runs/executors";
