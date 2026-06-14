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
  isSuccessfulRunStatus,
  isTerminalRunStatus,
  isTerminalStepStatus,
  type WorkflowRunStatus,
  type WorkflowRunStepStatus,
} from "@/contracts/runs/lifecycle";
export {
  parseRunErrorJson,
  parseRunStepErrorJson,
  runErrorJsonSchema,
  runStepErrorJsonSchema,
  type RunErrorJson,
  type RunStepErrorJson,
} from "@/contracts/runs/run-error";
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
  applyWorkingSetPatch,
  buildToolExecutorRunContext,
  createWorkflowExecutionContext,
  deserializeWorkflowExecutionContext,
  getCurrentExecutionStep,
  parseWorkflowExecutionContext,
  recordProviderCalls,
  resetStepUsageCounters,
  serializeWorkflowExecutionContext,
  withCurrentStepIndex,
  withExecutionRunStatus,
  workflowExecutionContextSchema,
  workflowExecutionRunFrameSchema,
  workflowExecutionStateSchema,
  workflowExecutionUsageSchema,
  type CreateWorkflowExecutionContextInput,
  type WorkflowExecutionContext,
  type WorkflowExecutionRunFrame,
  type WorkflowExecutionState,
  type WorkflowExecutionUsage,
} from "@/contracts/runs/execution-context";
export {
  createDefaultExecutionLimits,
  DEFAULT_EXECUTION_LIMITS,
  executionLimitsSchema,
  parseExecutionLimits,
  type ExecutionLimits,
} from "@/contracts/runs/execution-limits";
export {
  executionTransportStartPayloadSchema,
  parseExecutionTransportStartPayload,
  type ExecutionTransport,
  type ExecutionTransportStartPayload,
} from "@/contracts/runs/execution-transport";
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
